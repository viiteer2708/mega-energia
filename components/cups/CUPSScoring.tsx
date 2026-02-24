'use client'

import { useState } from 'react'
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CUPSScoringProps {
  cups: string
  nif?: string
}

export function CUPSScoring({ cups, nif: initialNif }: CUPSScoringProps) {
  const [nif, setNif] = useState(initialNif ?? '')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!nif.trim()) return
    setLoading(true)
    setResultado(null)
    setError(null)

    try {
      const res = await fetch('/api/scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cups, nif: nif.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`)
      } else {
        setResultado(data.resultado)
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <ShieldCheck className="h-3.5 w-3.5" />
          Pre Scoring GRI
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={nif}
            onChange={(e) => setNif(e.target.value)}
            placeholder="NIF / CIF del titular"
            className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !nif.trim()}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Consultar Scoring'
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 p-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {resultado && (
          <div className="rounded-lg border border-primary/25 bg-primary/10 p-3">
            <p className="text-sm text-foreground font-medium">{resultado}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
