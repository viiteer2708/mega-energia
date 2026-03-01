'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  Building2, Package, Pencil, Plus, CheckCircle2,
  AlertCircle, ToggleLeft, ToggleRight, Settings2,
  Table2, Upload, History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CommissionRatesTable } from './CommissionRatesTable'
import { CommissionExcelUpload } from './CommissionExcelUpload'
import { FormulaConfigPanel } from './FormulaConfigPanel'
import { PercentageInput } from './PercentageInput'
import { cn } from '@/lib/utils'
import {
  updateEnergyCompany,
  createEnergyProduct,
  updateEnergyProduct,
  saveFeeOptions,
  getCommissionRatesForCompany,
  getCommissionUploads,
} from '@/app/(app)/comisionado/actions'
import type {
  EnergyCompany,
  EnergyProduct,
  CommissionRate,
  CommissionUploadV2,
} from '@/lib/types'

const inputClass =
  'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
const labelClass = 'text-sm font-medium text-foreground'

type Tab = 'general' | 'comisiones'

interface EnergyCompanyDetailProps {
  company: EnergyCompany
  products: EnergyProduct[]
  allCompanies: EnergyCompany[]
  allProducts: EnergyProduct[]
}

export function EnergyCompanyDetail({
  company,
  products,
  allCompanies,
  allProducts,
}: EnergyCompanyDetailProps) {
  const [tab, setTab] = useState<Tab>('general')
  const [isPending, startTransition] = useTransition()

  // Lazy data
  const [rates, setRates] = useState<CommissionRate[] | null>(null)
  const [uploads, setUploads] = useState<CommissionUploadV2[] | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // General tab state
  const [editingGeneral, setEditingGeneral] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [editingFormulaProduct, setEditingFormulaProduct] = useState<number | null>(null)

  // Cargar rates lazy cuando se entra en tab comisiones
  useEffect(() => {
    if (tab === 'comisiones' && rates === null) {
      startTransition(async () => {
        const data = await getCommissionRatesForCompany(company.id)
        setRates(data)
      })
    }
  }, [tab, company.id, rates])

  // Reset state on company change
  useEffect(() => {
    setRates(null)
    setUploads(null)
    setEditingGeneral(false)
    setShowAddProduct(false)
    setEditingFormulaProduct(null)
    setShowUploadModal(false)
    setShowHistory(false)
    setTab('general')
  }, [company.id])

  const handleUpdateCompany = (formData: FormData) => {
    startTransition(async () => {
      await updateEnergyCompany(company.id, formData)
      setEditingGeneral(false)
    })
  }

  const handleCreateProduct = (formData: FormData) => {
    startTransition(async () => {
      await createEnergyProduct(null, formData)
      setShowAddProduct(false)
    })
  }

  const handleToggleProduct = (product: EnergyProduct) => {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('active', String(!product.active))
      await updateEnergyProduct(product.id, fd)
    })
  }

  const handleSaveFormula = (productId: number, formData: FormData) => {
    startTransition(async () => {
      const { upsertFormulaConfig } = await import('@/app/(app)/comisionado/actions')
      await upsertFormulaConfig(productId, formData)
      setEditingFormulaProduct(null)
    })
  }

  const handleSaveFeeOptions = (configId: number, feeType: 'energia' | 'potencia', rangeStr: string) => {
    startTransition(async () => {
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

  const loadUploads = () => {
    if (uploads !== null) {
      setShowHistory(!showHistory)
      return
    }
    startTransition(async () => {
      const data = await getCommissionUploads(company.id)
      setUploads(data)
      setShowHistory(true)
    })
  }

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'general', label: 'General y Productos', icon: <Building2 className="h-4 w-4" /> },
    { id: 'comisiones', label: 'Comisiones', icon: <Table2 className="h-4 w-4" /> },
  ]

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="font-semibold text-foreground text-lg">{company.name}</span>
        <Badge variant="outline">
          {company.commission_model === 'table' ? 'Tabla' : 'Formula'}
        </Badge>
        <Badge variant="outline">
          Margen: {(company.gnew_margin_pct * 100).toFixed(2)}%
        </Badge>
        {!company.active && (
          <Badge variant="outline" className="text-red-400 border-red-500/30">Inactiva</Badge>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-card/50 p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap',
              tab === t.id
                ? 'bg-primary/15 text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: General y Productos */}
      {tab === 'general' && (
        <div className="space-y-6">
          {/* Info empresa */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              {editingGeneral ? (
                <form action={handleUpdateCompany} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>Nombre</label>
                      <input name="name" defaultValue={company.name} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Modelo</label>
                      <select name="commission_model" defaultValue={company.commission_model} className={inputClass}>
                        <option value="table">Tabla</option>
                        <option value="formula">Formula</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Margen GNEW (%)</label>
                      <PercentageInput
                        name="gnew_margin_pct"
                        defaultValue={company.gnew_margin_pct}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={isPending}>Guardar</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingGeneral(false)}>Cancelar</Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block text-xs">Nombre</span>
                      <span className="font-medium">{company.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Modelo</span>
                      <span className="font-medium">{company.commission_model === 'table' ? 'Tabla' : 'Formula'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Margen GNEW</span>
                      <span className="font-medium">{(company.gnew_margin_pct * 100).toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Estado</span>
                      <span className={company.active ? 'text-green-400' : 'text-red-400'}>
                        {company.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setEditingGeneral(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Editar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Productos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Productos ({products.length})
              </h3>
              <Button size="sm" variant="outline" onClick={() => setShowAddProduct(!showAddProduct)}>
                <Plus className="h-3.5 w-3.5" />
                Nuevo
              </Button>
            </div>

            {showAddProduct && (
              <form action={handleCreateProduct} className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 space-y-3">
                <input type="hidden" name="company_id" value={company.id} />
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Nombre</label>
                    <input name="name" required className={inputClass} placeholder="PREMIUM, PURE..." />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Fee value</label>
                    <input name="fee_value" type="number" step="0.0001" className={inputClass} placeholder="Opcional" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Fee label</label>
                    <input name="fee_label" className={inputClass} placeholder="Fee 20, +0.005..." />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={isPending}>Crear</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddProduct(false)}>Cancelar</Button>
                </div>
              </form>
            )}

            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin productos.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Fee</th>
                      <th className="px-3 py-2">Label</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product.id} className="border-b border-border/50">
                        <td className="px-3 py-2 font-medium">{product.name}</td>
                        <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
                          {product.fee_value ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">
                          {product.fee_label ?? '—'}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant="outline"
                            className={product.active ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30'}
                          >
                            {product.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleProduct(product)}
                              className="text-muted-foreground hover:text-foreground"
                              title={product.active ? 'Desactivar' : 'Activar'}
                              disabled={isPending}
                            >
                              {product.active ? (
                                <ToggleRight className="h-4 w-4 text-green-400" />
                              ) : (
                                <ToggleLeft className="h-4 w-4" />
                              )}
                            </button>
                            {company.commission_model === 'formula' && (
                              <button
                                onClick={() => setEditingFormulaProduct(
                                  editingFormulaProduct === product.id ? null : product.id
                                )}
                                className="text-muted-foreground hover:text-primary"
                                title="Config formula"
                              >
                                <Settings2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Formula config inline */}
            {editingFormulaProduct && company.commission_model === 'formula' && (
              <div className="mt-3">
                <FormulaConfigPanel
                  productId={editingFormulaProduct}
                  companyId={company.id}
                  onSave={handleSaveFormula}
                  onSaveFeeOptions={handleSaveFeeOptions}
                  isPending={isPending}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Comisiones */}
      {tab === 'comisiones' && (
        <div className="space-y-4">
          {/* Content depends on model */}
          {company.commission_model === 'table' ? (
            <>
              {showUploadModal && (
                <CommissionExcelUpload
                  companyName={company.name}
                  companyModel={company.commission_model}
                  allCompanies={allCompanies}
                  allProducts={allProducts}
                />
              )}
              {rates !== null ? (
                <CommissionRatesTable
                  company={company}
                  products={products}
                  initialRates={rates}
                  onOpenUpload={() => setShowUploadModal(!showUploadModal)}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Cargando rangos...</p>
              )}
            </>
          ) : (
            <>
              {/* Formula model: FormulaConfigPanel por producto + tabla de payout */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Configuracion de formula por producto</h3>
                {products.filter(p => p.active).map(product => (
                  <div key={product.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{product.name}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingFormulaProduct(
                          editingFormulaProduct === product.id ? null : product.id
                        )}
                      >
                        <Settings2 className="h-3.5 w-3.5 mr-1" />
                        Configurar
                      </Button>
                    </div>
                    {editingFormulaProduct === product.id && (
                      <FormulaConfigPanel
                        productId={product.id}
                        companyId={company.id}
                        onSave={handleSaveFormula}
                        onSaveFeeOptions={handleSaveFeeOptions}
                        isPending={isPending}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Tabla de payout para formula */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Tabla de payout (commission_rates)</h3>
                <p className="text-xs text-muted-foreground">
                  En modelo formula, el payout a la red se calcula desde esta tabla.
                </p>
                {showUploadModal && (
                  <CommissionExcelUpload
                    companyName={company.name}
                    companyModel={company.commission_model}
                    allCompanies={allCompanies}
                    allProducts={allProducts}
                  />
                )}
                {rates !== null ? (
                  <CommissionRatesTable
                    company={company}
                    products={products}
                    initialRates={rates}
                    onOpenUpload={() => setShowUploadModal(!showUploadModal)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Cargando rangos...</p>
                )}
              </div>
            </>
          )}

          {/* Historial */}
          <div className="space-y-2">
            <Button size="sm" variant="outline" onClick={loadUploads}>
              <History className="h-3.5 w-3.5 mr-1" />
              {showHistory ? 'Ocultar historial' : 'Ver historial de cargas'}
            </Button>

            {showHistory && uploads !== null && (
              uploads.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay cargas previas.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                        <th className="px-3 py-2">Archivo</th>
                        <th className="px-3 py-2">Fecha</th>
                        <th className="px-3 py-2">Productos</th>
                        <th className="px-3 py-2">Creados</th>
                        <th className="px-3 py-2">Actualizados</th>
                        <th className="px-3 py-2">Subido por</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploads.map(u => (
                        <tr key={u.id} className="border-b border-border/50">
                          <td className="px-3 py-2 font-medium">{u.file_name}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString('es-ES')}
                          </td>
                          <td className="px-3 py-2 text-green-400">{u.products_created}</td>
                          <td className="px-3 py-2 text-green-400">{u.records_created}</td>
                          <td className="px-3 py-2 text-blue-400">{u.records_updated}</td>
                          <td className="px-3 py-2 text-muted-foreground">{u.uploaded_by_name ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
