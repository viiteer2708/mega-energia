'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, ChevronLeft, ChevronRight, Coins,
  MoreHorizontal, CheckCircle, Ban, Clock, ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  PAGO_STATUS_CONFIG, COMMISSION_GNEW_STATUS_CONFIG,
} from '@/lib/types'
import type { PagoStatus, CommissionLineListResult, CommissionLineItem } from '@/lib/types'
import {
  getCommissionLines,
  updateCommissionLineStatus,
  applyDecomission,
} from '@/app/(app)/comisionado/actions'

const inputClass =
  'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

const PAGO_STATUSES: PagoStatus[] = ['pendiente', 'pagado', 'anulado', 'retenido']

interface CommissionLinesProps {
  initialData: CommissionLineListResult
  isAdmin: boolean
}

export function CommissionLines({ initialData, isAdmin }: CommissionLinesProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [statusFilter, setStatusFilter] = useState<PagoStatus | ''>(
    (searchParams.get('status_pago') as PagoStatus) ?? ''
  )
  const [actionLineId, setActionLineId] = useState<number | null>(null)
  const [decoLineId, setDecoLineId] = useState<number | null>(null)
  const [decoAmount, setDecoAmount] = useState('')

  // Debounced search & filter
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(async () => {
        const result = await getCommissionLines({
          search: search || undefined,
          status_pago: statusFilter || undefined,
          page: 1,
        })
        setData(result)
      })
    }, 400)
    return () => clearTimeout(timer)
  }, [search, statusFilter])

  const navigatePage = (page: number) => {
    startTransition(async () => {
      const result = await getCommissionLines({
        search: search || undefined,
        status_pago: statusFilter || undefined,
        page,
      })
      setData(result)
    })
  }

  const handleStatusChange = async (lineId: number, newStatus: PagoStatus) => {
    const fechaPago = newStatus === 'pagado' ? new Date().toISOString().split('T')[0] : undefined
    const result = await updateCommissionLineStatus(lineId, newStatus, fechaPago)
    if (result.ok) {
      setActionLineId(null)
      // Refresh
      startTransition(async () => {
        const updated = await getCommissionLines({
          search: search || undefined,
          status_pago: statusFilter || undefined,
          page: data.page,
        })
        setData(updated)
      })
    }
  }

  const handleDecomission = async (lineId: number) => {
    const amount = parseFloat(decoAmount)
    if (isNaN(amount) || amount < 0) return
    const result = await applyDecomission(lineId, amount)
    if (result.ok) {
      setDecoLineId(null)
      setDecoAmount('')
      startTransition(async () => {
        const updated = await getCommissionLines({
          search: search || undefined,
          status_pago: statusFilter || undefined,
          page: data.page,
        })
        setData(updated)
      })
    }
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">
          {data.total} línea{data.total !== 1 ? 's' : ''} de comisión
        </p>
      </div>

      {/* Búsqueda */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por titular, CUPS o comercial..."
            className={`${inputClass} pl-9`}
          />
        </div>
      </div>

      {/* Chips de estado de pago */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant="outline"
          className={cn(
            'cursor-pointer transition-colors',
            !statusFilter ? 'bg-primary/20 text-primary border-primary/30' : 'hover:bg-accent'
          )}
          onClick={() => setStatusFilter('')}
        >
          Todos
        </Badge>
        {PAGO_STATUSES.map(status => {
          const config = PAGO_STATUS_CONFIG[status]
          const isActive = statusFilter === status
          return (
            <Badge
              key={status}
              variant="outline"
              className={cn(
                'cursor-pointer transition-colors',
                isActive ? config.color : 'hover:bg-accent'
              )}
              onClick={() => setStatusFilter(isActive ? '' : status)}
            >
              {config.label}
            </Badge>
          )
        })}
      </div>

      {/* Tabla */}
      {data.lines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Coins className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No hay líneas de comisión</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">Contrato</th>
                    <th className="px-4 py-3">Comercial</th>
                    {isAdmin && <th className="px-4 py-3">Comisión GNE</th>}
                    {isAdmin && <th className="px-4 py-3">Estado GNE</th>}
                    <th className="px-4 py-3">Comisión pagada</th>
                    <th className="px-4 py-3">Decomisión</th>
                    <th className="px-4 py-3">Estado pago</th>
                    <th className="px-4 py-3">Fecha pago</th>
                    <th className="px-4 py-3">Notas</th>
                    {isAdmin && <th className="px-4 py-3">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map(line => (
                    <LineRow
                      key={line.id}
                      line={line}
                      isAdmin={isAdmin}
                      actionLineId={actionLineId}
                      decoLineId={decoLineId}
                      decoAmount={decoAmount}
                      onToggleAction={(id) => setActionLineId(actionLineId === id ? null : id)}
                      onStatusChange={handleStatusChange}
                      onToggleDeco={(id) => {
                        setDecoLineId(decoLineId === id ? null : id)
                        setDecoAmount(String(line.decomission || ''))
                      }}
                      onDecoAmountChange={setDecoAmount}
                      onDecoSubmit={handleDecomission}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paginación */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {data.page} de {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.page <= 1 || isPending}
              onClick={() => navigatePage(data.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.page >= data.totalPages || isPending}
              onClick={() => navigatePage(data.page + 1)}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Subcomponente de fila ────────────────────────────────────────────────────

interface LineRowProps {
  line: CommissionLineItem
  isAdmin: boolean
  actionLineId: number | null
  decoLineId: number | null
  decoAmount: string
  onToggleAction: (id: number) => void
  onStatusChange: (id: number, status: PagoStatus) => void
  onToggleDeco: (id: number) => void
  onDecoAmountChange: (val: string) => void
  onDecoSubmit: (id: number) => void
  formatCurrency: (n: number) => string
}

function LineRow({
  line, isAdmin, actionLineId, decoLineId, decoAmount,
  onToggleAction, onStatusChange, onToggleDeco, onDecoAmountChange, onDecoSubmit,
  formatCurrency,
}: LineRowProps) {
  const pagoConfig = PAGO_STATUS_CONFIG[line.status_pago]
  const gnewConfig = COMMISSION_GNEW_STATUS_CONFIG[line.status_commission_gnew]
  const cupsShort = line.cups
    ? `${line.cups.slice(0, 10)}...${line.cups.slice(-4)}`
    : '—'

  return (
    <tr className="border-b border-border/50 hover:bg-accent/30 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-foreground">{line.titular_contrato || '(sin titular)'}</div>
        <div className="text-xs font-mono text-muted-foreground">{cupsShort}</div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{line.user_name}</td>
      {isAdmin && (
        <td className="px-4 py-3 font-medium text-foreground">
          {formatCurrency(line.commission_gnew)}
        </td>
      )}
      {isAdmin && (
        <td className="px-4 py-3">
          <Badge variant="outline" className={gnewConfig.color}>
            {gnewConfig.label}
          </Badge>
        </td>
      )}
      <td className="px-4 py-3 font-medium text-foreground">
        {formatCurrency(line.commission_paid)}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {line.decomission > 0 ? formatCurrency(line.decomission) : '—'}
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline" className={pagoConfig.color}>
          {pagoConfig.label}
        </Badge>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {line.fecha_pago ?? '—'}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[150px] truncate" title={line.notes ?? ''}>
        {line.notes ?? '—'}
      </td>
      {isAdmin && (
        <td className="px-4 py-3">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleAction(line.id)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>

            {/* Dropdown acciones */}
            {actionLineId === line.id && (
              <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-border bg-card p-1 shadow-lg">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Cambiar estado</p>
                {PAGO_STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(line.id, s)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    {s === 'pagado' && <CheckCircle className="h-3.5 w-3.5 text-green-400" />}
                    {s === 'pendiente' && <Clock className="h-3.5 w-3.5 text-amber-400" />}
                    {s === 'anulado' && <Ban className="h-3.5 w-3.5 text-red-400" />}
                    {s === 'retenido' && <ShieldAlert className="h-3.5 w-3.5 text-orange-400" />}
                    {PAGO_STATUS_CONFIG[s].label}
                  </button>
                ))}
                <div className="my-1 border-t border-border" />
                <button
                  onClick={() => {
                    onToggleAction(line.id)
                    onToggleDeco(line.id)
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                >
                  Aplicar decomisión
                </button>
              </div>
            )}

            {/* Inline decomisión */}
            {decoLineId === line.id && (
              <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border border-border bg-card p-3 shadow-lg space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Decomisión</p>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={decoAmount}
                  onChange={(e) => onDecoAmountChange(e.target.value)}
                  className={inputClass}
                  placeholder="0.00"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onDecoSubmit(line.id)}>
                    Aplicar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onToggleDeco(line.id)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </td>
      )}
    </tr>
  )
}
