'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import { CUPSSearch } from '@/components/cups/CUPSSearch'
import { CUPSResult } from '@/components/cups/CUPSResult'
import { CUPSRecientes } from '@/components/cups/CUPSRecientes'
import type { PuntoSuministro, CUPSBusquedaReciente } from '@/lib/types'

// ── GNE reference prices per tariff ──────────────────────────────────────

import type { PeriodoTarifa } from '@/lib/types'

const GNE_PRECIOS: Record<string, { periodo: PeriodoTarifa; precio: number }[]> = {
  '2.0TD':  [{ periodo: 'P1', precio: 0.128 }, { periodo: 'P2', precio: 0.094 }, { periodo: 'P3', precio: 0.062 }],
  '3.0TD':  [{ periodo: 'P1', precio: 0.142 }, { periodo: 'P2', precio: 0.098 }, { periodo: 'P3', precio: 0.068 },
             { periodo: 'P4', precio: 0.058 }, { periodo: 'P5', precio: 0.052 }, { periodo: 'P6', precio: 0.048 }],
  'RL.1':   [{ periodo: 'P1', precio: 0.055 }],
  'RL.2':   [{ periodo: 'P1', precio: 0.068 }],
  'default':[{ periodo: 'P1', precio: 0.120 }],
}

function getGnePrecios(tarifa: string | null) {
  if (!tarifa) return GNE_PRECIOS['default']
  const key = Object.keys(GNE_PRECIOS).find(k => k !== 'default' && tarifa.toUpperCase().includes(k))
  return key ? GNE_PRECIOS[key] : GNE_PRECIOS['default']
}

function inferTipo(tarifa: string | null): 'electricidad' | 'gas' {
  if (!tarifa) return 'electricidad'
  return /^RL|^G[0-9]|gas/i.test(tarifa) ? 'gas' : 'electricidad'
}

function calcAhorro(consumoAnual: number, gnePrecios: { precio: number }[]): number {
  const avgGne = gnePrecios.reduce((s, p) => s + p.precio, 0) / gnePrecios.length
  return Math.round(Math.max(0, (0.19 - avgGne) * consumoAnual))
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function CUPSPage() {
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [resultado, setResultado] = useState<PuntoSuministro | null>(null)
  const [recientes, setRecientes] = useState<CUPSBusquedaReciente[]>([])

  async function handleSearch(cups: string) {
    setLoading(true)
    setError(null)
    setResultado(null)

    try {
      const res = await fetch(`/api/cups/search?cups=${encodeURIComponent(cups)}`)
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? `Error ${res.status}`)
        return
      }

      const tarifa       = data.tarifa ?? 'No disponible'
      const tipo         = inferTipo(data.tarifa)
      const gnePrecios  = getGnePrecios(data.tarifa)
      const consumoAnual = data.consumoAnual ?? 0
      const ahorro       = consumoAnual ? calcAhorro(consumoAnual, gnePrecios) : 0

      const potencias = ((data.potencias ?? []) as { periodo: string; potencia: number }[]).map(p => ({
        periodo: p.periodo as 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6',
        potencia: p.potencia,
      }))

      const punto: PuntoSuministro = {
        cups,
        tipo,
        estado:                  'activo',
        titular:                 data.titular ?? 'Titular no disponible',
        nif:                     data.nif ?? undefined,
        direccion:               data.direccion ?? '—',
        municipio:               data.municipio ?? '—',
        provincia:               data.provincia ?? '—',
        cp:                      data.cp ?? '—',
        comercializadora:        data.comercializadora ?? data.distribuidora ?? 'No disponible',
        tarifa,
        contador:                /telegestionado|smart|7|8/i.test(data.tipoMedida ?? '') ? 'telegestionado' : 'analógico',
        potencias:               potencias.length ? potencias : [{ periodo: 'P1', potencia: 0 }],
        consumo_anual_kwh:       consumoAnual,
        consumo_mensual:         data.consumoMensual ?? [],
        ultima_lectura:          new Date().toISOString().split('T')[0],
        ahorro_estimado_anual:   ahorro,
        tarifa_gne_recomendada: tipo === 'gas' ? `Gas GNE ${tarifa}` : `GNE ${tarifa}`,
        precios_gne:            gnePrecios,
      }

      setResultado(punto)
      setRecientes(prev => {
        if (prev.find(r => r.cups === cups)) return prev
        return [{ cups, titular: punto.titular, tipo, fecha: new Date().toISOString() }, ...prev].slice(0, 5)
      })
    } catch {
      setError('Error de conexión. Verifica tu acceso a la API SIPS.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Consulta CUPS</h1>
          <p className="text-sm text-muted-foreground">
            Código Unificado de Punto de Suministro — datos reales vía SIPS
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <CUPSSearch onSearch={handleSearch} loading={loading} error={error} />
          {resultado && <CUPSResult punto={resultado} />}
        </div>
        <div>
          <CUPSRecientes recientes={recientes} onSelect={handleSearch} />
        </div>
      </div>
    </div>
  )
}
