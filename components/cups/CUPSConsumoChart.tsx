'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ConsumoMensual, CUPSTipo } from '@/lib/types'

interface CUPSConsumoChartProps {
  data: ConsumoMensual[]
  tipo: CUPSTipo
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-sm p-3 shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">
        Consumo:{' '}
        <span className="font-medium text-foreground">
          {payload[0].value.toLocaleString('es-ES')} kWh
        </span>
      </p>
    </div>
  )
}

export function CUPSConsumoChart({ data, tipo }: CUPSConsumoChartProps) {
  const color = tipo === 'electricidad' ? 'oklch(0.72 0.24 40)' : 'oklch(0.62 0.18 260)'

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }} barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" vertical={false} />
        <XAxis
          dataKey="mes"
          tick={{ fill: 'oklch(0.60 0 0)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'oklch(0.60 0 0)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="kwh" fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
