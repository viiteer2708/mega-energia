'use client'

import { useState, useActionState } from 'react'
import { Building2, Plus, Search, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createEnergyCompany } from '@/app/(app)/comisionado/actions'
import type { EnergyCompany } from '@/lib/types'

const inputClass =
  'flex h-8 w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

interface CompanySidebarProps {
  companies: EnergyCompany[]
  selectedId: number | null
  onSelect: (id: number) => void
}

export function CompanySidebar({ companies, selectedId, onSelect }: CompanySidebarProps) {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createState, createAction, isCreating] = useActionState(createEnergyCompany, null)

  const filtered = companies.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full border-r border-border bg-card/30">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Comercializadoras
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => setShowCreate(!showCreate)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className={`${inputClass} pl-7`}
          />
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="p-3 border-b border-border bg-primary/5">
          <form action={createAction} className="space-y-2">
            <input
              name="name"
              required
              placeholder="Nombre"
              className={inputClass}
            />
            <select name="commission_model" className={inputClass}>
              <option value="table">Tabla</option>
              <option value="formula">Formula</option>
            </select>
            <input
              name="gnew_margin_pct"
              type="number"
              step="0.0001"
              defaultValue="0"
              placeholder="Margen %"
              className={inputClass}
            />
            <div className="flex gap-1">
              <Button type="submit" size="sm" className="h-7 text-xs flex-1" disabled={isCreating}>
                {isCreating ? '...' : 'Crear'}
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowCreate(false)}>
                X
              </Button>
            </div>
            {createState && !createState.ok && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {createState.error}
              </p>
            )}
            {createState?.ok && (
              <p className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Creada
              </p>
            )}
          </form>
        </div>
      )}

      {/* Company list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground text-center">
            {search ? 'Sin resultados' : 'Sin comercializadoras'}
          </p>
        ) : (
          filtered.map(company => (
            <button
              key={company.id}
              onClick={() => onSelect(company.id)}
              className={cn(
                'w-full text-left px-3 py-2.5 border-b border-border/30 transition-all',
                selectedId === company.id
                  ? 'bg-primary/10 border-l-2 border-l-primary'
                  : 'hover:bg-accent/30'
              )}
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-semibold text-sm text-foreground truncate">
                  {company.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 ml-5.5">
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                  {company.commission_model === 'table' ? 'Tabla' : 'Formula'}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {(company.gnew_margin_pct * 100).toFixed(1)}%
                </span>
                {!company.active && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-red-400 border-red-500/30">
                    Off
                  </Badge>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
