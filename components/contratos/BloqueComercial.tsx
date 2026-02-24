'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Product, UserProfile } from '@/lib/types'

const selectClass =
  'flex h-8 rounded-md border border-amber-500/60 bg-background px-2 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'

const COMERCIALIZADORAS = [
  'GRUPO NEW ENERGY',
  'Iberdrola',
  'Endesa',
  'Naturgy',
  'Repsol',
  'TotalEnergies',
  'Holaluz',
  'Otra',
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
}

export function BloqueComercial({
  products, user, disabled, comercializadora, productId, observaciones,
  onComercializadoraChange, onProductChange, onObservacionesChange,
}: BloqueComercialProps) {
  const [expanded, setExpanded] = useState(false)

  const needsSelection = !comercializadora || !productId

  return (
    <div className={cn(
      'rounded-lg border-2 mb-4 transition-colors',
      needsSelection
        ? 'border-amber-500/60 bg-amber-500/5'
        : 'border-amber-500/30 bg-card/50'
    )}>
      {/* Desktop layout */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
        <span className="text-xs font-semibold text-amber-400">Comercial:</span>
        <span className="text-xs font-medium text-foreground">{user.full_name}</span>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-semibold text-amber-400">Comercializadora:</span>
          <select value={comercializadora} onChange={(e) => onComercializadoraChange(e.target.value)}
            disabled={disabled} className={cn(selectClass, !comercializadora && 'border-amber-400 animate-pulse')}>
            <option value="">— Seleccionar —</option>
            {COMERCIALIZADORAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-semibold text-amber-400">Producto:</span>
          <select value={productId ?? ''} onChange={(e) => onProductChange(e.target.value ? Number(e.target.value) : null)}
            disabled={disabled} className={cn(selectClass, !productId && 'border-amber-400 animate-pulse')}>
            <option value="">— Seleccionar —</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <button type="button" onClick={() => setExpanded(!expanded)}
          className="ml-auto flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 sm:hidden">
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Menos' : 'Más'}
        </button>
      </div>

      {/* Mobile expanded */}
      <div className={cn('border-t border-amber-500/20 px-4 py-2.5 space-y-2.5',
        expanded ? 'block sm:hidden' : 'hidden')}>
        <div>
          <label className="text-xs font-semibold text-amber-400">Comercializadora</label>
          <select value={comercializadora} onChange={(e) => onComercializadoraChange(e.target.value)}
            disabled={disabled} className={`${selectClass} w-full`}>
            <option value="">— Seleccionar —</option>
            {COMERCIALIZADORAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-amber-400">Producto</label>
          <select value={productId ?? ''} onChange={(e) => onProductChange(e.target.value ? Number(e.target.value) : null)}
            disabled={disabled} className={`${selectClass} w-full`}>
            <option value="">— Seleccionar —</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-amber-400">Observaciones</label>
          <input type="text" value={observaciones} onChange={(e) => onObservacionesChange(e.target.value)}
            disabled={disabled} placeholder="Notas..." className={`${selectClass} w-full`} />
        </div>
      </div>
    </div>
  )
}
