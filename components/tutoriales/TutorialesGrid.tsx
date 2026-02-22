'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { TutorialCard } from './TutorialCard'
import { TutorialModal } from './TutorialModal'
import { cn } from '@/lib/utils'
import type { Tutorial, TutorialCategoria, TutorialFormato, TutorialNivel } from '@/lib/types'

const CATEGORIAS: { value: TutorialCategoria | 'todos'; label: string; emoji: string }[] = [
  { value: 'todos',        label: 'Todos',        emoji: '📚' },
  { value: 'ventas',       label: 'Ventas',       emoji: '🎯' },
  { value: 'producto',     label: 'Producto',     emoji: '📦' },
  { value: 'tecnico',      label: 'Técnico',      emoji: '⚡' },
  { value: 'herramientas', label: 'Herramientas', emoji: '🛠️' },
  { value: 'normativa',    label: 'Normativa',    emoji: '⚖️' },
]

const FORMATOS: { value: TutorialFormato | 'todos'; label: string }[] = [
  { value: 'todos',    label: 'Todos' },
  { value: 'video',    label: 'Video' },
  { value: 'articulo', label: 'Artículo' },
  { value: 'webinar',  label: 'Webinar' },
]

const NIVELES: { value: TutorialNivel | 'todos'; label: string }[] = [
  { value: 'todos',      label: 'Todos' },
  { value: 'básico',     label: 'Básico' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado',   label: 'Avanzado' },
]

interface TutorialesGridProps {
  tutoriales: Tutorial[]
}

export function TutorialesGrid({ tutoriales }: TutorialesGridProps) {
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState<TutorialCategoria | 'todos'>('todos')
  const [formato, setFormato] = useState<TutorialFormato | 'todos'>('todos')
  const [nivel, setNivel] = useState<TutorialNivel | 'todos'>('todos')
  const [selected, setSelected] = useState<Tutorial | null>(null)

  const filtered = useMemo(() => {
    return tutoriales.filter(t => {
      const matchSearch = !search ||
        t.titulo.toLowerCase().includes(search.toLowerCase()) ||
        t.descripcion.toLowerCase().includes(search.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      const matchCat = categoria === 'todos' || t.categoria === categoria
      const matchFmt = formato === 'todos' || t.formato === formato
      const matchNiv = nivel === 'todos' || t.nivel === nivel
      return matchSearch && matchCat && matchFmt && matchNiv
    })
  }, [tutoriales, search, categoria, formato, nivel])

  return (
    <>
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar tutoriales, temas, tags..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
          />
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
                  ? tutoriales.length
                  : tutoriales.filter(t => t.categoria === cat.value).length}
              </span>
            </button>
          ))}
        </div>

        {/* Format + Level filters */}
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">Formato:</span>
            <div className="flex gap-1">
              {FORMATOS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFormato(f.value)}
                  className={cn(
                    'rounded-md border px-2.5 py-1 font-medium transition-all',
                    formato === f.value
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-accent/50'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">Nivel:</span>
            <div className="flex gap-1">
              {NIVELES.map(n => (
                <button
                  key={n.value}
                  onClick={() => setNivel(n.value)}
                  className={cn(
                    'rounded-md border px-2.5 py-1 font-medium transition-all',
                    nivel === n.value
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-accent/50'
                  )}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <p className="text-xs text-muted-foreground">
          {filtered.length} tutorial{filtered.length !== 1 ? 'es' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </p>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No se encontraron tutoriales</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map(t => (
              <TutorialCard key={t.id} tutorial={t} onClick={setSelected} />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <TutorialModal tutorial={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
