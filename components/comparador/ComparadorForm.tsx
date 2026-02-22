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

const TARIFAS = [
  { value: '2.0TD',  label: '2.0TD — Hogar / pequeño negocio' },
  { value: '3.0TD',  label: '3.0TD — Empresa / media tensión' },
  { value: '6.1TD',  label: '6.1TD — Gran empresa' },
  { value: '6.2TD',  label: '6.2TD — Gran empresa (≥36 kV)' },
  { value: '6.3TD',  label: '6.3TD — Gran empresa (≥72 kV)' },
  { value: '6.4TD',  label: '6.4TD — Gran empresa (≥145 kV)' },
  { value: 'RL.1',   label: 'RL.1 — Gas hogar' },
  { value: 'RL.2',   label: 'RL.2 — Gas empresa' },
  { value: 'RL.3',   label: 'RL.3 — Gas industrial' },
]

const CUPS_REGEX = /^ES\d{16}[A-Z]{2}$/

function inferTipo(tarifa: string | null): TipoSuministroComp {
  if (!tarifa) return 'electricidad'
  if (/^RL|^G[0-9]|gas/i.test(tarifa)) return 'gas'
  return 'electricidad'
}

type PotenciaField = { periodo: string; potencia: string }

const DEFAULT_POTENCIAS: PotenciaField[] = [{ periodo: 'P1', potencia: '5.75' }]

export function ComparadorForm({ onComparar, loading }: ComparadorFormProps) {
  const [cups, setCups]               = useState('')
  const [cupsLoading, setCupsLoading] = useState(false)
  const [cupsOk, setCupsOk]           = useState<string | null>(null)
  const [cupsError, setCupsError]     = useState<string | null>(null)

  const [tipo, setTipo]                   = useState<TipoSuministroComp>('electricidad')
  const [consumo, setConsumo]             = useState('4800')
  const [potencias, setPotencias]         = useState<PotenciaField[]>(DEFAULT_POTENCIAS)
  const [precioActual, setPrecioActual]   = useState('0.145')
  const [tarifaActual, setTarifaActual]   = useState('2.0TD')

  const [sipsFields, setSipsFields] = useState<Set<string>>(new Set())
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

      const filled = new Set<string>()

      if (data.consumoAnual && data.consumoAnual > 0) {
        setConsumo(Math.round(data.consumoAnual).toString())
        filled.add('consumo')
      }

      if (data.potencias?.length) {
        setPotencias(
          (data.potencias as { periodo: string; potencia: number }[]).map(p => ({
            periodo: p.periodo,
            potencia: p.potencia % 1 === 0 ? p.potencia.toString() : p.potencia.toFixed(3),
          }))
        )
        filled.add('potencias')
      }

      if (data.tarifa) {
        // Match against known options, fallback to raw value
        const known = TARIFAS.find(t => t.value === data.tarifa)
        setTarifaActual(known ? data.tarifa : data.tarifa)
        filled.add('tarifa')
        setTipo(inferTipo(data.tarifa))
        filled.add('tipo')
      }

      setSipsFields(filled)
      setCupsOk(data.titular ?? data.municipio ?? 'Suministro encontrado')
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
    setPotencias(DEFAULT_POTENCIAS)
  }

  function updatePotencia(idx: number, val: string) {
    setPotencias(prev => prev.map((p, i) => i === idx ? { ...p, potencia: val } : p))
    setSipsFields(prev => { const s = new Set(prev); s.delete('potencias'); return s })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onComparar({
      tipo,
      consumo_anual_kwh:  parseFloat(consumo) || 0,
      consumo_p1_pct:     30,
      consumo_p2_pct:     45,
      consumo_p3_pct:     25,
      potencias: potencias.map(p => ({
        periodo:  p.periodo,
        potencia: parseFloat(p.potencia) || 0,
      })),
      tarifa_actual:      tarifaActual,
      precio_actual_kwh:  parseFloat(precioActual) || 0,
    })
  }

  const cupsValue  = cups.trim().toUpperCase()
  const cupsIsValid = CUPS_REGEX.test(cupsValue)
  const sipsBadge = (field: string) =>
    sipsFields.has(field) && (
      <span className="ml-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
        SIPS
      </span>
    )

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
          CUPS <span className="text-muted-foreground font-normal">(opcional)</span>
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
            <span className="hidden sm:inline">{cupsLoading ? 'Consultando…' : 'Consultar'}</span>
          </button>
        </div>

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
        <label className="text-xs font-medium text-foreground">
          Tipo de suministro{sipsBadge('tipo')}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TIPOS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTipo(value)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border py-2.5 px-3 text-xs font-medium transition-all',
                tipo === value
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-border/80 hover:bg-accent/50'
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tarifa + Consumo + Precio ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">

        {/* Tarifa actual — full width */}
        <div className="col-span-2 space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            Tarifa actual{sipsBadge('tarifa')}
          </label>
          <select
            value={tarifaActual}
            onChange={e => {
              setTarifaActual(e.target.value)
              setSipsFields(prev => { const s = new Set(prev); s.delete('tarifa'); return s })
            }}
            className={cn(
              'w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer',
              sipsFields.has('tarifa') ? 'border-emerald-500/40' : 'border-input'
            )}
          >
            {TARIFAS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
            {/* Fallback for unknown tariff codes returned by SIPS */}
            {!TARIFAS.find(t => t.value === tarifaActual) && (
              <option value={tarifaActual}>{tarifaActual}</option>
            )}
          </select>
        </div>

        {/* Consumo */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            Consumo anual (kWh){sipsBadge('consumo')}
          </label>
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

      {/* ── Potencias ─────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">
          Potencias contratadas (kW){sipsBadge('potencias')}
        </label>
        <div className={cn(
          'grid gap-2',
          potencias.length <= 2 ? 'grid-cols-2' :
          potencias.length <= 3 ? 'grid-cols-3' :
          'grid-cols-3 sm:grid-cols-6'
        )}>
          {potencias.map((p, idx) => (
            <div key={p.periodo} className="space-y-1">
              <span className="block text-[11px] text-muted-foreground font-mono text-center">{p.periodo}</span>
              <input
                type="number"
                value={p.potencia}
                onChange={e => updatePotencia(idx, e.target.value)}
                placeholder="0"
                step="0.001"
                min="0"
                className={cn(
                  'w-full rounded-lg border bg-background px-2 py-1.5 text-sm text-center text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors',
                  sipsFields.has('potencias') ? 'border-emerald-500/40' : 'border-input'
                )}
              />
            </div>
          ))}
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
