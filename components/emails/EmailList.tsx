'use client'

import { useState, useMemo } from 'react'
import { Search, Filter, ChevronRight, Users, Paperclip } from 'lucide-react'
import { TipoBadge, EstadoBadge } from './EmailBadge'
import { EmailDetailModal } from './EmailDetailModal'
import { cn } from '@/lib/utils'
import type { Comunicado, EmailTipo, EmailEstado } from '@/lib/types'

interface EmailListProps {
  comunicados: Comunicado[]
}

const TIPOS: { value: EmailTipo | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'propuesta', label: 'Propuestas' },
  { value: 'seguimiento', label: 'Seguimientos' },
  { value: 'bienvenida', label: 'Bienvenidas' },
  { value: 'renovacion', label: 'Renovaciones' },
  { value: 'informativo', label: 'Informativos' },
  { value: 'promocion', label: 'Promociones' },
]

const ESTADOS: { value: EmailEstado | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'abierto', label: 'Abierto' },
  { value: 'respondido', label: 'Respondido' },
  { value: 'rebotado', label: 'Rebotado' },
]

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function EmailList({ comunicados }: EmailListProps) {
  const [search, setSearch] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<EmailTipo | 'todos'>('todos')
  const [estadoFiltro, setEstadoFiltro] = useState<EmailEstado | 'todos'>('todos')
  const [selected, setSelected] = useState<Comunicado | null>(null)

  const filtered = useMemo(() => {
    return comunicados.filter((c) => {
      const matchSearch =
        !search ||
        c.asunto.toLowerCase().includes(search.toLowerCase()) ||
        c.destinatarios.some(
          (d) =>
            d.nombre.toLowerCase().includes(search.toLowerCase()) ||
            d.empresa?.toLowerCase().includes(search.toLowerCase()) ||
            d.email.toLowerCase().includes(search.toLowerCase())
        )
      const matchTipo = tipoFiltro === 'todos' || c.tipo === tipoFiltro
      const matchEstado = estadoFiltro === 'todos' || c.estado === estadoFiltro
      return matchSearch && matchTipo && matchEstado
    })
  }, [comunicados, search, tipoFiltro, estadoFiltro])

  return (
    <>
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {/* Filters bar */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por asunto, cliente o empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Tipo filter */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value as EmailTipo | 'todos')}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value as EmailEstado | 'todos')}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer"
            >
              {ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="px-4 py-2.5 border-b border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            {filtered.length} comunicado{filtered.length !== 1 ? 's' : ''}
            {(tipoFiltro !== 'todos' || estadoFiltro !== 'todos' || search) && ' encontrados'}
          </p>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No se encontraron comunicados
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Prueba con otros filtros o términos de búsqueda
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((email) => {
              const isUnread = email.estado === 'enviado'
              return (
                <li key={email.id}>
                  <button
                    onClick={() => setSelected(email)}
                    className={cn(
                      'w-full text-left px-5 py-4 transition-colors hover:bg-accent/40 flex items-start gap-4 group',
                      isUnread && 'bg-primary/3'
                    )}
                  >
                    {/* Unread indicator */}
                    <div className="mt-2 shrink-0">
                      <span
                        className={cn(
                          'block h-2 w-2 rounded-full',
                          email.estado === 'respondido' ? 'bg-emerald-400' :
                          email.estado === 'abierto' ? 'bg-blue-400' :
                          email.estado === 'rebotado' ? 'bg-red-400' :
                          'bg-muted'
                        )}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <TipoBadge tipo={email.tipo} />
                        <EstadoBadge estado={email.estado} />
                        {email.adjuntos && email.adjuntos.length > 0 && (
                          <span className="text-muted-foreground">
                            <Paperclip className="h-3 w-3" />
                          </span>
                        )}
                      </div>

                      <p className={cn(
                        'text-sm leading-snug truncate',
                        isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground'
                      )}>
                        {email.asunto}
                      </p>

                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {email.destinatarios.map((d) => d.nombre).join(', ')}
                          {email.destinatarios[0]?.empresa && (
                            <> · {email.destinatarios[0].empresa}</>
                          )}
                          {email.destinatarios.length > 1 && (
                            <> y {email.destinatarios.length - 1} más</>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Date + arrow */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDateShort(email.fecha_envio)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Detail modal / slide-over */}
      <EmailDetailModal email={selected} onClose={() => setSelected(null)} />
    </>
  )
}
