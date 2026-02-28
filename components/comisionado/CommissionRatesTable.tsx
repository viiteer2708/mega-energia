'use client'

import { useState, useTransition, useCallback } from 'react'
import {
  Pencil, Trash2, Plus, Check, X, Download, Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  updateCommissionRate,
  createCommissionRate,
  deleteCommissionRate,
} from '@/app/(app)/comisionado/actions'
import { exportCompanyRatesToExcel } from '@/lib/commission-excel-template'
import type { EnergyCompany, EnergyProduct, CommissionRate } from '@/lib/types'
import { ALL_TARIFAS } from '@/lib/types'

const inputClass =
  'flex h-8 w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

interface CommissionRatesTableProps {
  company: EnergyCompany
  products: EnergyProduct[]
  initialRates: CommissionRate[]
  onOpenUpload: () => void
}

export function CommissionRatesTable({
  company,
  products,
  initialRates,
  onOpenUpload,
}: CommissionRatesTableProps) {
  const [rates, setRates] = useState<CommissionRate[]>(initialRates)
  const [filterProduct, setFilterProduct] = useState<number | ''>('')
  const [filterTariff, setFilterTariff] = useState<string>('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filtrar rates
  const filtered = rates.filter(r => {
    if (filterProduct !== '' && r.product_id !== filterProduct) return false
    if (filterTariff && r.tariff !== filterTariff) return false
    return true
  })

  // Obtener tarifas únicas presentes
  const tariffSet = new Set(rates.map(r => r.tariff))
  const activeTariffs = ALL_TARIFAS.filter(t => tariffSet.has(t))

  // Edición inline
  const startEdit = (rate: CommissionRate) => {
    setEditingId(rate.id)
    setEditValue(String(rate.gross_amount))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const saveEdit = (rateId: number) => {
    const val = parseFloat(editValue)
    if (isNaN(val) || val < 0) return

    startTransition(async () => {
      const result = await updateCommissionRate(rateId, val)
      if (result.ok) {
        setRates(prev => prev.map(r =>
          r.id === rateId ? { ...r, gross_amount: val } : r
        ))
      }
      setEditingId(null)
      setEditValue('')
    })
  }

  // Añadir rango
  const handleAdd = (formData: FormData) => {
    const productId = Number(formData.get('product_id'))
    const tariff = String(formData.get('tariff'))
    const min = Number(formData.get('consumption_min'))
    const max = Number(formData.get('consumption_max'))
    const amount = Number(formData.get('gross_amount'))

    if (!productId || !tariff || isNaN(min) || isNaN(max) || isNaN(amount)) return

    startTransition(async () => {
      const result = await createCommissionRate(productId, tariff, min, max, amount)
      if (result.ok && result.rate) {
        setRates(prev => [...prev, result.rate!])
        setShowAddForm(false)
      }
    })
  }

  // Eliminar rango
  const handleDelete = (rateId: number) => {
    startTransition(async () => {
      const result = await deleteCommissionRate(rateId)
      if (result.ok) {
        setRates(prev => prev.filter(r => r.id !== rateId))
      }
      setDeleteConfirm(null)
    })
  }

  // Exportar
  const handleExport = useCallback(async () => {
    await exportCompanyRatesToExcel(company, products, rates)
  }, [company, products, rates])

  const getProductName = (productId: number) =>
    products.find(p => p.id === productId)?.name ?? `#${productId}`

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Filtro producto */}
        <div className="flex-1 max-w-xs">
          <select
            value={filterProduct}
            onChange={e => setFilterProduct(e.target.value ? Number(e.target.value) : '')}
            className={inputClass}
          >
            <option value="">Todos los productos</option>
            {products.filter(p => p.active).map(p => (
              <option key={p.id} value={p.id}>{p.name}{p.fee_value != null ? ` (Fee: ${p.fee_value})` : ''}</option>
            ))}
          </select>
        </div>

        {/* Filtro tarifa */}
        <div className="max-w-[140px]">
          <select
            value={filterTariff}
            onChange={e => setFilterTariff(e.target.value)}
            className={inputClass}
          >
            <option value="">Todas</option>
            {activeTariffs.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-1 ml-auto">
          <Button size="sm" variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-3.5 w-3.5" />
            Rango
          </Button>
          <Button size="sm" variant="outline" onClick={onOpenUpload}>
            <Upload className="h-3.5 w-3.5" />
            Excel
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Formulario añadir rango */}
      {showAddForm && (
        <form action={handleAdd} className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
          <div className="grid grid-cols-5 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Producto</label>
              <select name="product_id" required className={inputClass}>
                <option value="">Seleccionar</option>
                {products.filter(p => p.active).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tarifa</label>
              <select name="tariff" required className={inputClass}>
                {ALL_TARIFAS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Consumo mín</label>
              <input name="consumption_min" type="number" required className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Consumo máx</label>
              <input name="consumption_max" type="number" required className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Comisión €</label>
              <input name="gross_amount" type="number" step="0.01" required className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button type="submit" size="sm" disabled={isPending}>Crear</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      {/* Tabla */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No hay rangos de comisión{filterProduct || filterTariff ? ' con los filtros seleccionados' : ''}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2">Fee</th>
                <th className="px-3 py-2">Tarifa</th>
                <th className="px-3 py-2 text-right">Consumo Mín</th>
                <th className="px-3 py-2 text-right">Consumo Máx</th>
                <th className="px-3 py-2 text-right">Comisión €</th>
                <th className="px-3 py-2 w-20">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(rate => {
                const product = products.find(p => p.id === rate.product_id)
                const isEditing = editingId === rate.id
                const isDeleting = deleteConfirm === rate.id

                return (
                  <tr key={rate.id} className="border-b border-border/50 hover:bg-accent/30">
                    <td className="px-3 py-1.5 font-medium text-xs">{getProductName(rate.product_id)}</td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">
                      {product?.fee_value != null ? product.fee_value : '—'}
                    </td>
                    <td className="px-3 py-1.5">
                      <Badge variant="outline" className="text-xs">{rate.tariff}</Badge>
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs">
                      {rate.consumption_min.toLocaleString('es-ES')}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs">
                      {rate.consumption_max.toLocaleString('es-ES')}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {isEditing ? (
                        <div className="flex items-center gap-1 justify-end">
                          <input
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="h-7 w-24 rounded border border-primary/40 bg-background px-2 text-xs text-right font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveEdit(rate.id)
                              if (e.key === 'Escape') cancelEdit()
                            }}
                          />
                          <button onClick={() => saveEdit(rate.id)} className="text-green-400 hover:text-green-300" disabled={isPending}>
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(rate)}
                          className="font-mono text-xs text-foreground hover:text-primary cursor-pointer"
                          title="Click para editar"
                        >
                          {rate.gross_amount.toFixed(2)}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(rate)}
                          className="text-muted-foreground hover:text-foreground"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {isDeleting ? (
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => handleDelete(rate.id)} className="text-red-400 hover:text-red-300" disabled={isPending}>
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-muted-foreground hover:text-foreground">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(rate.id)}
                            className="text-muted-foreground hover:text-red-400"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {filtered.length} rango{filtered.length !== 1 ? 's' : ''} mostrado{filtered.length !== 1 ? 's' : ''}
        {rates.length !== filtered.length && ` de ${rates.length} total`}
      </p>
    </div>
  )
}
