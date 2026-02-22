import { type LucideIcon, Users, UserCheck, Target, TrendingUp, Euro, Award } from 'lucide-react'
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
      label: 'Activos',
      value: stats.clientes_activos.toString(),
      icon: UserCheck,
      color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
      description: 'con contrato vigente',
    },
    {
      label: 'Prospectos',
      value: stats.prospectos.toString(),
      icon: Target,
      color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
      description: 'en seguimiento',
    },
    {
      label: 'Oportunidades',
      value: stats.oportunidades_abiertas.toString(),
      icon: TrendingUp,
      color: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
      description: 'abiertas en pipeline',
    },
    {
      label: 'Valor pipeline',
      value: `${stats.valor_pipeline.toLocaleString('es-ES')} €`,
      icon: Euro,
      color: 'text-primary bg-primary/10 border-primary/20',
      description: 'ahorro estimado/año',
    },
    {
      label: 'Conversiones',
      value: stats.conversiones_mes.toString(),
      icon: Award,
      color: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
      description: 'contratos este mes',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
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
