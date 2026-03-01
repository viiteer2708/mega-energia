'use client'

import { useMemo } from 'react'
import { Calculator } from 'lucide-react'

interface FormulaPreviewProps {
  pricingType: string
  feeEnergia: number
  feeEnergiaFijo: number
  margenIntermediacion: number
  feePotencia: number
  potenciaCalcMethod: string
  comisionServicio: number
  factorEnergia: number
  factorPotencia: number
}

const EXAMPLE = {
  consumo: 10000,
  potencias: [3, 3, 3, 3, 3, 3],
}

export function FormulaPreview({
  pricingType,
  feeEnergia,
  feeEnergiaFijo,
  margenIntermediacion,
  feePotencia,
  potenciaCalcMethod,
  comisionServicio,
  factorEnergia,
  factorPotencia,
}: FormulaPreviewProps) {
  const calc = useMemo(() => {
    const consumo = EXAMPLE.consumo
    const pots = EXAMPLE.potencias

    let comEnergia: number
    let energiaLabel: string

    if (pricingType === 'fijo') {
      comEnergia = consumo * feeEnergiaFijo
      energiaLabel = `${consumo.toLocaleString('es-ES')} x ${feeEnergiaFijo}`
    } else {
      comEnergia = consumo * (feeEnergia + margenIntermediacion)
      energiaLabel = `${consumo.toLocaleString('es-ES')} x (${feeEnergia} + ${margenIntermediacion})`
    }

    const comEnergiaAjustada = comEnergia * factorEnergia

    let comPotencia: number
    let potenciaLabel: string

    if (potenciaCalcMethod === 'sum_periods') {
      const totalPot = pots.reduce((s, p) => s + p, 0)
      comPotencia = totalPot * feePotencia
      potenciaLabel = `${totalPot} x ${feePotencia}`
    } else {
      const media = pots.reduce((s, p) => s + p, 0) / pots.length
      comPotencia = media * feePotencia
      potenciaLabel = `${media} x ${feePotencia}`
    }

    const comPotenciaAjustada = comPotencia * factorPotencia

    const total = comEnergiaAjustada + comPotenciaAjustada + comisionServicio

    return {
      comEnergiaAjustada,
      comPotenciaAjustada,
      total,
      energiaLabel,
      potenciaLabel,
    }
  }, [pricingType, feeEnergia, feeEnergiaFijo, margenIntermediacion, feePotencia, potenciaCalcMethod, comisionServicio, factorEnergia, factorPotencia])

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  return (
    <div className="rounded-lg border border-border/60 bg-accent/20 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Calculator className="h-3.5 w-3.5" />
        Preview — Ejemplo: {EXAMPLE.consumo.toLocaleString('es-ES')} kWh, potencias {EXAMPLE.potencias.join('+')} kW
      </div>
      <div className="space-y-1 font-mono text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Energia: {calc.energiaLabel}{factorEnergia !== 1 ? ` x ${factorEnergia}` : ''}
          </span>
          <span className="text-foreground">{fmt(calc.comEnergiaAjustada)} EUR</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Potencia: {calc.potenciaLabel}{factorPotencia !== 1 ? ` x ${factorPotencia}` : ''}
          </span>
          <span className="text-foreground">{fmt(calc.comPotenciaAjustada)} EUR</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Servicio:</span>
          <span className="text-foreground">{fmt(comisionServicio)} EUR</span>
        </div>
        <div className="border-t border-border/50 pt-1 flex justify-between font-semibold">
          <span className="text-primary">TOTAL:</span>
          <span className="text-primary">{fmt(calc.total)} EUR</span>
        </div>
      </div>
    </div>
  )
}
