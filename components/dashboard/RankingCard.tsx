import { Trophy, Medal } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { ComercialRanking } from '@/lib/types'

interface RankingCardProps {
  data: ComercialRanking[]
  currentUserId?: string
  currentUserName?: string
}

const positionStyles = [
  { medal: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  { medal: 'text-zinc-300', bg: 'bg-zinc-500/10 border-zinc-500/20' },
  { medal: 'text-orange-600', bg: 'bg-orange-700/10 border-orange-700/20' },
]

export function RankingCard({
  data,
  currentUserName,
}: RankingCardProps) {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Trophy className="h-4 w-4 text-yellow-400" />
          Ranking de Comerciales
        </CardTitle>
        <p className="text-xs text-muted-foreground">Este mes</p>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {data.map((comercial) => {
          const isCurrentUser = comercial.nombre === currentUserName
          const medalStyle = positionStyles[comercial.posicion - 1]
          const initials = comercial.nombre
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()

          return (
            <div
              key={comercial.posicion}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                isCurrentUser
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-accent/50'
              )}
            >
              {/* Position */}
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                  comercial.posicion <= 3 && medalStyle
                    ? medalStyle.bg + ' ' + medalStyle.medal
                    : 'bg-muted text-muted-foreground border-border'
                )}
              >
                {comercial.posicion <= 3 ? (
                  <Medal className="h-3.5 w-3.5" />
                ) : (
                  comercial.posicion
                )}
              </div>

              {/* Avatar */}
              <Avatar className="h-7 w-7 border border-border">
                <AvatarFallback
                  className={cn(
                    'text-[10px] font-bold',
                    isCurrentUser
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Name & stats */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'truncate text-xs font-medium',
                      isCurrentUser ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {comercial.nombre}
                  </span>
                  {isCurrentUser && (
                    <span className="shrink-0 rounded px-1 py-0.5 bg-primary/20 text-[9px] font-semibold text-primary">
                      TÚ
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {comercial.contratos} contratos
                </span>
              </div>

              {/* Revenue */}
              <span className="shrink-0 text-xs font-semibold text-foreground">
                {(comercial.facturacion / 1000).toFixed(1)}k €
              </span>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
