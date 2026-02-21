import { Clock, Zap, Flame } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { CUPSBusquedaReciente } from '@/lib/types'

interface CUPSRecientesProps {
  recientes: CUPSBusquedaReciente[]
  onSelect: (cups: string) => void
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(h / 24)
  if (h < 1) return 'Hace menos de 1h'
  if (h < 24) return `Hace ${h}h`
  return `Hace ${d} día${d > 1 ? 's' : ''}`
}

export function CUPSRecientes({ recientes, onSelect }: CUPSRecientesProps) {
  if (recientes.length === 0) return null

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Consultas recientes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {recientes.map((r) => {
          const Icon = r.tipo === 'electricidad' ? Zap : Flame
          const iconColor = r.tipo === 'electricidad' ? 'text-primary' : 'text-blue-400'
          const iconBg = r.tipo === 'electricidad'
            ? 'bg-primary/10 border-primary/20'
            : 'bg-blue-500/10 border-blue-500/20'

          return (
            <button
              key={r.cups}
              onClick={() => onSelect(r.cups)}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-accent/50 transition-colors group"
            >
              <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border', iconBg)}>
                <Icon className={cn('h-3.5 w-3.5', iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  {r.cups}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{r.titular}</p>
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {formatRelative(r.fecha)}
              </span>
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}
