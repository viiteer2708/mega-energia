'use client'

import { useState, useActionState, useTransition } from 'react'
import { Building2, Plus, Pencil, Package, Settings2, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createEnergyCompany,
  updateEnergyCompany,
  createEnergyProduct,
  upsertFormulaConfig,
  saveFeeOptions,
} from '@/app/(app)/comisionado/actions'
import type { EnergyCompany, EnergyProduct, CommissionModel } from '@/lib/types'

const inputClass =
  'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

const labelClass = 'text-sm font-medium text-foreground'

interface Props {
  companies: EnergyCompany[]
  products: EnergyProduct[]
}

export function EnergyCompanyManager({ companies, products }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null)
  const [showAddProduct, setShowAddProduct] = useState<number | null>(null)
  const [editingFormulaProduct, setEditingFormulaProduct] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [createState, createAction, isCreating] = useActionState(createEnergyCompany, null)
  const [createProductState, createProductAction, isCreatingProduct] = useActionState(createEnergyProduct, null)

  const getCompanyProducts = (companyId: number) =>
    products.filter(p => p.company_id === companyId)

  const handleUpdateCompany = (companyId: number, formData: FormData) => {
    startTransition(async () => {
      await updateEnergyCompany(companyId, formData)
      setEditingCompanyId(null)
    })
  }

  const handleSaveFormula = (productId: number, formData: FormData) => {
    startTransition(async () => {
      await upsertFormulaConfig(productId, formData)
      setEditingFormulaProduct(null)
    })
  }

  const handleSaveFeeOptions = (configId: number, feeType: 'energia' | 'potencia', rangeStr: string) => {
    startTransition(async () => {
      // Parse range string: "0.001-0.030:0.001" → from-to:step
      const options: Array<{ value: number; label: string | null }> = []
      const parts = rangeStr.split(',')
      for (const part of parts) {
        const trimmed = part.trim()
        if (trimmed.includes('-') && trimmed.includes(':')) {
          const [range, step] = trimmed.split(':')
          const [from, to] = range.split('-').map(Number)
          const stepVal = Number(step)
          if (!isNaN(from) && !isNaN(to) && !isNaN(stepVal) && stepVal > 0) {
            for (let v = from; v <= to + stepVal / 2; v += stepVal) {
              const rounded = Math.round(v * 1000000) / 1000000
              options.push({ value: rounded, label: String(rounded) })
            }
          }
        } else {
          const val = Number(trimmed)
          if (!isNaN(val)) {
            options.push({ value: val, label: String(val) })
          }
        }
      }
      await saveFeeOptions(configId, feeType, options)
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Comercializadoras de energía
        </h2>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4" />
          Nueva
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nueva comercializadora</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAction} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Nombre</label>
                  <input name="name" required className={inputClass} placeholder="MEGA, KLEEN..." />
                </div>
                <div>
                  <label className={labelClass}>Modelo de comisión</label>
                  <select name="commission_model" className={inputClass}>
                    <option value="table">Tabla</option>
                    <option value="formula">Fórmula</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Margen GNEW (%)</label>
                  <input name="gnew_margin_pct" type="number" step="0.0001" defaultValue="0" className={inputClass} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isCreating}>
                  {isCreating ? 'Creando...' : 'Crear'}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
                  Cancelar
                </Button>
              </div>
              {createState && !createState.ok && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  {createState.error}
                </div>
              )}
              {createState?.ok && (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Comercializadora creada.
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Companies list */}
      {companies.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay comercializadoras configuradas.</p>
      ) : (
        <div className="space-y-3">
          {companies.map(company => {
            const companyProducts = getCompanyProducts(company.id)
            const isExpanded = expandedId === company.id
            const isEditing = editingCompanyId === company.id

            return (
              <Card key={company.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setExpandedId(isExpanded ? null : company.id)} className="flex items-center gap-2">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        <span className="font-semibold text-foreground">{company.name}</span>
                      </button>
                      <Badge variant="outline" className="text-xs">
                        {company.commission_model === 'table' ? 'Tabla' : 'Fórmula'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Margen: {(company.gnew_margin_pct * 100).toFixed(2)}%
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {companyProducts.length} productos
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditingCompanyId(isEditing ? null : company.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Inline edit */}
                  {isEditing && (
                    <form action={(fd) => handleUpdateCompany(company.id, fd)} className="grid grid-cols-3 gap-3 mt-3">
                      <div>
                        <label className={labelClass}>Nombre</label>
                        <input name="name" defaultValue={company.name} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Modelo</label>
                        <select name="commission_model" defaultValue={company.commission_model} className={inputClass}>
                          <option value="table">Tabla</option>
                          <option value="formula">Fórmula</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Margen GNEW</label>
                        <input name="gnew_margin_pct" type="number" step="0.0001" defaultValue={company.gnew_margin_pct} className={inputClass} />
                      </div>
                      <div className="col-span-3 flex gap-2">
                        <Button type="submit" size="sm" disabled={isPending}>Guardar</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setEditingCompanyId(null)}>Cancelar</Button>
                      </div>
                    </form>
                  )}
                </CardHeader>

                {/* Expanded content: Products */}
                {isExpanded && (
                  <CardContent className="space-y-4">
                    {/* Products list */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <Package className="h-3.5 w-3.5" />
                        Productos
                      </h3>
                      <Button size="sm" variant="outline" onClick={() => setShowAddProduct(showAddProduct === company.id ? null : company.id)}>
                        <Plus className="h-3.5 w-3.5" />
                        Producto
                      </Button>
                    </div>

                    {/* Add product form */}
                    {showAddProduct === company.id && (
                      <form action={createProductAction} className="rounded-lg border border-border p-3 space-y-3">
                        <input type="hidden" name="company_id" value={company.id} />
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className={labelClass}>Nombre producto</label>
                            <input name="name" required className={inputClass} placeholder="PREMIUM, PURE..." />
                          </div>
                          <div>
                            <label className={labelClass}>Fee value</label>
                            <input name="fee_value" type="number" step="0.0001" className={inputClass} placeholder="Opcional" />
                          </div>
                          <div>
                            <label className={labelClass}>Fee label</label>
                            <input name="fee_label" className={inputClass} placeholder="Fee 20, +0.005..." />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={isCreatingProduct}>Crear producto</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddProduct(null)}>Cancelar</Button>
                        </div>
                        {createProductState && !createProductState.ok && (
                          <p className="text-sm text-red-400">{createProductState.error}</p>
                        )}
                      </form>
                    )}

                    {companyProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin productos.</p>
                    ) : (
                      <div className="space-y-2">
                        {companyProducts.map(product => (
                          <div key={product.id} className="rounded-lg border border-border p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{product.name}</span>
                                {product.fee_value != null && (
                                  <Badge variant="outline" className="text-xs">
                                    Fee: {product.fee_value}
                                  </Badge>
                                )}
                                {product.fee_label && (
                                  <span className="text-xs text-muted-foreground">{product.fee_label}</span>
                                )}
                              </div>
                              {company.commission_model === 'formula' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingFormulaProduct(editingFormulaProduct === product.id ? null : product.id)}
                                >
                                  <Settings2 className="h-3.5 w-3.5" />
                                  Fórmula
                                </Button>
                              )}
                            </div>

                            {/* Formula config for this product */}
                            {editingFormulaProduct === product.id && company.commission_model === 'formula' && (
                              <FormulaConfigForm
                                productId={product.id}
                                onSave={handleSaveFormula}
                                onSaveFeeOptions={handleSaveFeeOptions}
                                isPending={isPending}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Subcomponente: FormulaConfigForm ────────────────────────────────────────

function FormulaConfigForm({
  productId,
  onSave,
  onSaveFeeOptions,
  isPending,
}: {
  productId: number
  onSave: (productId: number, formData: FormData) => void
  onSaveFeeOptions: (configId: number, feeType: 'energia' | 'potencia', range: string) => void
  isPending: boolean
}) {
  const inputCls =
    'flex h-8 w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
  const lblCls = 'text-xs font-medium text-muted-foreground'

  return (
    <form
      action={(fd) => onSave(productId, fd)}
      className="rounded-lg border border-dashed border-primary/30 p-3 space-y-3 bg-primary/5"
    >
      <p className="text-xs font-medium text-primary">Configuración de fórmula</p>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className={lblCls}>Tipo precio</label>
          <select name="pricing_type" className={inputCls}>
            <option value="indexado">Indexado</option>
            <option value="fijo">Fijo</option>
          </select>
        </div>
        <div>
          <label className={lblCls}>MI (€/kWh)</label>
          <input name="margen_intermediacion" type="number" step="0.000001" defaultValue="0" className={inputCls} />
        </div>
        <div>
          <label className={lblCls}>Fee energía fijo</label>
          <input name="fee_energia_fijo" type="number" step="0.000001" className={inputCls} placeholder="Solo si fijo" />
        </div>
        <div>
          <label className={lblCls}>Com. servicio (€)</label>
          <input name="comision_servicio" type="number" step="0.01" defaultValue="0" className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className={lblCls}>Método potencia</label>
          <select name="potencia_calc_method" className={inputCls}>
            <option value="sum_periods">Suma periodos</option>
            <option value="average">Media</option>
          </select>
        </div>
        <div>
          <label className={lblCls}>Factor energía</label>
          <input name="factor_energia" type="number" step="0.0001" defaultValue="1" className={inputCls} />
        </div>
        <div>
          <label className={lblCls}>Factor potencia</label>
          <input name="factor_potencia" type="number" step="0.0001" defaultValue="1" className={inputCls} />
        </div>
        <div className="flex items-end">
          <Button type="submit" size="sm" disabled={isPending} className="w-full h-8 text-xs">
            Guardar fórmula
          </Button>
        </div>
      </div>
    </form>
  )
}
