import {
  FileText,
  MapPin,
  Phone,
  Mail,
  Clock,
  Euro,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Actividad } from '@/lib/types'

interface ActivityFeedProps {
  actividades: Actividad[]
}

const actividadConfig = {
  contrato: {
    icon: FileText,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    label: 'Contrato firmado',
  },
  visita: {
    icon: MapPin,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    label: 'Visita comercial',
  },
  llamada: {
    icon: Phone,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    label: 'Llamada',
  },
  email: {
    icon: Mail,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    label: 'Email enviado',
  },
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date('2026-02-21T12:00:00')
  const diffMs = now.getTime() - date.getTime()
  const diffH = Math.floor(diffMs / (1000 * 60 * 60))
  const diffD = Math.floor(diffH / 24)

  if (diffH < 1) return 'Hace menos de 1h'
  if (diffH < 24) return `Hace ${diffH}h`
  if (diffD === 1) return 'Ayer'
  return `Hace ${diffD} días`
}

export function ActivityFeed({ actividades }: ActivityFeedProps) {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Clock className="h-4 w-4 text-primary" />
          Actividad Reciente
        </CardTitle>
        <p className="text-xs text-muted-foreground">Últimas acciones</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative space-y-0">
          {/* Vertical line */}
          <div className="absolute left-5 top-3 bottom-3 w-px bg-border/50" />

          {actividades.map((actividad) => {
            const config = actividadConfig[actividad.tipo]
            const Icon = config.icon

            return (
              <div
                key={actividad.id}
                className="relative flex items-start gap-3 py-3"
              >
                {/* Icon */}
                <div
                  className={cn(
                    'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-card',
                    config.bg
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', config.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {config.label}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {actividad.cliente}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(actividad.fecha)}
                      </p>
                      {actividad.importe && (
                        <p className="mt-0.5 flex items-center gap-0.5 text-xs font-semibold text-emerald-400">
                          <Euro className="h-2.5 w-2.5" />
                          {actividad.importe.toLocaleString('es-ES')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
