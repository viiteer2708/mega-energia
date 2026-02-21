'use client'

import { Trophy, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ResultadoTarifa } from '@/lib/types'

interface ComparadorResultadosProps {
  resultados: ResultadoTarifa[]
  costeActual: number
}

export function ComparadorResultados({ resultados, costeActual }: ComparadorResultadosProps) {
  const sorted = [...resultados].sort((a, b) => a.coste_total_anual - b.coste_total_anual)
  const mejor = sorted[0]

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Resumen ahorro */}
      {mejor.tarifa.es_mega && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
            <Trophy className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              MEGA ENERGÍA ofrece la mejor tarifa
            </p>
            <p className="text-xs text-emerald-400/70">
              El cliente ahorra{' '}
              <span className="font-bold text-emerald-400">
                {mejor.ahorro_vs_actual > 0
                  ? `${mejor.ahorro_vs_actual.toFixed(0)} €`
                  : `${Math.abs(mejor.ahorro_vs_actual).toFixed(0)} €`}
              </span>{' '}
              al año frente a su tarifa actual
            </p>
          </div>
        </div>
      )}

      {/* Lista de tarifas */}
      <div className="space-y-2">
        {sorted.map((r, idx) => {
          const isBest = idx === 0
          const ahorro = costeActual - r.coste_total_anual
          const isBarata = ahorro > 0

          return (
            <Card
              key={r.tarifa.id}
              className={cn(
                'border transition-all',
                r.tarifa.es_mega
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border/50 bg-card',
                isBest && 'ring-1 ring-primary/30'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Posición */}
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    isBest ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    {idx + 1}
                  </div>

                  {/* Info tarifa */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-sm font-semibold', r.tarifa.es_mega ? 'text-primary' : 'text-foreground')}>
                        {r.tarifa.comercializadora}
                      </span>
                      {r.tarifa.es_mega && (
                        <span className="rounded px-1.5 py-0.5 bg-primary/20 text-[10px] font-bold text-primary">
                          MEGA ENERGÍA
                        </span>
                      )}
                      {isBest && (
                        <span className="rounded px-1.5 py-0.5 bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                          MÁS BARATA
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{r.tarifa.nombre_tarifa}</p>
                  </div>

                  {/* Precios */}
                  <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="text-center">
                      <p className="font-mono font-semibold text-foreground">{r.tarifa.precio_p1.toFixed(3)}</p>
                      <p>P1 €/kWh</p>
                    </div>
                    {r.tarifa.precio_p2 && (
                      <div className="text-center">
                        <p className="font-mono font-semibold text-foreground">{r.tarifa.precio_p2.toFixed(3)}</p>
                        <p>P2 €/kWh</p>
                      </div>
                    )}
                    {r.tarifa.precio_p3 && (
                      <div className="text-center">
                        <p className="font-mono font-semibold text-foreground">{r.tarifa.precio_p3.toFixed(3)}</p>
                        <p>P3 €/kWh</p>
                      </div>
                    )}
                  </div>

                  {/* Coste total */}
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-foreground">
                      {r.coste_total_anual.toFixed(0)} €
                    </p>
                    <p className="text-[10px] text-muted-foreground">al año</p>
                  </div>

                  {/* Ahorro vs actual */}
                  <div className={cn(
                    'shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold',
                    isBarata
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-red-500/15 text-red-400'
                  )}>
                    {isBarata
                      ? <TrendingDown className="h-3 w-3" />
                      : <TrendingUp className="h-3 w-3" />}
                    {isBarata ? '-' : '+'}{Math.abs(ahorro).toFixed(0)} €/año
                  </div>
                </div>

                {/* Desglose */}
                <div className="mt-3 flex gap-4 text-[11px] text-muted-foreground border-t border-border/50 pt-3">
                  <span>Energía: <span className="text-foreground font-medium">{r.coste_energia_anual.toFixed(0)} €</span></span>
                  <span>Potencia: <span className="text-foreground font-medium">{r.coste_potencia_anual.toFixed(0)} €</span></span>
                  {r.coste_fijo_anual > 0 && (
                    <span>Cuota fija: <span className="text-foreground font-medium">{r.coste_fijo_anual.toFixed(0)} €</span></span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
