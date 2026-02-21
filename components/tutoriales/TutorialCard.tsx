'use client'

import { type LucideIcon, Play, FileText, Radio, Clock, Eye, Star, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tutorial } from '@/lib/types'

const formatoConfig: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  video: { icon: Play, label: 'Video', color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
  articulo: { icon: FileText, label: 'Artículo', color: 'text-green-400 border-green-400/30 bg-green-400/10' },
  webinar: { icon: Radio, label: 'Webinar', color: 'text-purple-400 border-purple-400/30 bg-purple-400/10' },
}

const nivelConfig = {
  básico: { label: 'Básico', color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  intermedio: { label: 'Intermedio', color: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
  avanzado: { label: 'Avanzado', color: 'text-red-400 border-red-400/30 bg-red-400/10' },
}

const categoriaEmojis: Record<string, string> = {
  ventas: '🎯',
  tecnico: '⚡',
  herramientas: '🛠️',
  normativa: '⚖️',
  producto: '📦',
}

interface TutorialCardProps {
  tutorial: Tutorial
  onClick: (tutorial: Tutorial) => void
}

export function TutorialCard({ tutorial, onClick }: TutorialCardProps) {
  const formato = formatoConfig[tutorial.formato]
  const nivel = nivelConfig[tutorial.nivel]
  const FormatoIcon = formato.icon

  return (
    <button
      onClick={() => onClick(tutorial)}
      className="group w-full text-left rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Header badges */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn(
            'flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            formato.color
          )}>
            <FormatoIcon className="h-2.5 w-2.5" />
            {formato.label}
          </span>
          <span className={cn(
            'rounded-md border px-2 py-0.5 text-[10px] font-semibold',
            nivel.color
          )}>
            {nivel.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {tutorial.nuevo && (
            <span className="flex items-center gap-0.5 rounded-full bg-primary/15 border border-primary/30 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              <Sparkles className="h-2.5 w-2.5" />
              NUEVO
            </span>
          )}
          {tutorial.destacado && !tutorial.nuevo && (
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          )}
        </div>
      </div>

      {/* Category */}
      <div className="mb-2 text-xs text-muted-foreground">
        <span>{categoriaEmojis[tutorial.categoria]}</span>{' '}
        <span className="capitalize">{tutorial.categoria}</span>
      </div>

      {/* Title */}
      <h3 className="mb-1.5 text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
        {tutorial.titulo}
      </h3>

      {/* Description */}
      <p className="mb-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
        {tutorial.descripcion}
      </p>

      {/* Tags */}
      {tutorial.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {tutorial.tags.slice(0, 3).map(tag => (
            <span key={tag} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {tutorial.duracion_min} min
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {tutorial.vistas.toLocaleString('es-ES')}
          </span>
        </div>
        <span className="truncate text-right">{tutorial.autor}</span>
      </div>
    </button>
  )
}
