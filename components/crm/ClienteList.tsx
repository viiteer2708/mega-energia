'use client'

import { useState, useMemo } from 'react'
import { type LucideIcon, Search, Building2, Home, Wrench, Phone, Mail, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Cliente, ClienteEstado, ClienteTipo } from '@/lib/types'

const estadoConfig: Record<ClienteEstado, { label: string; color: string }> = {
  activo:    { label: 'Activo',    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
  prospecto: { label: 'Prospecto', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
  inactivo:  { label: 'Inactivo',  color: 'text-muted-foreground bg-muted/50 border-border' },
  baja:      { label: 'Baja',      color: 'text-red-400 bg-red-400/10 border-red-400/30' },
}

const tipoIcon: Record<ClienteTipo, LucideIcon> = {
  empresa:  Building2,
  hogar:    Home,
  autonomo: Wrench,
}

const ESTADOS: { value: ClienteEstado | 'todos'; label: string }[] = [
  { value: 'todos',     label: 'Todos' },
  { value: 'activo',    label: 'Activos' },
  { value: 'prospecto', label: 'Prospectos' },
  { value: 'inactivo',  label: 'Inactivos' },
]

interface ClienteListProps {
  clientes: Cliente[]
}

export function ClienteList({ clientes }: ClienteListProps) {
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState<ClienteEstado | 'todos'>('todos')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return clientes.filter(c => {
      const matchSearch = !search ||
        c.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (c.empresa?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        c.email.toLowerCase().includes(search.toLowerCase())
      const matchEstado = estado === 'todos' || c.estado === estado
      return matchSearch && matchEstado
    })
  }, [clientes, search, estado])

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar cliente, empresa, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
          />
        </div>
        <div className="flex gap-1">
          {ESTADOS.map(e => (
            <button
              key={e.value}
              onClick={() => setEstado(e.value)}
              className={cn(
                'rounded-lg border px-3 py-2 text-xs font-medium transition-all whitespace-nowrap',
                estado === e.value
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent/50'
              )}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</p>

      {/* List */}
      <div className="space-y-1.5">
        {filtered.map(cliente => {
          const TipoIcon = tipoIcon[cliente.tipo]
          const cfg = estadoConfig[cliente.estado]
          const isExpanded = expanded === cliente.id
          return (
            <div
              key={cliente.id}
              className={cn(
                'rounded-xl border bg-card transition-all duration-200',
                isExpanded ? 'border-primary/30 shadow-md shadow-primary/5' : 'border-border'
              )}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : cliente.id)}
                className="flex w-full items-center gap-3 p-3 text-left"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
                  <TipoIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{cliente.nombre}</p>
                    {cliente.empresa && (
                      <p className="truncate text-xs text-muted-foreground hidden sm:block">· {cliente.empresa}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn(
                      'rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                      cfg.color
                    )}>
                      {cfg.label}
                    </span>
                    {cliente.contratos_gne > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {cliente.contratos_gne} contrato{cliente.contratos_gne !== 1 ? 's' : ''} GNE
                      </span>
                    )}
                  </div>
                </div>
                {cliente.comision && (
                  <div className="shrink-0 text-right hidden sm:block">
                    <p className="text-sm font-semibold text-emerald-400">{cliente.comision.toLocaleString('es-ES')} €</p>
                    <p className="text-[10px] text-muted-foreground">comisión</p>
                  </div>
                )}
                <ChevronRight className={cn(
                  'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                  isExpanded && 'rotate-90'
                )} />
              </button>

              {isExpanded && (
                <div className="border-t border-border/50 px-4 pb-4 pt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <a href={`mailto:${cliente.email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Mail className="h-3.5 w-3.5 text-primary/60" />
                    {cliente.email}
                  </a>
                  <a href={`tel:${cliente.telefono}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Phone className="h-3.5 w-3.5 text-primary/60" />
                    {cliente.telefono}
                  </a>
                  {cliente.comercializadora_actual && (
                    <div className="text-xs text-muted-foreground">
                      <span className="text-foreground/60">Comercializadora: </span>
                      {cliente.comercializadora_actual}
                    </div>
                  )}
                  {cliente.nif && (
                    <div className="text-xs text-muted-foreground">
                      <span className="text-foreground/60">NIF: </span>
                      {cliente.nif}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    <span className="text-foreground/60">Última actividad: </span>
                    {new Date(cliente.ultima_actividad).toLocaleDateString('es-ES')}
                  </div>
                  {cliente.cups_count > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="text-foreground/60">CUPS: </span>
                      {cliente.cups_count} punto{cliente.cups_count !== 1 ? 's' : ''} de suministro
                    </div>
                  )}
                  {cliente.etiquetas && (
                    <div className="col-span-full flex flex-wrap gap-1 mt-1">
                      {cliente.etiquetas.map(e => (
                        <span key={e} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground capitalize">{e}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
