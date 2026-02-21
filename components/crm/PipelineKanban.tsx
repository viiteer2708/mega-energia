'use client'

import { type LucideIcon, Zap, Building2, Home, Flame, Euro, Calendar, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Oportunidad, OportunidadEtapa } from '@/lib/types'

const ETAPAS: { value: OportunidadEtapa; label: string; color: string }[] = [
  { value: 'prospecto',    label: 'Prospecto',    color: 'border-slate-500/30 text-slate-400' },
  { value: 'contactado',   label: 'Contactado',   color: 'border-blue-500/30 text-blue-400' },
  { value: 'propuesta',    label: 'Propuesta',    color: 'border-amber-500/30 text-amber-400' },
  { value: 'negociacion',  label: 'Negociación',  color: 'border-orange-500/30 text-orange-400' },
  { value: 'ganado',       label: 'Ganado',       color: 'border-emerald-500/30 text-emerald-400' },
  { value: 'perdido',      label: 'Perdido',      color: 'border-red-500/30 text-red-400' },
]

const productoConfig: Record<string, { label: string; icon: LucideIcon }> = {
  luz_hogar:    { label: 'Luz Hogar',    icon: Home },
  luz_empresa:  { label: 'Luz Empresa',  icon: Building2 },
  gas_hogar:    { label: 'Gas Hogar',    icon: Flame },
  gas_empresa:  { label: 'Gas Empresa',  icon: Flame },
  dual:         { label: 'Dual',         icon: Zap },
}

const prioridadColor: Record<string, string> = {
  alta:  'bg-red-400/10 text-red-400 border-red-400/30',
  media: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
  baja:  'bg-muted text-muted-foreground border-border',
}

function isOverdue(fecha?: string): boolean {
  if (!fecha) return false
  return new Date(fecha) < new Date()
}

interface OportunidadCardProps {
  op: Oportunidad
}

function OportunidadCard({ op }: OportunidadCardProps) {
  const producto = productoConfig[op.tipo_producto]
  const ProductoIcon = producto.icon
  const overdue = isOverdue(op.fecha_seguimiento)

  return (
    <div className="rounded-lg border border-border bg-card/80 p-3 space-y-2 hover:border-primary/20 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ProductoIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{producto.label}</span>
        </div>
        <span className={cn(
          'shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
          prioridadColor[op.prioridad]
        )}>
          {op.prioridad}
        </span>
      </div>

      {/* Client */}
      <div>
        <p className="text-xs font-semibold text-foreground leading-tight">{op.cliente_nombre}</p>
        {op.cliente_empresa && (
          <p className="text-[10px] text-muted-foreground truncate">{op.cliente_empresa}</p>
        )}
      </div>

      {/* Value */}
      <div className="flex items-center gap-1 text-xs font-semibold text-primary">
        <Euro className="h-3 w-3" />
        {op.valor_estimado.toLocaleString('es-ES')} €/año
      </div>

      {/* Follow-up date */}
      {op.fecha_seguimiento && (
        <div className={cn(
          'flex items-center gap-1 text-[10px]',
          overdue ? 'text-red-400' : 'text-muted-foreground'
        )}>
          {overdue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
          {overdue ? 'Vencido · ' : ''}
          {new Date(op.fecha_seguimiento).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
        </div>
      )}

      {/* Notes */}
      {op.notas && (
        <p className="text-[10px] text-muted-foreground line-clamp-2 border-t border-border/50 pt-2">
          {op.notas}
        </p>
      )}
    </div>
  )
}

interface PipelineKanbanProps {
  oportunidades: Oportunidad[]
}

export function PipelineKanban({ oportunidades }: PipelineKanbanProps) {
  const activeStages = ETAPAS.filter(e => e.value !== 'perdido' && e.value !== 'ganado')
  const closedStages = ETAPAS.filter(e => e.value === 'ganado' || e.value === 'perdido')

  const valorPipeline = oportunidades
    .filter(o => !['ganado', 'perdido'].includes(o.etapa))
    .reduce((s, o) => s + o.valor_estimado, 0)

  return (
    <div className="space-y-4">
      {/* Pipeline value summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Pipeline activo: <span className="font-semibold text-primary">{valorPipeline.toLocaleString('es-ES')} € ahorro/año estimado</span>
        </p>
      </div>

      {/* Active pipeline */}
      <div className="overflow-x-auto pb-3">
        <div className="flex gap-3 min-w-max">
          {activeStages.map(etapa => {
            const ops = oportunidades.filter(o => o.etapa === etapa.value)
            const valorEtapa = ops.reduce((s, o) => s + o.valor_estimado, 0)
            return (
              <div key={etapa.value} className="w-52 shrink-0">
                {/* Column header */}
                <div className={cn(
                  'mb-2.5 rounded-lg border px-3 py-2',
                  etapa.color.includes('border')
                    ? etapa.color.split(' ')[0] + ' bg-card'
                    : 'border-border bg-card'
                )}>
                  <div className="flex items-center justify-between">
                    <span className={cn('text-xs font-semibold', etapa.color.split(' ').find(c => c.startsWith('text-')))}>
                      {etapa.label}
                    </span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {ops.length}
                    </span>
                  </div>
                  {valorEtapa > 0 && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{valorEtapa.toLocaleString('es-ES')} €</p>
                  )}
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {ops.map(op => <OportunidadCard key={op.id} op={op} />)}
                  {ops.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border/40 py-6 text-center">
                      <p className="text-[10px] text-muted-foreground/50">Vacío</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Closed deals */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Cerrados</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {closedStages.map(etapa => {
            const ops = oportunidades.filter(o => o.etapa === etapa.value)
            const valorEtapa = ops.reduce((s, o) => s + o.valor_estimado, 0)
            return (
              <div key={etapa.value} className="w-52 shrink-0">
                <div className={cn(
                  'mb-2.5 rounded-lg border px-3 py-2',
                  etapa.value === 'ganado'
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-red-500/30 bg-red-500/5'
                )}>
                  <div className="flex items-center justify-between">
                    <span className={cn('text-xs font-semibold', etapa.color.split(' ').find(c => c.startsWith('text-')))}>
                      {etapa.label}
                    </span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {ops.length}
                    </span>
                  </div>
                  {valorEtapa > 0 && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{valorEtapa.toLocaleString('es-ES')} €</p>
                  )}
                </div>
                <div className="space-y-2">
                  {ops.map(op => <OportunidadCard key={op.id} op={op} />)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
