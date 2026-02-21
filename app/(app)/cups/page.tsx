'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import { CUPSSearch } from '@/components/cups/CUPSSearch'
import { CUPSResult } from '@/components/cups/CUPSResult'
import { CUPSRecientes } from '@/components/cups/CUPSRecientes'
import { mockCUPSDatabase, mockCUPSRecientes } from '@/lib/mock-data'
import type { PuntoSuministro, CUPSBusquedaReciente } from '@/lib/types'

export default function CUPSPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<PuntoSuministro | null>(null)
  const [recientes, setRecientes] = useState<CUPSBusquedaReciente[]>(mockCUPSRecientes)

  async function handleSearch(cups: string) {
    setLoading(true)
    setError(null)
    setResultado(null)

    // Simula latencia de API
    await new Promise((r) => setTimeout(r, 800))

    const punto = mockCUPSDatabase[cups]

    if (!punto) {
      setError(`No se encontró ningún suministro con el CUPS ${cups}. Verifica el código e inténtalo de nuevo.`)
      setLoading(false)
      return
    }

    setResultado(punto)

    // Añadir a recientes si no está ya
    setRecientes((prev) => {
      const ya = prev.find((r) => r.cups === cups)
      if (ya) return prev
      const nueva: CUPSBusquedaReciente = {
        cups: punto.cups,
        titular: punto.titular,
        tipo: punto.tipo,
        fecha: new Date().toISOString(),
      }
      return [nueva, ...prev].slice(0, 5)
    })

    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-[1100px]">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Consulta CUPS</h1>
          <p className="text-sm text-muted-foreground">
            Código Unificado de Punto de Suministro — datos del contrato y ahorro potencial
          </p>
        </div>
      </div>

      {/* Layout: search + recientes */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <CUPSSearch onSearch={handleSearch} loading={loading} error={error} />
          {resultado && <CUPSResult punto={resultado} />}
        </div>

        <div>
          <CUPSRecientes
            recientes={recientes}
            onSelect={(cups) => handleSearch(cups)}
          />
        </div>
      </div>
    </div>
  )
}
