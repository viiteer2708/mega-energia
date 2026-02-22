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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ContratoPorTipo } from '@/lib/types'

interface ContratosChartProps {
  data: ContratoPorTipo[]
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-sm p-3 shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">
            {entry.name === 'actual' ? 'Este mes' : 'Mes anterior'}:
          </span>
          <span className="font-medium text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export function ContratosChart({ data }: ContratosChartProps) {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">
          Contratos por Tipo
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Comparativa con mes anterior
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            barCategoryGap="30%"
            barGap={4}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(1 0 0 / 6%)"
              vertical={false}
            />
            <XAxis
              dataKey="tipo"
              tick={{ fill: 'oklch(0.60 0 0)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'oklch(0.60 0 0)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="anterior"
              name="anterior"
              fill="oklch(0.30 0 0)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="actual"
              name="actual"
              fill="oklch(0.72 0.24 40)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 flex items-center gap-4 justify-center">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-4 rounded-sm bg-[oklch(0.30_0_0)]" />
            Mes anterior
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-4 rounded-sm bg-[oklch(0.72_0.24_40)]" />
            Este mes
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
