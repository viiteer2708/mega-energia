'use client'

import { useState } from 'react'
import { Search, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const CUPS_REGEX = /^ES\d{16}[A-Z]{2}$/

interface CUPSSearchProps {
  onSearch: (cups: string) => Promise<void>
  loading: boolean
  error: string | null
}

export function CUPSSearch({ onSearch, loading, error }: CUPSSearchProps) {
  const [value, setValue] = useState('')

  const cups = value.trim().toUpperCase()
  const isValid = CUPS_REGEX.test(cups)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || loading) return
    await onSearch(cups)
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <h2 className="text-sm font-semibold text-foreground mb-1">
        Consultar punto de suministro
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Introduce el código CUPS para obtener los datos del suministro y el ahorro potencial con MEGA ENERGÍA.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ES0021000012345678AB"
            maxLength={22}
            className={cn(
              'w-full rounded-lg border bg-background py-2.5 pl-9 pr-4 font-mono text-sm uppercase tracking-wider text-foreground placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors',
              cups.length > 0 && !isValid
                ? 'border-red-500/50 focus:ring-red-500/30'
                : 'border-input focus:border-primary/50'
            )}
          />
          {cups.length > 0 && (
            <span className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold',
              isValid ? 'text-emerald-400' : 'text-muted-foreground'
            )}>
              {cups.length}/20
            </span>
          )}
        </div>
        <Button
          type="submit"
          disabled={!isValid || loading}
          className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5 font-semibold"
        >
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Consultando...</>
          ) : (
            'Consultar'
          )}
        </Button>
      </form>

      {/* Format hint */}
      <p className="mt-2 text-[11px] text-muted-foreground">
        Formato: <span className="font-mono text-foreground">ES</span> + 16 dígitos + 2 letras · Ej:{' '}
        <button
          type="button"
          className="font-mono text-primary hover:underline"
          onClick={() => setValue('ES0021000012345678AB')}
        >
          ES0021000012345678AB
        </button>
        {' '}·{' '}
        <button
          type="button"
          className="font-mono text-primary hover:underline"
          onClick={() => setValue('ES0031405000123456YZ')}
        >
          ES0031405000123456YZ
        </button>
      </p>

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
