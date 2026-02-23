import { type LucideIcon, Users, AlertTriangle, Euro, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CRMStats } from '@/lib/types'

interface StatItem {
  label: string
  value: string
  icon: LucideIcon
  color: string
  description: string
}

interface CRMStatsCardsProps {
  stats: CRMStats
}

export function CRMStatsCards({ stats }: CRMStatsCardsProps) {
  const items: StatItem[] = [
    {
      label: 'Total clientes',
      value: stats.total_clientes.toString(),
      icon: Users,
      color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
      description: 'en la cartera',
    },
    {
      label: 'Incidencias',
      value: stats.incidencias.toString(),
      icon: AlertTriangle,
      color: 'text-red-400 bg-red-400/10 border-red-400/20',
      description: 'pendientes de resolver',
    },
    {
      label: 'Comisionado',
      value: `${stats.comisionado.toLocaleString('es-ES')} €`,
      icon: Euro,
      color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
      description: 'acumulado',
    },
    {
      label: 'Volumen mWh',
      value: stats.volumen_mwh.toLocaleString('es-ES'),
      icon: Activity,
      color: 'text-primary bg-primary/10 border-primary/20',
      description: 'energía gestionada',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {items.map(item => {
        const Icon = item.icon
        return (
          <div
            key={item.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className={cn(
              'mb-3 flex h-8 w-8 items-center justify-center rounded-lg border',
              item.color
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold text-foreground leading-none mb-1">
              {item.value}
            </p>
            <p className="text-xs font-medium text-foreground/70">{item.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{item.description}</p>
          </div>
        )
      })}
    </div>
  )
}
