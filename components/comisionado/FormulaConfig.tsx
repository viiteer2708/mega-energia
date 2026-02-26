'use client'

import { useState, useActionState, useTransition } from 'react'
import { Calculator, Plus, Pencil, Play, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createFormulaConfig,
  updateFormulaConfig,
  calculateByFormula,
} from '@/app/(app)/comisionado/actions'
import type { CommissionFormulaConfig, Campaign, Product } from '@/lib/types'

const inputClass =
  'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

const labelClass = 'text-sm font-medium text-foreground'

interface FormulaConfigProps {
  configs: CommissionFormulaConfig[]
  campaigns: Campaign[]
  products: Product[]
}

export function FormulaConfig({ configs, campaigns, products }: FormulaConfigProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [calcResult, setCalcResult] = useState<{ configId: number; message: string; ok: boolean } | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [createState, createAction, isCreating] = useActionState(createFormulaConfig, null)

  const handleCalculate = (configId: number) => {
    if (!confirm('Esto calculará la comisión GNE para todos los contratos de esta campaña/producto. ¿Continuar?')) return

    startTransition(async () => {
      const result = await calculateByFormula(configId)
      setCalcResult({
        configId,
        ok: result.ok,
        message: result.ok
          ? `${result.contractsUpdated} contratos actualizados`
          : (result.error ?? 'Error desconocido'),
      })
    })
  }

  const handleUpdate = (configId: number, formData: FormData) => {
    startTransition(async () => {
      const result = await updateFormulaConfig(configId, formData)
      if (result.ok) {
        setEditingId(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Lista de configs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4 text-primary" />
            Fórmulas de comisión
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4" />
            Nueva fórmula
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {configs.length === 0 && !showCreate ? (
            <p className="text-sm text-muted-foreground">No hay fórmulas configuradas.</p>
          ) : (
            <div className="space-y-3">
              {configs.map(config => (
                <div
                  key={config.id}
                  className="rounded-lg border border-border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">
                        {config.campaign_name} / {config.product_name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        v{config.version}
                      </Badge>
                      {config.active ? (
                        <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                          Activa
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Inactiva
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {config.active && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(editingId === config.id ? null : config.id)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => handleCalculate(config.id)}
                          >
                            <Play className="h-3.5 w-3.5" />
                            Calcular
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Fees display */}
                  {editingId !== config.id && (
                    <div className="grid grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Fee energía:</span>{' '}
                        <span className="font-mono">{config.fee_energia}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">% Fee energía:</span>{' '}
                        <span className="font-mono">{config.pct_fee_energia}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fee potencia:</span>{' '}
                        <span className="font-mono">{config.fee_potencia}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">% Fee potencia:</span>{' '}
                        <span className="font-mono">{config.pct_fee_potencia}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Com. servicio:</span>{' '}
                        <span className="font-mono">{config.comision_servicio} €</span>
                      </div>
                    </div>
                  )}

                  {/* Inline edit */}
                  {editingId === config.id && (
                    <form
                      action={(fd) => handleUpdate(config.id, fd)}
                      className="grid grid-cols-5 gap-3"
                    >
                      <div>
                        <label className={labelClass}>Fee energía</label>
                        <input
                          name="fee_energia"
                          type="number"
                          step="0.000001"
                          defaultValue={config.fee_energia}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>% Fee energía</label>
                        <input
                          name="pct_fee_energia"
                          type="number"
                          step="0.01"
                          defaultValue={config.pct_fee_energia}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Fee potencia</label>
                        <input
                          name="fee_potencia"
                          type="number"
                          step="0.000001"
                          defaultValue={config.fee_potencia}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>% Fee potencia</label>
                        <input
                          name="pct_fee_potencia"
                          type="number"
                          step="0.01"
                          defaultValue={config.pct_fee_potencia}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Com. servicio (€)</label>
                        <input
                          name="comision_servicio"
                          type="number"
                          step="0.01"
                          defaultValue={config.comision_servicio}
                          className={inputClass}
                        />
                      </div>
                      <div className="col-span-5 flex gap-2">
                        <Button type="submit" size="sm" disabled={isPending}>
                          Guardar
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Resultado del cálculo */}
                  {calcResult && calcResult.configId === config.id && (
                    <div className={`flex items-center gap-2 rounded-md p-2 text-sm ${
                      calcResult.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {calcResult.ok ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0" />
                      )}
                      {calcResult.message}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Creada por {config.created_by_name} el{' '}
                    {new Date(config.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulario de creación */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nueva fórmula de comisión</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAction} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Campaña</label>
                  <select name="campaign_id" required className={inputClass}>
                    <option value="">Seleccionar...</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Producto</label>
                  <select name="product_id" required className={inputClass}>
                    <option value="">Seleccionar...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-4">
                <div>
                  <label className={labelClass}>Fee energía (€/kWh)</label>
                  <input
                    name="fee_energia"
                    type="number"
                    step="0.000001"
                    defaultValue="0"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>% Fee energía</label>
                  <input
                    name="pct_fee_energia"
                    type="number"
                    step="0.01"
                    defaultValue="100"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Fee potencia (€/kW)</label>
                  <input
                    name="fee_potencia"
                    type="number"
                    step="0.000001"
                    defaultValue="0"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>% Fee potencia</label>
                  <input
                    name="pct_fee_potencia"
                    type="number"
                    step="0.01"
                    defaultValue="100"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Com. servicio (€)</label>
                  <input
                    name="comision_servicio"
                    type="number"
                    step="0.01"
                    defaultValue="0"
                    className={inputClass}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Fórmula: (consumo × fee_energía × %fee_energía) + (potencia × fee_potencia × %fee_potencia) + comisión_servicio
              </p>

              <div className="flex gap-2">
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creando...' : 'Crear fórmula'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
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
                  Fórmula creada correctamente.
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
