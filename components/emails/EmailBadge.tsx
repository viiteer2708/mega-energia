import { cn } from '@/lib/utils'
import type { EmailTipo, EmailEstado } from '@/lib/types'

const tipoConfig: Record<EmailTipo, { label: string; className: string }> = {
  propuesta:   { label: 'Propuesta',   className: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  seguimiento: { label: 'Seguimiento', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' },
  bienvenida:  { label: 'Bienvenida',  className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  renovacion:  { label: 'Renovación',  className: 'bg-purple-500/15 text-purple-400 border-purple-500/25' },
  informativo: { label: 'Informativo', className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25' },
  promocion:   { label: 'Promoción',   className: 'bg-primary/15 text-primary border-primary/25' },
}

const estadoConfig: Record<EmailEstado, { label: string; dot: string; className: string }> = {
  enviado:    { label: 'Enviado',    dot: 'bg-zinc-400',    className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25' },
  abierto:    { label: 'Abierto',    dot: 'bg-blue-400',    className: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  respondido: { label: 'Respondido', dot: 'bg-emerald-400', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  rebotado:   { label: 'Rebotado',   dot: 'bg-red-400',     className: 'bg-red-500/15 text-red-400 border-red-500/25' },
}

export function TipoBadge({ tipo }: { tipo: EmailTipo }) {
  const cfg = tipoConfig[tipo]
  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold', cfg.className)}>
      {cfg.label}
    </span>
  )
}

export function EstadoBadge({ estado }: { estado: EmailEstado }) {
  const cfg = estadoConfig[estado]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold', cfg.className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}
