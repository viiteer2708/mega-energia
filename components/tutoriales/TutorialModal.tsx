'use client'

import { useEffect } from 'react'
import { type LucideIcon, X, Play, FileText, Radio, Clock, Eye, Star, Tag, User, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tutorial } from '@/lib/types'

const formatoConfig: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  video: { icon: Play, label: 'Video', color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
  articulo: { icon: FileText, label: 'Artículo', color: 'text-green-400 border-green-400/30 bg-green-400/10' },
  webinar: { icon: Radio, label: 'Webinar', color: 'text-purple-400 border-purple-400/30 bg-purple-400/10' },
}

const nivelColor = {
  básico: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  intermedio: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  avanzado: 'text-red-400 border-red-400/30 bg-red-400/10',
}

interface TutorialModalProps {
  tutorial: Tutorial
  onClose: () => void
}

export function TutorialModal({ tutorial, onClose }: TutorialModalProps) {
  const formato = formatoConfig[tutorial.formato]
  const FormatoIcon = formato.icon

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          {/* Badges */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className={cn(
              'flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold',
              formato.color
            )}>
              <FormatoIcon className="h-3 w-3" />
              {formato.label}
            </span>
            <span className={cn(
              'rounded-md border px-2 py-0.5 text-xs font-semibold capitalize',
              nivelColor[tutorial.nivel]
            )}>
              {tutorial.nivel}
            </span>
            {tutorial.destacado && (
              <span className="flex items-center gap-1 text-xs text-amber-400">
                <Star className="h-3 w-3 fill-amber-400" /> Destacado
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="mb-3 text-lg font-bold text-foreground leading-snug">
            {tutorial.titulo}
          </h2>

          {/* Description */}
          <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
            {tutorial.descripcion}
          </p>

          {/* Meta info */}
          <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-border/50 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span><span className="font-semibold text-foreground">{tutorial.duracion_min}</span> minutos</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Eye className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span><span className="font-semibold text-foreground">{tutorial.vistas.toLocaleString('es-ES')}</span> vistas</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{tutorial.autor}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{new Date(tutorial.fecha_publicacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Tags */}
          {tutorial.tags.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-1.5">
              {tutorial.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* CTA placeholder */}
          <div className="flex items-center justify-center rounded-xl border border-dashed border-primary/30 bg-primary/5 py-6">
            <div className="text-center">
              <FormatoIcon className="mx-auto mb-2 h-8 w-8 text-primary/40" />
              <p className="text-sm font-medium text-muted-foreground">
                {tutorial.formato === 'video' ? 'Reproducción de video' :
                  tutorial.formato === 'webinar' ? 'Acceso al webinar' : 'Leer artículo'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Se conectará con la plataforma de formación
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
