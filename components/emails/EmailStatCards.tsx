import { Send, MailOpen, Reply, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { EmailStats } from '@/lib/types'

interface EmailStatCardsProps {
  stats: EmailStats
}

export function EmailStatCards({ stats }: EmailStatCardsProps) {
  const items = [
    {
      label: 'Total enviados',
      value: stats.total_enviados.toString(),
      icon: Send,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      label: 'Tasa de apertura',
      value: `${stats.tasa_apertura}%`,
      icon: MailOpen,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      subtitle: 'de los emails enviados',
    },
    {
      label: 'Tasa de respuesta',
      value: `${stats.tasa_respuesta}%`,
      icon: Reply,
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/20',
      subtitle: 'clientes que contestaron',
    },
    {
      label: 'Rebotados',
      value: stats.rebotados.toString(),
      icon: AlertCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
      subtitle: 'direcciones inválidas',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map(({ label, value, icon: Icon, color, bg, subtitle }) => (
        <Card key={label} className="border-border/50 bg-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
                {subtitle && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
                )}
              </div>
              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', bg)}>
                <Icon className={cn('h-5 w-5', color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
