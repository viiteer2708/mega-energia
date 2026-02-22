import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string
  variacion?: number
  icon: LucideIcon
  accentColor?: 'teal' | 'blue' | 'green' | 'purple' | 'red' | 'orange'
  subtitle?: string
}

const accentStyles = {
  teal: {
    icon: 'text-teal-400',
    iconBg: 'bg-teal-500/10 border-teal-500/20',
    glow: 'shadow-teal-500/10',
    trend: 'text-teal-400',
  },
  blue: {
    icon: 'text-blue-400',
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    glow: 'shadow-blue-500/10',
    trend: 'text-blue-400',
  },
  green: {
    icon: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    glow: 'shadow-emerald-500/10',
    trend: 'text-emerald-400',
  },
  purple: {
    icon: 'text-purple-400',
    iconBg: 'bg-purple-500/10 border-purple-500/20',
    glow: 'shadow-purple-500/10',
    trend: 'text-purple-400',
  },
  red: {
    icon: 'text-red-400',
    iconBg: 'bg-red-500/10 border-red-500/20',
    glow: 'shadow-red-500/10',
    trend: 'text-red-400',
  },
  orange: {
    icon: 'text-orange-400',
    iconBg: 'bg-orange-500/10 border-orange-500/20',
    glow: 'shadow-orange-500/10',
    trend: 'text-orange-400',
  },
}

export function KPICard({
  title,
  value,
  variacion,
  icon: Icon,
  accentColor = 'teal',
  subtitle,
}: KPICardProps) {
  const styles = accentStyles[accentColor]
  const isPositive = variacion !== undefined && variacion >= 0

  return (
    <Card
      className={cn(
        'border-border/50 bg-card transition-all duration-200 hover:border-border hover:shadow-lg',
        styles.glow
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground truncate">
              {value}
            </p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            )}
            {variacion !== undefined && (
              <div
                className={cn(
                  'mt-2 flex items-center gap-1 text-xs font-medium',
                  isPositive ? 'text-emerald-400' : 'text-red-400'
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>
                  {isPositive ? '+' : ''}
                  {variacion.toFixed(1)}% vs mes anterior
                </span>
              </div>
            )}
          </div>
          <div
            className={cn(
              'ml-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
              styles.iconBg
            )}
          >
            <Icon className={cn('h-5 w-5', styles.icon)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
