'use client'

import { useState } from 'react'
import { Zap, Search, Loader2, AlertCircle } from 'lucide-react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isValidCUPS } from '@/lib/validations/validators'

const inputClass =
  'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

interface SIPSData {
  cups: string
  tarifa: string | null
  potencias: Array<{ periodo: string; potencia: number }>
  consumoAnual: number | null
  titular: string | null
  direccion: string | null
  municipio: string | null
  provincia: string | null
  cp: string | null
}

interface BloqueSuministroProps {
  disabled?: boolean
  defaultValues?: {
    cups?: string
    tarifa?: string
    potencia_1?: number | null
    potencia_2?: number | null
    potencia_3?: number | null
    potencia_4?: number | null
    potencia_5?: number | null
    potencia_6?: number | null
    consumo_anual?: number | null
    direccion?: string
    codigo_postal?: string
    poblacion?: string
    provincia?: string
    datos_manuales?: boolean
  }
  editableFields?: string[]
}

export function BloqueSuministro({ disabled, defaultValues, editableFields }: BloqueSuministroProps) {
  const [cups, setCups] = useState(defaultValues?.cups ?? '')
  const [loading, setLoading] = useState(false)
  const [sipsError, setSipsError] = useState<string | null>(null)
  const [sipsLoaded, setSipsLoaded] = useState(false)
  const [datosManual, setDatosManual] = useState(defaultValues?.datos_manuales ?? false)

  // Form values from SIPS
  const [tarifa, setTarifa] = useState(defaultValues?.tarifa ?? '')
  const [potencias, setPotencias] = useState<(number | null)[]>([
    defaultValues?.potencia_1 ?? null,
    defaultValues?.potencia_2 ?? null,
    defaultValues?.potencia_3 ?? null,
    defaultValues?.potencia_4 ?? null,
    defaultValues?.potencia_5 ?? null,
    defaultValues?.potencia_6 ?? null,
  ])
  const [consumoAnual, setConsumoAnual] = useState<number | null>(defaultValues?.consumo_anual ?? null)
  const [direccion, setDireccion] = useState(defaultValues?.direccion ?? '')
  const [codigoPostal, setCodigoPostal] = useState(defaultValues?.codigo_postal ?? '')
  const [poblacion, setPoblacion] = useState(defaultValues?.poblacion ?? '')
  const [provincia, setProvincia] = useState(defaultValues?.provincia ?? '')

  const [cupsError, setCupsError] = useState<string | null>(null)

  // Determinar potencias visibles según tarifa
  const numPotencias = tarifa?.startsWith('2.0') ? 2 : 6

  const isFieldEditable = (field: string) => {
    if (disabled) return false
    if (editableFields) return editableFields.includes(field)
    return true
  }

  const sipsFieldsReadonly = sipsLoaded && !datosManual

  const handleConsultaSIPS = async () => {
    const cupsValue = cups.trim().toUpperCase()

    if (!cupsValue) {
      setCupsError('Introduce un CUPS.')
      return
    }
    if (!isValidCUPS(cupsValue)) {
      setCupsError('El CUPS debe tener 20-22 caracteres y empezar por ES.')
      return
    }

    setCupsError(null)
    setSipsError(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/cups/search?cups=${encodeURIComponent(cupsValue)}`)
      const data = await res.json()

      if (!res.ok) {
        setSipsError(data.error ?? 'Error al consultar SIPS.')
        setDatosManual(true)
        setLoading(false)
        return
      }

      const sips = data as SIPSData

      if (sips.tarifa) setTarifa(sips.tarifa)
      if (sips.potencias?.length) {
        const newPot: (number | null)[] = [null, null, null, null, null, null]
        for (const p of sips.potencias) {
          const idx = parseInt(p.periodo.replace('P', '')) - 1
          if (idx >= 0 && idx < 6) newPot[idx] = p.potencia
        }
        setPotencias(newPot)
      }
      if (sips.consumoAnual) setConsumoAnual(sips.consumoAnual)
      if (sips.direccion) setDireccion(sips.direccion)
      if (sips.cp) setCodigoPostal(sips.cp)
      if (sips.municipio) setPoblacion(sips.municipio)
      if (sips.provincia) setProvincia(sips.provincia)

      setSipsLoaded(true)
      setDatosManual(false)
    } catch {
      setSipsError('No se pudo conectar con SIPS. Puedes introducir los datos manualmente.')
      setDatosManual(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormSection title="Datos de Suministro" icon={Zap}>
      {/* CUPS + botón consulta */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            CUPS *
          </label>
          <input
            type="text"
            name="cups"
            value={cups}
            onChange={(e) => { setCups(e.target.value.toUpperCase()); setCupsError(null) }}
            disabled={!isFieldEditable('cups')}
            placeholder="ES0021..."
            className={inputClass}
            maxLength={22}
          />
          {cupsError && (
            <p className="mt-1 text-xs text-red-400">{cupsError}</p>
          )}
        </div>
        {isFieldEditable('cups') && (
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleConsultaSIPS}
              disabled={loading || !cups.trim()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-1">SIPS</span>
            </Button>
          </div>
        )}
      </div>

      {sipsError && (
        <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {sipsError}
        </div>
      )}

      {/* Hidden fields for form data */}
      <input type="hidden" name="datos_manuales" value={String(datosManual)} />

      {/* Tarifa */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Tarifa</label>
        <input
          type="text"
          name="tarifa"
          value={tarifa}
          onChange={(e) => setTarifa(e.target.value)}
          readOnly={sipsFieldsReadonly}
          disabled={!isFieldEditable('tarifa')}
          placeholder="2.0TD, 3.0TD, etc."
          className={`${inputClass} ${sipsFieldsReadonly ? 'opacity-60' : ''}`}
        />
      </div>

      {/* Potencias */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Potencias contratadas (kW)
        </label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {Array.from({ length: numPotencias }, (_, i) => (
            <div key={i}>
              <label className="mb-0.5 block text-[10px] text-muted-foreground/60">P{i + 1}</label>
              <input
                type="number"
                name={`potencia_${i + 1}`}
                value={potencias[i] ?? ''}
                onChange={(e) => {
                  const newPot = [...potencias]
                  newPot[i] = e.target.value ? Number(e.target.value) : null
                  setPotencias(newPot)
                }}
                readOnly={sipsFieldsReadonly}
                disabled={!isFieldEditable(`potencia_${i + 1}`)}
                step="0.001"
                className={`${inputClass} ${sipsFieldsReadonly ? 'opacity-60' : ''}`}
              />
            </div>
          ))}
        </div>
      </div>
      {/* Hidden potencias for non-visible ones */}
      {numPotencias < 6 && Array.from({ length: 6 - numPotencias }, (_, i) => (
        <input key={numPotencias + i} type="hidden" name={`potencia_${numPotencias + i + 1}`} value="" />
      ))}

      {/* Consumo anual */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Consumo anual (kWh)</label>
        <input
          type="number"
          name="consumo_anual"
          value={consumoAnual ?? ''}
          onChange={(e) => setConsumoAnual(e.target.value ? Number(e.target.value) : null)}
          readOnly={sipsFieldsReadonly}
          disabled={!isFieldEditable('consumo_anual')}
          className={`${inputClass} ${sipsFieldsReadonly ? 'opacity-60' : ''}`}
        />
      </div>

      {/* Dirección */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Dirección</label>
          <input
            type="text"
            name="direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            readOnly={sipsFieldsReadonly}
            disabled={!isFieldEditable('direccion')}
            className={`${inputClass} ${sipsFieldsReadonly ? 'opacity-60' : ''}`}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Código postal</label>
          <input
            type="text"
            name="codigo_postal"
            value={codigoPostal}
            onChange={(e) => setCodigoPostal(e.target.value)}
            readOnly={sipsFieldsReadonly}
            disabled={!isFieldEditable('codigo_postal')}
            maxLength={5}
            className={`${inputClass} ${sipsFieldsReadonly ? 'opacity-60' : ''}`}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Población</label>
          <input
            type="text"
            name="poblacion"
            value={poblacion}
            onChange={(e) => setPoblacion(e.target.value)}
            readOnly={sipsFieldsReadonly}
            disabled={!isFieldEditable('poblacion')}
            className={`${inputClass} ${sipsFieldsReadonly ? 'opacity-60' : ''}`}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Provincia</label>
          <input
            type="text"
            name="provincia"
            value={provincia}
            onChange={(e) => setProvincia(e.target.value)}
            readOnly={sipsFieldsReadonly}
            disabled={!isFieldEditable('provincia')}
            className={`${inputClass} ${sipsFieldsReadonly ? 'opacity-60' : ''}`}
          />
        </div>
      </div>
    </FormSection>
  )
}

// ── FormSection local ────────────────────────────────────────────────────────
function FormSection({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent/50 transition-colors"
      >
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <span className="flex-1 text-left">{title}</span>
        {open
          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
        }
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}
