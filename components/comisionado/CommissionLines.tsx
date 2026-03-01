'use client'

import { useState, useEffect, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Search, ChevronLeft, ChevronRight, Coins,
  CheckCircle, Ban, Clock, ShieldAlert,
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

const STATUS_ICONS: Record<PagoStatus, React.ReactNode> = {
  pagado: <CheckCircle className="h-3 w-3 text-green-400" />,
  pendiente: <Clock className="h-3 w-3 text-amber-400" />,
  anulado: <Ban className="h-3 w-3 text-red-400" />,
  retenido: <ShieldAlert className="h-3 w-3 text-orange-400" />,
}

interface CommissionLinesProps {
  initialData: CommissionLineListResult
  isAdmin: boolean
}

export function CommissionLines({ initialData, isAdmin }: CommissionLinesProps) {
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [statusFilter, setStatusFilter] = useState<PagoStatus | ''>(
    (searchParams.get('status_pago') as PagoStatus) ?? ''
  )
  const [editingLineId, setEditingLineId] = useState<number | null>(null)
  const [decoAmount, setDecoAmount] = useState('')

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)

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
      setEditingLineId(null)
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <p className="text-sm text-muted-foreground">
        {data.total} linea{data.total !== 1 ? 's' : ''} de comision
      </p>

      {/* Busqueda */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por titular, CUPS o comercial..."
          className={`${inputClass} pl-9`}
        />
      </div>

      {/* Chips de estado */}
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
          return (
            <Badge
              key={status}
              variant="outline"
              className={cn(
                'cursor-pointer transition-colors',
                statusFilter === status ? config.color : 'hover:bg-accent'
              )}
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
            >
              {config.label}
            </Badge>
          )
        })}
      </div>

      {/* Tabla desktop */}
      {data.lines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Coins className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No hay lineas de comision</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                      <th className="px-4 py-3">Contrato</th>
                      <th className="px-4 py-3">Comercial</th>
                      {isAdmin && <th className="px-4 py-3">GNE / Estado</th>}
                      <th className="px-4 py-3">Pagada / Deco.</th>
                      <th className="px-4 py-3">Estado pago</th>
                      <th className="px-4 py-3">Fecha</th>
                      {isAdmin && <th className="px-4 py-3 w-32">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map(line => (
                      <DesktopRow
                        key={line.id}
                        line={line}
                        isAdmin={isAdmin}
                        isEditing={editingLineId === line.id}
                        decoAmount={decoAmount}
                        onStatusChange={handleStatusChange}
                        onStartDeco={() => {
                          setEditingLineId(line.id)
                          setDecoAmount(String(line.decomission || ''))
                        }}
                        onDecoAmountChange={setDecoAmount}
                        onDecoSubmit={() => handleDecomission(line.id)}
                        onCancelDeco={() => { setEditingLineId(null); setDecoAmount('') }}
                        formatCurrency={formatCurrency}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {data.lines.map(line => (
              <MobileCard
                key={line.id}
                line={line}
                isAdmin={isAdmin}
                isEditing={editingLineId === line.id}
                decoAmount={decoAmount}
                onStatusChange={handleStatusChange}
                onStartDeco={() => {
                  setEditingLineId(line.id)
                  setDecoAmount(String(line.decomission || ''))
                }}
                onDecoAmountChange={setDecoAmount}
                onDecoSubmit={() => handleDecomission(line.id)}
                onCancelDeco={() => { setEditingLineId(null); setDecoAmount('') }}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        </>
      )}

      {/* Paginacion */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {data.page} de {data.totalPages}
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

// ── Desktop row ──────────────────────────────────────────────────────────────

interface RowProps {
  line: CommissionLineItem
  isAdmin: boolean
  isEditing: boolean
  decoAmount: string
  onStatusChange: (id: number, status: PagoStatus) => void
  onStartDeco: () => void
  onDecoAmountChange: (val: string) => void
  onDecoSubmit: () => void
  onCancelDeco: () => void
  formatCurrency: (n: number) => string
}

function DesktopRow({
  line, isAdmin, isEditing, decoAmount,
  onStatusChange, onStartDeco, onDecoAmountChange, onDecoSubmit, onCancelDeco,
  formatCurrency,
}: RowProps) {
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
        <td className="px-4 py-3">
          <div className="font-medium text-foreground">{formatCurrency(line.commission_gnew)}</div>
          <Badge variant="outline" className={`${gnewConfig.color} text-[10px] mt-0.5`}>
            {gnewConfig.label}
          </Badge>
        </td>
      )}
      <td className="px-4 py-3">
        <div className="font-medium text-foreground">{formatCurrency(line.commission_paid)}</div>
        {isEditing ? (
          <div className="flex items-center gap-1 mt-1">
            <input
              type="number"
              step="0.01"
              min="0"
              value={decoAmount}
              onChange={(e) => onDecoAmountChange(e.target.value)}
              className="h-6 w-20 rounded border border-primary/40 bg-background px-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') onDecoSubmit()
                if (e.key === 'Escape') onCancelDeco()
              }}
            />
            <button onClick={onDecoSubmit} className="text-green-400 hover:text-green-300 text-xs">OK</button>
            <button onClick={onCancelDeco} className="text-muted-foreground hover:text-foreground text-xs">X</button>
          </div>
        ) : (
          <button
            onClick={isAdmin ? onStartDeco : undefined}
            className={cn(
              'text-xs text-muted-foreground',
              isAdmin && 'hover:text-primary cursor-pointer'
            )}
            disabled={!isAdmin}
          >
            Deco: {line.decomission > 0 ? formatCurrency(line.decomission) : '—'}
          </button>
        )}
      </td>
      <td className="px-4 py-3">
        {isAdmin ? (
          <select
            value={line.status_pago}
            onChange={e => onStatusChange(line.id, e.target.value as PagoStatus)}
            className="h-7 rounded border border-border bg-background px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {PAGO_STATUSES.map(s => (
              <option key={s} value={s}>{PAGO_STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        ) : (
          <Badge variant="outline" className={pagoConfig.color}>
            {pagoConfig.label}
          </Badge>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {line.fecha_pago ?? '—'}
      </td>
      {isAdmin && (
        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate" title={line.notes ?? ''}>
          {line.notes ?? '—'}
        </td>
      )}
    </tr>
  )
}

// ── Mobile card ──────────────────────────────────────────────────────────────

function MobileCard({
  line, isAdmin, isEditing, decoAmount,
  onStatusChange, onStartDeco, onDecoAmountChange, onDecoSubmit, onCancelDeco,
  formatCurrency,
}: RowProps) {
  const pagoConfig = PAGO_STATUS_CONFIG[line.status_pago]
  const cupsShort = line.cups
    ? `${line.cups.slice(0, 10)}...${line.cups.slice(-4)}`
    : '—'

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-medium text-sm">{line.titular_contrato || '(sin titular)'}</div>
            <div className="text-xs font-mono text-muted-foreground">{cupsShort}</div>
          </div>
          <Badge variant="outline" className={pagoConfig.color}>
            {pagoConfig.label}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground block">Comercial</span>
            <span className="font-medium">{line.user_name}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Comision pagada</span>
            <span className="font-medium">{formatCurrency(line.commission_paid)}</span>
          </div>
          {isAdmin && (
            <div>
              <span className="text-muted-foreground block">Comision GNE</span>
              <span className="font-medium">{formatCurrency(line.commission_gnew)}</span>
            </div>
          )}
          <div>
            <span className="text-muted-foreground block">Decomision</span>
            {isEditing ? (
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={decoAmount}
                  onChange={(e) => onDecoAmountChange(e.target.value)}
                  className="h-6 w-20 rounded border border-primary/40 bg-background px-1.5 text-xs font-mono"
                  autoFocus
                />
                <button onClick={onDecoSubmit} className="text-green-400 text-xs">OK</button>
                <button onClick={onCancelDeco} className="text-muted-foreground text-xs">X</button>
              </div>
            ) : (
              <button
                onClick={isAdmin ? onStartDeco : undefined}
                className={cn('font-medium', isAdmin && 'hover:text-primary cursor-pointer')}
                disabled={!isAdmin}
              >
                {line.decomission > 0 ? formatCurrency(line.decomission) : '—'}
              </button>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="flex gap-1 pt-1">
            {PAGO_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => onStatusChange(line.id, s)}
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
                  line.status_pago === s
                    ? 'bg-primary/20 text-primary'
                    : 'hover:bg-accent text-muted-foreground'
                )}
              >
                {STATUS_ICONS[s]}
                {PAGO_STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
