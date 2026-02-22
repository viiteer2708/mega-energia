'use client'

import { useState, useMemo } from 'react'
import { Search, Filter } from 'lucide-react'
import { MaterialCard } from './MaterialCard'
import { cn } from '@/lib/utils'
import type { Material, MaterialCategoria } from '@/lib/types'

const CATEGORIAS: { value: MaterialCategoria | 'todos'; label: string; emoji: string }[] = [
  { value: 'todos',           label: 'Todos',           emoji: '📁' },
  { value: 'tarifas',         label: 'Tarifas',         emoji: '⚡' },
  { value: 'contratos',       label: 'Contratos',       emoji: '📝' },
  { value: 'presentaciones',  label: 'Presentaciones',  emoji: '📊' },
  { value: 'formularios',     label: 'Formularios',     emoji: '📋' },
  { value: 'marketing',       label: 'Marketing',       emoji: '📣' },
  { value: 'normativa',       label: 'Normativa',       emoji: '⚖️' },
]

interface MaterialesGridProps {
  materiales: Material[]
  dropboxFolder?: string
}

export function MaterialesGrid({ materiales, dropboxFolder }: MaterialesGridProps) {
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState<MaterialCategoria | 'todos'>('todos')
  const [soloDestacados, setSoloDestacados] = useState(false)

  const filtered = useMemo(() => {
    return materiales.filter(m => {
      const matchSearch = !search ||
        m.titulo.toLowerCase().includes(search.toLowerCase()) ||
        m.descripcion.toLowerCase().includes(search.toLowerCase())
      const matchCat = categoria === 'todos' || m.categoria === categoria
      const matchDest = !soloDestacados || m.destacado
      return matchSearch && matchCat && matchDest
    })
  }, [materiales, search, categoria, soloDestacados])

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar materiales..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
          />
        </div>
        <button
          onClick={() => setSoloDestacados(v => !v)}
          className={cn(
            'shrink-0 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all',
            soloDestacados
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:bg-accent/50'
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          Destacados
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIAS.map(cat => (
          <button
            key={cat.value}
            onClick={() => setCategoria(cat.value)}
            className={cn(
              'shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap',
              categoria === cat.value
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-accent/50'
            )}
          >
            <span>{cat.emoji}</span>
            {cat.label}
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {cat.value === 'todos'
                ? materiales.length
                : materiales.filter(m => m.categoria === cat.value).length}
            </span>
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} material{filtered.length !== 1 ? 'es' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No se encontraron materiales</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(m => <MaterialCard key={m.id} material={m} dropboxFolder={dropboxFolder} />)}
        </div>
      )}
    </div>
  )
}
