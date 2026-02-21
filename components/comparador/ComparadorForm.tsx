'use client'

import { useState, useRef } from 'react'
import { Calculator, Zap, Flame, Layers, Search, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ComparadorInputData, TipoSuministroComp } from '@/lib/types'

interface ComparadorFormProps {
  onComparar: (data: ComparadorInputData) => void
  loading: boolean
}

const TIPOS = [
  { value: 'electricidad', label: 'Electricidad', icon: Zap },
  { value: 'gas',          label: 'Gas',          icon: Flame },
  { value: 'dual',         label: 'Dual (luz+gas)', icon: Layers },
] as const

const CUPS_REGEX = /^ES\d{16}[A-Z]{2}$/

function inferTipo(tarifa: string | null): TipoSuministroComp {
  if (!tarifa) return 'electricidad'
  if (/^RL|^G[0-9]|gas/i.test(tarifa)) return 'gas'
  return 'electricidad'
}

export function ComparadorForm({ onComparar, loading }: ComparadorFormProps) {
  // CUPS lookup state
  const [cups, setCups]             = useState('')
  const [cupsLoading, setCupsLoading] = useState(false)
  const [cupsOk, setCupsOk]         = useState<string | null>(null)   // titular name
  const [cupsError, setCupsError]   = useState<string | null>(null)

  // Form fields
  const [tipo, setTipo]               = useState<TipoSuministroComp>('electricidad')
  const [consumo, setConsumo]         = useState('4800')
  const [potencia, setPotencia]       = useState('5.75')
  const [precioActual, setPrecioActual] = useState('0.145')
  const [tarifaActual, setTarifaActual] = useState('2.0TD')

  // Track which fields were filled by SIPS (to show badge)
  const [sipsFields, setSipsFields]   = useState<Set<string>>(new Set())

  const abortRef = useRef<AbortController | null>(null)

  async function lookupCUPS(rawCups: string) {
    const c = rawCups.trim().toUpperCase()
    if (!CUPS_REGEX.test(c)) return

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setCupsLoading(true)
    setCupsOk(null)
    setCupsError(null)

    try {
      const res = await fetch(`/api/cups/search?cups=${encodeURIComponent(c)}`, {
        signal: abortRef.current.signal,
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setCupsError(data.error ?? `Error ${res.status}`)
        return
      }

      // ── Auto-fill ──────────────────────────────────────────────────────
      const filled = new Set<string>()

      if (data.consumoAnual && data.consumoAnual > 0) {
        setConsumo(Math.round(data.consumoAnual).toString())
        filled.add('consumo')
      }

      if (data.potencias?.length) {
        // Use P1 value (highest billed period). Falls back to first available.
        const p1 = (data.potencias as { periodo: string; potencia: number }[])
          .find(p => p.periodo.toUpperCase() === 'P1') ?? data.potencias[0]
        setPotencia(p1.potencia.toFixed(3))
        filled.add('potencia')
      }

      if (data.tarifa) {
        setTarifaActual(data.tarifa)
        filled.add('tarifa')
        setTipo(inferTipo(data.tarifa))
        filled.add('tipo')
      }

      setSipsFields(filled)
      setCupsOk(data.titular ?? 'Suministro encontrado')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setCupsError('Error de conexión con la API SIPS')
      }
    } finally {
      setCupsLoading(false)
    }
  }

  function clearCUPS() {
    setCups('')
    setCupsOk(null)
    setCupsError(null)
    setSipsFields(new Set())
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onComparar({
      tipo,
      consumo_anual_kwh: parseFloat(consumo) || 0,
      consumo_p1_pct:   30,
      consumo_p2_pct:   45,
      consumo_p3_pct:   25,
      potencia_kw:      parseFloat(potencia) || 0,
      tarifa_actual:    tarifaActual,
      precio_actual_kwh: parseFloat(precioActual) || 0,
    })
  }

  const cupsValue = cups.trim().toUpperCase()
  const cupsIsValid = CUPS_REGEX.test(cupsValue)

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border/50 bg-card p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Datos del suministro</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Introduce el CUPS para cargar los datos automáticamente
        </p>
      </div>

      {/* ── CUPS lookup ──────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">
          CUPS <span className="text-muted-foreground font-normal">(opcional — rellena automáticamente)</span>
        </label>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={cups}
              onChange={e => {
                const v = e.target.value.toUpperCase()
                setCups(v)
                setCupsOk(null)
                setCupsError(null)
                setSipsFields(new Set())
              }}
              onBlur={() => lookupCUPS(cups)}
              placeholder="ES0021000012345678AB"
              maxLength={22}
              className={cn(
                'w-full rounded-lg border bg-background py-2 pl-3 pr-8 font-mono text-sm uppercase tracking-wider text-foreground placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors',
                cupsValue.length > 0 && !cupsIsValid && !cupsLoading
                  ? 'border-amber-500/50'
                  : cupsOk
                  ? 'border-emerald-500/50'
                  : 'border-input'
              )}
            />
            {cups && (
              <button
                type="button"
                onClick={clearCUPS}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={!cupsIsValid || cupsLoading}
            onClick={() => lookupCUPS(cups)}
            className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-40"
          >
            {cupsLoading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Search className="h-3.5 w-3.5" />
            }
            {cupsLoading ? 'Consultando…' : 'Consultar'}
          </button>
        </div>

        {/* Status feedback */}
        {cupsOk && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="font-semibold">Datos SIPS cargados</span>
              {cupsOk !== 'Suministro encontrado' && ` · ${cupsOk}`}
            </span>
          </div>
        )}
        {cupsError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {cupsError}
          </div>
        )}
      </div>

      {/* ── Tipo ─────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-foreground">Tipo de suministro</label>
          {sipsFields.has('tipo') && (
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
              SIPS
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {TIPOS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTipo(value)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-all',
                tipo === value
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-border/80 hover:bg-accent/50'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Fields grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Consumo */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-foreground">Consumo anual (kWh)</label>
            {sipsFields.has('consumo') && (
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
                SIPS
              </span>
            )}
          </div>
          <input
            type="number"
            value={consumo}
            onChange={e => { setConsumo(e.target.value); setSipsFields(prev => { const s = new Set(prev); s.delete('consumo'); return s }) }}
            placeholder="4800"
            min="0"
            className={cn(
              'w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors',
              sipsFields.has('consumo') ? 'border-emerald-500/40' : 'border-input'
            )}
          />
        </div>

        {/* Potencia */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-foreground">Potencia P1 (kW)</label>
            {sipsFields.has('potencia') && (
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
                SIPS
              </span>
            )}
          </div>
          <input
            type="number"
            value={potencia}
            onChange={e => { setPotencia(e.target.value); setSipsFields(prev => { const s = new Set(prev); s.delete('potencia'); return s }) }}
            placeholder="5.75"
            step="0.001"
            min="0"
            className={cn(
              'w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors',
              sipsFields.has('potencia') ? 'border-emerald-500/40' : 'border-input'
            )}
          />
        </div>

        {/* Tarifa actual */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-foreground">Tarifa actual</label>
            {sipsFields.has('tarifa') && (
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
                SIPS
              </span>
            )}
          </div>
          <select
            value={tarifaActual}
            onChange={e => { setTarifaActual(e.target.value); setSipsFields(prev => { const s = new Set(prev); s.delete('tarifa'); return s }) }}
            className={cn(
              'w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer',
              sipsFields.has('tarifa') ? 'border-emerald-500/40' : 'border-input'
            )}
          >
            <option value="2.0TD">2.0TD (Hogar)</option>
            <option value="3.0TD">3.0TD (Empresa)</option>
            <option value="6.1TD">6.1TD (Gran empresa)</option>
            <option value="RL.1">RL.1 (Gas hogar)</option>
            <option value="RL.2">RL.2 (Gas empresa)</option>
          </select>
        </div>

        {/* Precio actual */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Precio medio actual (€/kWh)</label>
          <input
            type="number"
            value={precioActual}
            onChange={e => setPrecioActual(e.target.value)}
            placeholder="0.145"
            step="0.001"
            min="0"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-11"
      >
        <Calculator className="mr-2 h-4 w-4" />
        {loading ? 'Calculando…' : 'Calcular y comparar tarifas'}
      </Button>
    </form>
  )
}
