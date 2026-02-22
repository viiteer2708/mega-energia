'use client'

import { X, Paperclip, Users, Clock, MailOpen } from 'lucide-react'
import { TipoBadge, EstadoBadge } from './EmailBadge'
import type { Comunicado } from '@/lib/types'

interface EmailDetailModalProps {
  email: Comunicado | null
  onClose: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function EmailDetailModal({ email, onClose }: EmailDetailModalProps) {
  if (!email) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-card border-l border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <TipoBadge tipo={email.tipo} />
              <EstadoBadge estado={email.estado} />
            </div>
            <h2 className="text-base font-semibold text-foreground leading-snug">
              {email.asunto}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Metadata */}
        <div className="border-b border-border px-6 py-4 space-y-3">
          {/* Destinatarios */}
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-wrap gap-2">
              {email.destinatarios.map((d) => (
                <div key={d.email} className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{d.nombre}</span>
                  <span className="text-xs text-muted-foreground">{d.email}</span>
                  {d.empresa && (
                    <span className="text-xs text-muted-foreground">{d.empresa}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Fechas */}
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Enviado el{' '}
              <span className="text-foreground font-medium">
                {formatDate(email.fecha_envio)}
              </span>
            </span>
          </div>

          {email.fecha_apertura && (
            <div className="flex items-center gap-3">
              <MailOpen className="h-4 w-4 shrink-0 text-emerald-400" />
              <span className="text-sm text-muted-foreground">
                Abierto el{' '}
                <span className="text-emerald-400 font-medium">
                  {formatDate(email.fecha_apertura)}
                </span>
              </span>
            </div>
          )}

          {/* Adjuntos */}
          {email.adjuntos && email.adjuntos.length > 0 && (
            <div className="flex items-start gap-3">
              <Paperclip className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex flex-wrap gap-2">
                {email.adjuntos.map((adj) => (
                  <span
                    key={adj}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs text-muted-foreground"
                  >
                    <Paperclip className="h-2.5 w-2.5" />
                    {adj}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="prose prose-sm prose-invert max-w-none">
            {email.cuerpo.split('\n').map((line, i) => {
              if (line.startsWith('**') && line.endsWith('**')) {
                return (
                  <p key={i} className="font-semibold text-foreground mt-4 mb-1">
                    {line.slice(2, -2)}
                  </p>
                )
              }
              if (line.startsWith('- ')) {
                return (
                  <li key={i} className="text-sm text-muted-foreground ml-4 list-disc">
                    {line.slice(2)}
                  </li>
                )
              }
              if (line === '') {
                return <div key={i} className="h-3" />
              }
              return (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                  {line}
                </p>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
