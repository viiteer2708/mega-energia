'use client'

import { useState, useEffect, useTransition } from 'react'
import { ChevronDown, ChevronUp, Building2, Package, User, MessageSquare, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getFormulaConfigForProduct } from '@/app/(app)/contratos/actions'
import type { Product, UserProfile, AssignableUser, Role } from '@/lib/types'

const ROLE_LEVEL: Record<Role, number> = {
  ADMIN: 6, BACKOFFICE: 5, DIRECTOR: 4, KAM: 3, CANAL: 2, COMERCIAL: 1,
}

const selectClass =
  'flex h-10 w-full rounded-md border border-amber-500/60 bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'

const COMERCIALIZADORAS = [
  'ACCIONA', 'ADX', 'ELEIA', 'ENDESA', 'GANA ENERGIA', 'KLEEN ENERGY',
  'MEGA', 'NATURGY', 'NET', 'NIBA', 'ODF', 'PASION', 'PLENITUDE', 'REPSOL', 'TOTAL',
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
  showOwnerSelector?: boolean
  owners?: AssignableUser[]
  ownerId?: string
  onOwnerChange?: (id: string) => void
  showOperadorSelector?: boolean
  operadores?: AssignableUser[]
  operadorId?: string
  onOperadorChange?: (id: string) => void
  userRole?: Role
  operadorName?: string
  // v2 energy company/product
  energyCompanies?: Array<{ id: number; name: string; commission_model: string }>
  energyProducts?: Array<{ id: number; company_id: number; name: string; fee_value: number | null; fee_label: string | null }>
  energyCompanyId?: number | null
  energyProductId?: number | null
  selectedFeeEnergia?: number | null
  selectedFeePotencia?: number | null
  onEnergyCompanyChange?: (id: number | null) => void
  onEnergyProductChange?: (id: number | null) => void
  onFeeEnergiaChange?: (v: number | null) => void
  onFeePotenciaChange?: (v: number | null) => void
}

