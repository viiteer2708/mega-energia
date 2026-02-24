'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Building2, Package, User, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Product, UserProfile, AssignableUser } from '@/lib/types'

const selectClass =
  'flex h-10 w-full rounded-md border border-amber-500/60 bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'

const COMERCIALIZADORAS = [
  'ACCIONA',
  'ADX',
  'ELEIA',
  'ENDESA',
  'GANA ENERGIA',
  'KLEEN ENERGY',
  'MEGA',
  'NATURGY',
  'NET',
  'NIBA',
  'ODF',
  'PASION',
  'PLENITUDE',
  'REPSOL',
  'TOTAL',
]

interface BloqueComercialProps {
  products: Product[]
  user: UserProfile
  disabled?: boolean
  comercializadora: string
  productId: number | null
  observaciones: string
  onComercializadoraChange: (v: string) => void
  onProductChange: (id: number | null) => void
  onObservacionesChange: (v: string) => void
  // Selector de propietario (ADMIN/BO)
  showOwnerSelector?: boolean
  owners?: AssignableUser[]
  ownerId?: string
  onOwnerChange?: (id: string) => void
  // Selector de operador (ADMIN/BO)
  showOperadorSelector?: boolean
  operadores?: AssignableUser[]
  operadorId?: string
  onOperadorChange?: (id: string) => void
}

export function BloqueComercial({
  products, user, disabled, comercializadora, productId, observaciones,
  onComercializadoraChange, onProductChange, onObservacionesChange,
  showOwnerSelector, owners, ownerId, onOwnerChange,
  showOperadorSelector, operadores, operadorId, onOperadorChange,
}: BloqueComercialProps) {
  const [expanded, setExpanded] = useState(false)

  const needsSelection = !comercializadora || !productId
  const summary = comercializadora && productId
    ? `${comercializadora} · ${products.find(p => p.id === productId)?.name ?? ''}`
    : null

  return (
    <div className={cn(
      'rounded-lg border-2 mb-4 transition-colors',
      needsSelection
        ? 'border-amber-500/60 bg-amber-500/5'
        : 'border-amber-500/30 bg-card/50'
    )}>
      {/* ── Desktop: inline layout ── */}
      <div className="hidden sm:flex flex-wrap items-center gap-3 px-4 py-2.5">
        {showOwnerSelector && owners && onOwnerChange ? (
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">Propietario:</span>
            <select value={ownerId ?? user.id} onChange={(e) => onOwnerChange(e.target.value)}
              disabled={disabled} className="flex h-8 rounded-md border border-amber-500/60 bg-background px-2 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
              {owners.map(o => <option key={o.id} value={o.id}>{o.full_name} ({o.role})</option>)}
            </select>
          </div>
        ) : (
          <>
            <User className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">Comercial:</span>
            <span className="text-xs font-medium text-foreground">{user.full_name}</span>
          </>
        )}

        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-amber-400">Comercializadora:</span>
          <select value={comercializadora} onChange={(e) => onComercializadoraChange(e.target.value)}
            disabled={disabled} className={cn(
              'flex h-8 rounded-md border border-amber-500/60 bg-background px-2 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
              !comercializadora && 'border-amber-400 animate-pulse'
            )}>
            <option value="">— Seleccionar —</option>
            {COMERCIALIZADORAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Package className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-amber-400">Producto:</span>
          <select value={productId ?? ''} onChange={(e) => onProductChange(e.target.value ? Number(e.target.value) : null)}
            disabled={disabled} className={cn(
              'flex h-8 rounded-md border border-amber-500/60 bg-background px-2 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
              !productId && 'border-amber-400 animate-pulse'
            )}>
            <option value="">— Seleccionar —</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {showOperadorSelector && operadores && onOperadorChange && (
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">Operador:</span>
            <select value={operadorId ?? ''} onChange={(e) => onOperadorChange(e.target.value)}
              disabled={disabled} className="flex h-8 rounded-md border border-amber-500/60 bg-background px-2 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
              <option value="">— Sin asignar —</option>
              {operadores.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── Mobile: tap-to-expand card ── */}
      <div className="sm:hidden">
        <button type="button" onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15">
            <Building2 className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex-1 text-left">
            {summary ? (
              <>
                <p className="text-sm font-medium text-foreground">{summary}</p>
                <p className="text-[11px] text-muted-foreground">{user.full_name}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-amber-400">Elegir comercializadora y producto</p>
                <p className="text-[11px] text-muted-foreground">Toca para seleccionar — {user.full_name}</p>
              </>
            )}
          </div>
          <div className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
            needsSelection ? 'bg-amber-500/20' : 'bg-border/50'
          )}>
            {expanded
              ? <ChevronUp className="h-4 w-4 text-amber-400" />
              : <ChevronDown className="h-4 w-4 text-amber-400" />}
          </div>
        </button>

        {/* Expanded form */}
        <div className={cn(
          'overflow-hidden transition-all duration-200',
          expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}>
          <div className="border-t border-amber-500/20 px-4 py-3 space-y-3">
            {/* Propietario (selector o read-only) */}
            {showOwnerSelector && owners && onOwnerChange ? (
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <User className="h-3.5 w-3.5" /> Propietario
                </label>
                <select value={ownerId ?? user.id} onChange={(e) => onOwnerChange(e.target.value)}
                  disabled={disabled} className={selectClass}>
                  {owners.map(o => <option key={o.id} value={o.id}>{o.full_name} ({o.role})</option>)}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md bg-amber-500/5 px-3 py-2">
                <User className="h-4 w-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/70">Comercial</p>
                  <p className="text-sm text-foreground">{user.full_name}</p>
                </div>
              </div>
            )}

            {/* Comercializadora */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <Building2 className="h-3.5 w-3.5" /> Comercializadora *
              </label>
              <select value={comercializadora} onChange={(e) => onComercializadoraChange(e.target.value)}
                disabled={disabled} className={cn(selectClass, !comercializadora && 'border-amber-400')}>
                <option value="">— Seleccionar comercializadora —</option>
                {COMERCIALIZADORAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Producto */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <Package className="h-3.5 w-3.5" /> Producto *
              </label>
              <select value={productId ?? ''} onChange={(e) => onProductChange(e.target.value ? Number(e.target.value) : null)}
                disabled={disabled} className={cn(selectClass, !productId && 'border-amber-400')}>
                <option value="">— Seleccionar producto —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Observaciones */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <MessageSquare className="h-3.5 w-3.5" /> Observaciones
              </label>
              <input type="text" value={observaciones} onChange={(e) => onObservacionesChange(e.target.value)}
                disabled={disabled} placeholder="Notas opcionales..."
                className={`${selectClass} border-amber-500/30`} />
            </div>

            {/* Operador (solo ADMIN/BO) */}
            {showOperadorSelector && operadores && onOperadorChange && (
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <User className="h-3.5 w-3.5" /> Operador
                </label>
                <select value={operadorId ?? ''} onChange={(e) => onOperadorChange(e.target.value)}
                  disabled={disabled} className={selectClass}>
                  <option value="">— Sin asignar —</option>
                  {operadores.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
