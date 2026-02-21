'use client'

import { useState } from 'react'
import { Calculator, Zap, Flame, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ComparadorInputData, TipoSuministroComp } from '@/lib/types'

interface ComparadorFormProps {
  onComparar: (data: ComparadorInputData) => void
  loading: boolean
}

const TIPOS = [
  { value: 'electricidad', label: 'Electricidad', icon: Zap },
  { value: 'gas', label: 'Gas', icon: Flame },
  { value: 'dual', label: 'Dual (luz + gas)', icon: Layers },
] as const

export function ComparadorForm({ onComparar, loading }: ComparadorFormProps) {
  const [tipo, setTipo] = useState<TipoSuministroComp>('electricidad')
  const [consumo, setConsumo] = useState('4800')
  const [potencia, setPotencia] = useState('5.75')
  const [precioActual, setPrecioActual] = useState('0.145')
  const [tarifaActual, setTarifaActual] = useState('2.0TD')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onComparar({
      tipo,
      consumo_anual_kwh: parseFloat(consumo) || 0,
      consumo_p1_pct: 30,
      consumo_p2_pct: 45,
      consumo_p3_pct: 25,
      potencia_kw: parseFloat(potencia) || 0,
      tarifa_actual: tarifaActual,
      precio_actual_kwh: parseFloat(precioActual) || 0,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border/50 bg-card p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Datos del suministro</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Introduce el consumo del cliente para calcular el ahorro</p>
      </div>

      {/* Tipo */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">Tipo de suministro</label>
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

      {/* Fields grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Consumo anual (kWh)</label>
          <input
            type="number"
            value={consumo}
            onChange={e => setConsumo(e.target.value)}
            placeholder="4800"
            min="0"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Potencia contratada (kW)</label>
          <input
            type="number"
            value={potencia}
            onChange={e => setPotencia(e.target.value)}
            placeholder="5.75"
            step="0.01"
            min="0"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Tarifa actual</label>
          <select
            value={tarifaActual}
            onChange={e => setTarifaActual(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer"
          >
            <option value="2.0TD">2.0TD (Hogar)</option>
            <option value="3.0TD">3.0TD (Empresa)</option>
            <option value="RL.1">RL.1 (Gas hogar)</option>
            <option value="RL.2">RL.2 (Gas empresa)</option>
          </select>
        </div>
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
        {loading ? 'Calculando...' : 'Calcular y comparar tarifas'}
      </Button>
    </form>
  )
}