export function BloqueComercial({
  products, user, disabled, comercializadora, productId, observaciones,
  onComercializadoraChange, onProductChange, onObservacionesChange,
  showOwnerSelector, owners, ownerId, onOwnerChange,
  showOperadorSelector, operadores, operadorId, onOperadorChange,
  userRole, operadorName,
  energyCompanies, energyProducts,
  energyCompanyId, energyProductId, selectedFeeEnergia, selectedFeePotencia,
  onEnergyCompanyChange, onEnergyProductChange, onFeeEnergiaChange, onFeePotenciaChange,
}: BloqueComercialProps) {
  const [expanded, setExpanded] = useState(false)
  const [feeOptions, setFeeOptions] = useState<{ energia: Array<{ value: number; label: string | null }>; potencia: Array<{ value: number; label: string | null }> }>({ energia: [], potencia: [] })
  const [formulaPricingType, setFormulaPricingType] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filteredOperadores = operadores?.filter(o => {
    if (!userRole) return true
    return ROLE_LEVEL[o.role as Role] <= ROLE_LEVEL[userRole]
  })

  // Use energy companies from DB if available, otherwise fallback to hardcoded list
  const useV2 = !!energyCompanies?.length && !!onEnergyCompanyChange

  // Filtered energy products by selected company
  const filteredEnergyProducts = energyProducts?.filter(p => p.company_id === energyCompanyId) ?? []

  // Selected company model
  const selectedCompany = energyCompanies?.find(c => c.id === energyCompanyId)
  const isFormulaModel = selectedCompany?.commission_model === 'formula'

  // Load fee options when energy product changes (formula model only)
  useEffect(() => {
    if (!energyProductId || !isFormulaModel) {
      setFeeOptions({ energia: [], potencia: [] })
      setFormulaPricingType(null)
      return
    }

    startTransition(async () => {
      const result = await getFormulaConfigForProduct(energyProductId)
      if (result.config) {
        setFormulaPricingType(result.config.pricing_type)
        const energia = result.fee_options
          .filter(o => o.fee_type === 'energia')
          .map(o => ({ value: o.value, label: o.label }))
        const potencia = result.fee_options
          .filter(o => o.fee_type === 'potencia')
          .map(o => ({ value: o.value, label: o.label }))
        setFeeOptions({ energia, potencia })
      } else {
        setFeeOptions({ energia: [], potencia: [] })
        setFormulaPricingType(null)
      }
    })
  }, [energyProductId, isFormulaModel])

  // When energy company changes, also set the legacy comercializadora name
  const handleEnergyCompanyChange = (id: number | null) => {
    onEnergyCompanyChange?.(id)
    onEnergyProductChange?.(null)
    onFeeEnergiaChange?.(null)
    onFeePotenciaChange?.(null)
    // Auto-set legacy comercializadora name
    if (id) {
      const company = energyCompanies?.find(c => c.id === id)
      if (company) onComercializadoraChange(company.name)
    } else {
      onComercializadoraChange('')
    }
  }

  const needsSelection = useV2 ? (!energyCompanyId || !energyProductId) : (!comercializadora || !productId)
  const summary = useV2
    ? (energyCompanyId && energyProductId
        ? `${selectedCompany?.name ?? ''} · ${filteredEnergyProducts.find(p => p.id === energyProductId)?.name ?? ''}`
        : null)
    : (comercializadora && productId
        ? `${comercializadora} · ${products.find(p => p.id === productId)?.name ?? ''}`
        : null)

  // Show fee selectors if formula model and options available
  const showFeeSelectors = isFormulaModel && energyProductId

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
              {owners.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
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
          {useV2 ? (
            <select value={energyCompanyId ?? ''} onChange={(e) => handleEnergyCompanyChange(e.target.value ? Number(e.target.value) : null)}
              disabled={disabled} className={cn(
                'flex h-8 rounded-md border border-amber-500/60 bg-background px-2 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                !energyCompanyId && 'border-amber-400 animate-pulse'
              )}>
              <option value="">— Seleccionar —</option>
              {energyCompanies!.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <select value={comercializadora} onChange={(e) => onComercializadoraChange(e.target.value)}
              disabled={disabled} className={cn(
                'flex h-8 rounded-md border border-amber-500/60 bg-background px-2 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                !comercializadora && 'border-amber-400 animate-pulse'
              )}>
              <option value="">— Seleccionar —</option>
              {COMERCIALIZADORAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Package className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-amber-400">Producto:</span>
          {useV2 ? (
            <select value={energyProductId ?? ''} onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : null
              onEnergyProductChange?.(val)
              onFeeEnergiaChange?.(null)
              onFeePotenciaChange?.(null)
            }}
              disabled={disabled || !energyCompanyId} className={cn(
                'flex h-8 rounded-md border border-amber-500/60 bg-background px-2 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                !energyProductId && energyCompanyId && 'border-amber-400 animate-pulse'
              )}>
              <option value="">— Seleccionar —</option>
              {filteredEnergyProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.fee_label ? ` (${p.fee_label})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <select value={productId ?? ''} onChange={(e) => onProductChange(e.target.value ? Number(e.target.value) : null)}
              disabled={disabled} className={cn(
                'flex h-8 rounded-md border border-amber-500/60 bg-background px-2 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                !productId && 'border-amber-400 animate-pulse'
              )}>
              <option value="">— Seleccionar —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>

        {/* Fee selectors for formula model */}
        {showFeeSelectors && (
          <>
            {formulaPricingType === 'indexado' && feeOptions.energia.length > 0 && (
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-400">Fee energía:</span>
                <select value={selectedFeeEnergia ?? ''} onChange={(e) => onFeeEnergiaChange?.(e.target.value ? Number(e.target.value) : null)}
                  disabled={disabled} className="flex h-8 rounded-md border border-cyan-500/60 bg-background px-2 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
                  <option value="">— Seleccionar —</option>
                  {feeOptions.energia.map(o => (
                    <option key={o.value} value={o.value}>{o.label ?? o.value}</option>
                  ))}
                </select>
              </div>
            )}
            {feeOptions.potencia.length > 0 && (
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-400">Fee potencia:</span>
                <select value={selectedFeePotencia ?? ''} onChange={(e) => onFeePotenciaChange?.(e.target.value ? Number(e.target.value) : null)}
                  disabled={disabled} className="flex h-8 rounded-md border border-cyan-500/60 bg-background px-2 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
                  <option value="">— Seleccionar —</option>
                  {feeOptions.potencia.map(o => (
                    <option key={o.value} value={o.value}>{o.label ?? `${o.value} €/periodo`}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {showOperadorSelector && filteredOperadores && onOperadorChange ? (
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">Operador:</span>
            <select value={operadorId ?? ''} onChange={(e) => onOperadorChange(e.target.value)}
              disabled={disabled} className="flex h-8 rounded-md border border-amber-500/60 bg-background px-2 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
              <option value="">— Sin asignar —</option>
              {filteredOperadores.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
            </select>
          </div>
        ) : !showOperadorSelector && (
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">Operador:</span>
            <span className="text-xs font-medium text-foreground">{operadorName || 'Backoffice'}</span>
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
          expanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        )}>
          <div className="border-t border-amber-500/20 px-4 py-3 space-y-3">
            {showOwnerSelector && owners && onOwnerChange ? (
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <User className="h-3.5 w-3.5" /> Propietario
                </label>
                <select value={ownerId ?? user.id} onChange={(e) => onOwnerChange(e.target.value)}
                  disabled={disabled} className={selectClass}>
                  {owners.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
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
              {useV2 ? (
                <select value={energyCompanyId ?? ''} onChange={(e) => handleEnergyCompanyChange(e.target.value ? Number(e.target.value) : null)}
                  disabled={disabled} className={cn(selectClass, !energyCompanyId && 'border-amber-400')}>
                  <option value="">— Seleccionar comercializadora —</option>
                  {energyCompanies!.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <select value={comercializadora} onChange={(e) => onComercializadoraChange(e.target.value)}
                  disabled={disabled} className={cn(selectClass, !comercializadora && 'border-amber-400')}>
                  <option value="">— Seleccionar comercializadora —</option>
                  {COMERCIALIZADORAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>

            {/* Producto */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <Package className="h-3.5 w-3.5" /> Producto *
              </label>
              {useV2 ? (
                <select value={energyProductId ?? ''} onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null
                  onEnergyProductChange?.(val)
                  onFeeEnergiaChange?.(null)
                  onFeePotenciaChange?.(null)
                }}
                  disabled={disabled || !energyCompanyId} className={cn(selectClass, !energyProductId && energyCompanyId && 'border-amber-400')}>
                  <option value="">— Seleccionar producto —</option>
                  {filteredEnergyProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.fee_label ? ` (${p.fee_label})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <select value={productId ?? ''} onChange={(e) => onProductChange(e.target.value ? Number(e.target.value) : null)}
                  disabled={disabled} className={cn(selectClass, !productId && 'border-amber-400')}>
                  <option value="">— Seleccionar producto —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>

            {/* Fee selectors for formula model (mobile) */}
            {showFeeSelectors && (
              <>
                {formulaPricingType === 'indexado' && feeOptions.energia.length > 0 && (
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
                      <Zap className="h-3.5 w-3.5" /> Fee energía
                    </label>
                    <select value={selectedFeeEnergia ?? ''} onChange={(e) => onFeeEnergiaChange?.(e.target.value ? Number(e.target.value) : null)}
                      disabled={disabled} className="flex h-10 w-full rounded-md border border-cyan-500/60 bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
                      <option value="">— Seleccionar —</option>
                      {feeOptions.energia.map(o => (
                        <option key={o.value} value={o.value}>{o.label ?? o.value}</option>
                      ))}
                    </select>
                  </div>
                )}
                {feeOptions.potencia.length > 0 && (
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
                      <Zap className="h-3.5 w-3.5" /> Fee potencia
                    </label>
                    <select value={selectedFeePotencia ?? ''} onChange={(e) => onFeePotenciaChange?.(e.target.value ? Number(e.target.value) : null)}
                      disabled={disabled} className="flex h-10 w-full rounded-md border border-cyan-500/60 bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
                      <option value="">— Seleccionar —</option>
                      {feeOptions.potencia.map(o => (
                        <option key={o.value} value={o.value}>{o.label ?? `${o.value} €/periodo`}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {/* Observaciones */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <MessageSquare className="h-3.5 w-3.5" /> Observaciones
              </label>
              <input type="text" value={observaciones} onChange={(e) => onObservacionesChange(e.target.value)}
                disabled={disabled} placeholder="Notas opcionales..."
                className={`${selectClass} border-amber-500/30`} />
            </div>

            {showOperadorSelector && filteredOperadores && onOperadorChange ? (
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <User className="h-3.5 w-3.5" /> Operador
                </label>
                <select value={operadorId ?? ''} onChange={(e) => onOperadorChange(e.target.value)}
                  disabled={disabled} className={selectClass}>
                  <option value="">— Sin asignar —</option>
                  {filteredOperadores.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
                </select>
              </div>
            ) : !showOperadorSelector && (
              <div className="flex items-center gap-2 rounded-md bg-amber-500/5 px-3 py-2">
                <User className="h-4 w-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/70">Operador</p>
                  <p className="text-sm text-foreground">{operadorName || 'Backoffice'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
