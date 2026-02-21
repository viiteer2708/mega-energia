'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ResultadoTarifa } from '@/lib/types'

interface ComparadorChartProps {
  resultados: ResultadoTarifa[]
  costeActual: number
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-sm p-3 shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">Coste anual: <span className="font-bold text-foreground">{payload[0].value.toFixed(0)} €</span></p>
    </div>
  )
}

export function ComparadorChart({ resultados, costeActual }: ComparadorChartProps) {
  const data = resultados
    .sort((a, b) => a.coste_total_anual - b.coste_total_anual)
    .map(r => ({
      nombre: r.tarifa.comercializadora === 'MEGA ENERGÍA'
        ? 'MEGA'
        : r.tarifa.comercializadora,
      coste: Math.round(r.coste_total_anual),
      esMega: r.tarifa.es_mega,
    }))

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">
          Comparativa de coste anual
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Línea naranja = coste actual del cliente
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" vertical={false} />
            <XAxis dataKey="nombre" tick={{ fill: 'oklch(0.60 0 0)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'oklch(0.60 0 0)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={costeActual} stroke="oklch(0.72 0.24 40)" strokeDasharray="4 2" strokeWidth={1.5} />
            <Bar dataKey="coste" radius={[4, 4, 0, 0]}>
              {data.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.esMega ? 'oklch(0.72 0.24 40)' : 'oklch(0.28 0 0)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
