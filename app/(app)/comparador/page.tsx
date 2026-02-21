'use client'

import { useState } from 'react'
import { GitCompare } from 'lucide-react'
import { ComparadorForm } from '@/components/comparador/ComparadorForm'
import { ComparadorResultados } from '@/components/comparador/ComparadorResultados'
import { ComparadorChart } from '@/components/comparador/ComparadorChart'
import { tarifasComparador } from '@/lib/mock-data'
import type { ComparadorInputData, ResultadoTarifa } from '@/lib/types'

function calcularResultados(input: ComparadorInputData): ResultadoTarifa[] {
  const tipoFiltro = input.tipo === 'dual' ? ['electricidad', 'gas'] : [input.tipo]

  return tarifasComparador
    .filter(t => tipoFiltro.includes(t.tipo))
    .map(tarifa => {
      const kwh = input.consumo_anual_kwh
      const p1 = kwh * (input.consumo_p1_pct / 100)
      const p2 = kwh * (input.consumo_p2_pct / 100)
      const p3 = kwh * (input.consumo_p3_pct / 100)

      const coste_energia = p1 * tarifa.precio_p1
        + p2 * (tarifa.precio_p2 ?? tarifa.precio_p1)
        + p3 * (tarifa.precio_p3 ?? tarifa.precio_p1)

      const coste_potencia = input.potencia_kw * tarifa.potencia_anual
      const coste_fijo = tarifa.cuota_fija * 12
      const coste_total = coste_energia + coste_potencia + coste_fijo

      const coste_actual = input.consumo_anual_kwh * input.precio_actual_kwh
        + input.potencia_kw * 40

      return {
        tarifa,
        coste_energia_anual: coste_energia,
        coste_potencia_anual: coste_potencia,
        coste_fijo_anual: coste_fijo,
        coste_total_anual: coste_total,
        ahorro_vs_actual: coste_actual - coste_total,
      } as ResultadoTarifa
    })
}

export default function ComparadorPage() {
  const [loading, setLoading] = useState(false)
  const [resultados, setResultados] = useState<ResultadoTarifa[] | null>(null)
  const [costeActual, setCosteActual] = useState(0)

  async function handleComparar(data: ComparadorInputData) {
    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    const res = calcularResultados(data)
    const actual = data.consumo_anual_kwh * data.precio_actual_kwh + data.potencia_kw * 40
    setCosteActual(actual)
    setResultados(res)
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <GitCompare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Comparador de Tarifas</h1>
          <p className="text-sm text-muted-foreground">
            Calcula el ahorro de un cliente frente a su tarifa actual
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <ComparadorForm onComparar={handleComparar} loading={loading} />

        {resultados ? (
          <div className="space-y-4">
            <ComparadorChart resultados={resultados} costeActual={costeActual} />
            <ComparadorResultados resultados={resultados} costeActual={costeActual} />
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border/50 bg-card/30 min-h-64">
            <div className="text-center">
              <GitCompare className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Introduce los datos del cliente</p>
              <p className="text-xs text-muted-foreground mt-1">y haz clic en Calcular</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
