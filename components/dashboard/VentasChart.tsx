'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ContratoMensual } from '@/lib/types'

interface VentasChartProps {
  data: ContratoMensual[]
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-sm p-3 shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-muted-foreground">
          <span className="font-medium text-foreground">
            {entry.name === 'contratos'
              ? `${entry.value} contratos`
              : `${entry.value.toLocaleString('es-ES')} €`}
          </span>
        </div>
      ))}
    </div>
  )
}

export function VentasChart({ data }: VentasChartProps) {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">
          Evolución de Ventas
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Últimos 6 meses — contratos firmados
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradContratos" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="oklch(0.72 0.24 40)"
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor="oklch(0.72 0.24 40)"
                  stopOpacity={0.0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(1 0 0 / 6%)"
              vertical={false}
            />
            <XAxis
              dataKey="mes"
              tick={{ fill: 'oklch(0.60 0 0)', fontSize: 11 }}
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
            <Area
              type="monotone"
              dataKey="contratos"
              stroke="oklch(0.72 0.24 40)"
              strokeWidth={2.5}
              fill="url(#gradContratos)"
              dot={{
                fill: 'oklch(0.72 0.24 40)',
                strokeWidth: 2,
                r: 4,
                stroke: 'oklch(0.14 0 0)',
              }}
              activeDot={{
                r: 6,
                fill: 'oklch(0.72 0.24 40)',
                stroke: 'oklch(0.14 0 0)',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
