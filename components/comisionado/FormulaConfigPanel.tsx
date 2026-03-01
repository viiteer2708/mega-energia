'use client'

import { useState, useEffect } from 'react'
import { Settings2, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { FormulaPreview } from './FormulaPreview'
import { getFormulaConfigs } from '@/app/(app)/comisionado/actions'
import type { FormulaConfig } from '@/lib/types'

const inputCls =
  'flex h-8 w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

function Tip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3 w-3 text-muted-foreground/60 inline ml-1 cursor-help" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

interface FormulaConfigPanelProps {
  productId: number
  companyId: number
  onSave: (productId: number, formData: FormData) => void
  onSaveFeeOptions: (configId: number, feeType: 'energia' | 'potencia', range: string) => void
  isPending: boolean
}

export function FormulaConfigPanel({
  productId,
  companyId,
  onSave,
  onSaveFeeOptions,
  isPending,
}: FormulaConfigPanelProps) {
  const [config, setConfig] = useState<FormulaConfig | null>(null)
  const [loading, setLoading] = useState(true)

  // Live preview state
  const [pricingType, setPricingType] = useState('indexado')
  const [feeEnergia, setFeeEnergia] = useState(0)
  const [feeEnergiaFijo, setFeeEnergiaFijo] = useState(0)
  const [mi, setMi] = useState(0)
  const [feePotencia, setFeePotencia] = useState(0)
  const [potCalcMethod, setPotCalcMethod] = useState('sum_periods')
  const [comServicio, setComServicio] = useState(0)
  const [factorEnergia, setFactorEnergia] = useState(1)
  const [factorPotencia, setFactorPotencia] = useState(1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getFormulaConfigs(companyId).then(configs => {
      if (cancelled) return
      const existing = configs.find(c => c.product_id === productId)
      if (existing) {
        setConfig(existing)
        setPricingType(existing.pricing_type)
        setFeeEnergia(existing.fee_energia ?? 0)
        setFeeEnergiaFijo(existing.fee_energia_fijo ?? 0)
        setMi(existing.margen_intermediacion)
        setFeePotencia(existing.fee_potencia ?? 0)
        setPotCalcMethod(existing.potencia_calc_method)
        setComServicio(existing.comision_servicio)
        setFactorEnergia(existing.factor_energia)
        setFactorPotencia(existing.factor_potencia)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [productId, companyId])

  if (loading) {
    return <p className="text-xs text-muted-foreground py-2">Cargando configuracion...</p>
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="rounded-lg border border-dashed border-primary/30 p-4 space-y-4 bg-primary/5">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">Configuracion de formula</span>
        </div>

        <form action={(fd) => onSave(productId, fd)} className="space-y-4">
          {/* Seccion 1: Energia */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Energia
            </legend>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Tipo precio
                  <Tip text="Indexado: fee variable segun mercado. Fijo: fee constante por kWh." />
                </label>
                <select
                  name="pricing_type"
                  value={pricingType}
                  onChange={e => setPricingType(e.target.value)}
                  className={inputCls}
                >
                  <option value="indexado">Indexado</option>
                  <option value="fijo">Fijo</option>
                </select>
              </div>
              {pricingType === 'indexado' ? (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Fee energia (EUR/kWh)
                    <Tip text="Comision variable por kWh consumido. Se suma al MI para calcular la comision de energia." />
                  </label>
                  <input
                    name="fee_energia"
                    type="number"
                    step="0.000001"
                    value={feeEnergia}
                    onChange={e => setFeeEnergia(Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Fee energia fijo (EUR/kWh)
                    <Tip text="Comision fija por kWh. Se usa en vez de fee+MI." />
                  </label>
                  <input
                    name="fee_energia_fijo"
                    type="number"
                    step="0.000001"
                    value={feeEnergiaFijo}
                    onChange={e => setFeeEnergiaFijo(Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  MI (EUR/kWh)
                  <Tip text="Margen de intermediacion. Se suma al fee de energia en modo indexado." />
                </label>
                <input
                  name="margen_intermediacion"
                  type="number"
                  step="0.000001"
                  value={mi}
                  onChange={e => setMi(Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Factor energia
                  <Tip text="Multiplicador final del componente energia. Por defecto 1." />
                </label>
                <input
                  name="factor_energia"
                  type="number"
                  step="0.0001"
                  value={factorEnergia}
                  onChange={e => setFactorEnergia(Number(e.target.value))}
                  className={inputCls}
                />
              </div>
            </div>
            {/* Hidden fields for opposite pricing type */}
            {pricingType === 'indexado' && (
              <input type="hidden" name="fee_energia_fijo" value="" />
            )}
            {pricingType === 'fijo' && (
              <input type="hidden" name="fee_energia" value="" />
            )}
          </fieldset>

          {/* Seccion 2: Potencia */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Potencia
            </legend>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Fee potencia (EUR/kW)
                  <Tip text="Comision por kW de potencia contratada." />
                </label>
                <input
                  name="fee_potencia"
                  type="number"
                  step="0.000001"
                  value={feePotencia}
                  onChange={e => setFeePotencia(Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Metodo calculo
                  <Tip text="Suma periodos: suma cada potencia x fee. Media: media de potencias x fee." />
                </label>
                <select
                  name="potencia_calc_method"
                  value={potCalcMethod}
                  onChange={e => setPotCalcMethod(e.target.value)}
                  className={inputCls}
                >
                  <option value="sum_periods">Suma periodos</option>
                  <option value="average">Media</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Factor potencia
                  <Tip text="Multiplicador final del componente potencia. Por defecto 1." />
                </label>
                <input
                  name="factor_potencia"
                  type="number"
                  step="0.0001"
                  value={factorPotencia}
                  onChange={e => setFactorPotencia(Number(e.target.value))}
                  className={inputCls}
                />
              </div>
            </div>
          </fieldset>

          {/* Seccion 3: Servicio */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Servicio
            </legend>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Comision servicio (EUR)
                  <Tip text="Importe fijo por contrato, independiente de consumo o potencia." />
                </label>
                <input
                  name="comision_servicio"
                  type="number"
                  step="0.01"
                  value={comServicio}
                  onChange={e => setComServicio(Number(e.target.value))}
                  className={inputCls}
                />
              </div>
            </div>
          </fieldset>

          {/* Preview en vivo */}
          <FormulaPreview
            pricingType={pricingType}
            feeEnergia={feeEnergia}
            feeEnergiaFijo={feeEnergiaFijo}
            margenIntermediacion={mi}
            feePotencia={feePotencia}
            potenciaCalcMethod={potCalcMethod}
            comisionServicio={comServicio}
            factorEnergia={factorEnergia}
            factorPotencia={factorPotencia}
          />

          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? 'Guardando...' : 'Guardar formula'}
          </Button>
        </form>
      </div>
    </TooltipProvider>
  )
}
