'use client'

import { useState, useMemo } from 'react'
import { Search, Mail } from 'lucide-react'
import type { BrevoCampaign } from '@/lib/brevo'

interface EmailListProps {
  campaigns: BrevoCampaign[]
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function EmailList({ campaigns }: EmailListProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return campaigns
    const q = search.toLowerCase()
    return campaigns.filter(
      (c) =>
        c.subject.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q)
    )
  }, [campaigns, search])

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Search bar */}
      <div className="flex items-center border-b border-border p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por asunto o nombre de campaña..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Results count */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/20">
        <p className="text-xs text-muted-foreground">
          {filtered.length} campaña{filtered.length !== 1 ? 's' : ''}
          {search && ' encontradas'}
        </p>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Mail className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {campaigns.length === 0
              ? 'No hay campañas enviadas'
              : 'No se encontraron campañas'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {campaigns.length === 0
              ? 'Las campañas enviadas desde Brevo aparecerán aquí'
              : 'Prueba con otros términos de búsqueda'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((campaign) => (
            <li key={campaign.id}>
              <a
                href={campaign.shareLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-muted/40 transition-colors block"
              >
                {/* Unread dot */}
                <div className="shrink-0 pt-1.5 w-2">
                  {!campaign.opened && (
                    <span className="block h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug truncate text-foreground ${campaign.opened ? 'font-medium' : 'font-semibold'}`}>
                    {campaign.subject}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {campaign.name}
                  </p>
                </div>

                {/* Date */}
                <div className="shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {formatDateShort(campaign.sentDate)}
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
