import Link from 'next/link'
import { FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CONTRACT_STATE_CONFIG } from '@/lib/types'
import type { Contract } from '@/lib/types'

interface RecentContractsProps {
  contracts: Contract[]
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffH = Math.floor(diffMs / (1000 * 60 * 60))
  const diffD = Math.floor(diffH / 24)

  if (diffH < 1) return 'Hace menos de 1h'
  if (diffH < 24) return `Hace ${diffH}h`
  if (diffD === 1) return 'Ayer'
  return `Hace ${diffD} días`
}

export function RecentContracts({ contracts }: RecentContractsProps) {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText className="h-4 w-4 text-primary" />
          Contratos Recientes
        </CardTitle>
        <p className="text-xs text-muted-foreground">Últimos 5 contratos</p>
      </CardHeader>
      <CardContent className="pt-0">
        {contracts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay contratos todavía.
          </p>
        ) : (
          <div className="space-y-0">
            {contracts.map((contract) => {
              const stateConfig = CONTRACT_STATE_CONFIG[contract.estado]

              return (
                <Link
                  key={contract.id}
                  href={`/contratos/${contract.id}`}
                  className="flex items-start gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/50"
                >
                  {/* Icon */}
                  <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-card bg-emerald-500/10 border-emerald-500/20">
                    <FileText className="h-3.5 w-3.5 text-emerald-400" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {contract.titular_contrato || 'Sin titular'}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
                              stateConfig.color
                            )}
                          >
                            {stateConfig.label}
                          </span>
                          {contract.product_name && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              {contract.product_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] text-muted-foreground">
                          {formatRelativeTime(contract.created_at)}
                        </p>
                        {contract.owner_name && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground truncate max-w-[100px]">
                            {contract.owner_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
