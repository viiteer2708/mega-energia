'use client'

import { useState, forwardRef, useImperativeHandle } from 'react'
import { Search, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isValidCUPS } from '@/lib/validations/validators'

const inputClass =
  'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

interface SIPSData {
  cups: string
  tarifa: string | null
  potencias: Array<{ periodo: string; potencia: number }>
  consumoAnual: number | null
  direccion: string | null
  municipio: string | null
  provincia: string | null
  cp: string | null
}

export interface SuministroData {
  cups: string
  tarifa: string
  potencia_1: string; potencia_2: string; potencia_3: string
  potencia_4: string; potencia_5: string; potencia_6: string
  consumo_anual: string
  direccion: string
  codigo_postal: string
  poblacion: string
  provincia: string
  datos_manuales: boolean
}

export interface BloqueSuministroRef {
  validate: () => boolean
  getData: () => SuministroData
}

interface BloqueSuministroProps {
  disabled?: boolean
  data: SuministroData
  onChange: (data: SuministroData) => void
  editableFields?: string[]
}

export const BloqueSuministro = forwardRef<BloqueSuministroRef, BloqueSuministroProps>(
  function BloqueSuministro({ disabled, data, onChange, editableFields }, ref) {
    const [loading, setLoading] = useState(false)
    const [sipsError, setSipsError] = useState<string | null>(null)
    const [sipsLoaded, setSipsLoaded] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const update = (field: keyof SuministroData, value: string | boolean) => {
      onChange({ ...data, [field]: value })
    }

    const isFieldEditable = (field: string) => {
      if (disabled) return false
      if (editableFields) return editableFields.includes(field)
      return true
    }

    const sipsReadonly = sipsLoaded && !data.datos_manuales

    const handleConsultaSIPS = async () => {
      const cupsValue = data.cups.trim().toUpperCase()
      if (!cupsValue) { setErrors({ cups: 'Introduce un CUPS.' }); return }
      if (!isValidCUPS(cupsValue)) { setErrors({ cups: 'El CUPS debe tener 20-22 caracteres y empezar por ES.' }); return }

      setErrors({}); setSipsError(null); setLoading(true)
      try {
        const res = await fetch(`/api/cups/search?cups=${encodeURIComponent(cupsValue)}`)
        const result = await res.json()
        if (!res.ok) { setSipsError(result.error ?? 'Error al consultar SIPS.'); setLoading(false); return }

        const sips = result as SIPSData
        const newData = { ...data }
        if (sips.tarifa) newData.tarifa = sips.tarifa
        if (sips.potencias?.length) {
          const pots = ['', '', '', '', '', '']
          for (const p of sips.potencias) {
            const idx = parseInt(p.periodo.replace('P', '')) - 1
            if (idx >= 0 && idx < 6) pots[idx] = String(p.potencia)
          }
          newData.potencia_1 = pots[0]; newData.potencia_2 = pots[1]; newData.potencia_3 = pots[2]
          newData.potencia_4 = pots[3]; newData.potencia_5 = pots[4]; newData.potencia_6 = pots[5]
        }
        if (sips.consumoAnual) newData.consumo_anual = String(sips.consumoAnual)
        if (sips.direccion) newData.direccion = sips.direccion
        if (sips.cp) newData.codigo_postal = sips.cp
        if (sips.municipio) newData.poblacion = sips.municipio
        if (sips.provincia) newData.provincia = sips.provincia
        newData.datos_manuales = false
        onChange(newData)
        setSipsLoaded(true)
      } catch {
        setSipsError('No se pudo conectar con SIPS. Puedes introducir los datos manualmente.')
      } finally {
        setLoading(false)
      }
    }

    useImperativeHandle(ref, () => ({
      validate: () => {
        const errs: Record<string, string> = {}
        if (!data.cups.trim()) errs.cups = 'CUPS es obligatorio'
        else if (!isValidCUPS(data.cups)) errs.cups = 'CUPS no tiene formato válido'
        setErrors(errs)
        return Object.keys(errs).length === 0
      },
      getData: () => data,
    }))

    const numPotencias = data.tarifa?.startsWith('2.0') ? 2 : 6
    const potKeys = ['potencia_1', 'potencia_2', 'potencia_3', 'potencia_4', 'potencia_5', 'potencia_6'] as const

    return (
      <div className="space-y-4">
        {/* CUPS + SIPS */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">CUPS *</label>
            <input type="text" inputMode="text" value={data.cups}
              onChange={(e) => { update('cups', e.target.value.toUpperCase()); setErrors({}) }}
              disabled={!isFieldEditable('cups')} placeholder="ES0021..."
              className={errors.cups ? `${inputClass} border-red-500` : inputClass} maxLength={22} />
            {errors.cups && <p className="mt-1 text-xs text-red-400">{errors.cups}</p>}
          </div>
          {isFieldEditable('cups') && (
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={handleConsultaSIPS} disabled={loading || !data.cups.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-1 hidden sm:inline">SIPS</span>
              </Button>
            </div>
          )}
        </div>

        {sipsError && (
          <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0" />{sipsError}
          </div>
        )}

        {/* Tarifa */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Tarifa</label>
          <input type="text" value={data.tarifa} onChange={(e) => update('tarifa', e.target.value)}
            readOnly={sipsReadonly} disabled={!isFieldEditable('tarifa')} placeholder="2.0TD, 3.0TD..."
            className={`${inputClass} ${sipsReadonly ? 'opacity-60' : ''}`} />
        </div>

        {/* Potencias */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Potencias contratadas (kW)</label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {Array.from({ length: numPotencias }, (_, i) => (
              <div key={i}>
                <label className="mb-0.5 block text-[10px] text-muted-foreground/60">P{i + 1}</label>
                <input type="number" inputMode="decimal" value={data[potKeys[i]]}
                  onChange={(e) => update(potKeys[i], e.target.value)}
                  readOnly={sipsReadonly} disabled={!isFieldEditable(potKeys[i])} step="0.001"
                  className={`${inputClass} ${sipsReadonly ? 'opacity-60' : ''}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Consumo */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Consumo anual (kWh)</label>
          <input type="number" inputMode="numeric" value={data.consumo_anual}
            onChange={(e) => update('consumo_anual', e.target.value)}
            readOnly={sipsReadonly} disabled={!isFieldEditable('consumo_anual')}
            className={`${inputClass} ${sipsReadonly ? 'opacity-60' : ''}`} />
        </div>

        {/* Dirección */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Dirección</label>
            <input type="text" value={data.direccion} onChange={(e) => update('direccion', e.target.value)}
              readOnly={sipsReadonly} disabled={!isFieldEditable('direccion')}
              className={`${inputClass} ${sipsReadonly ? 'opacity-60' : ''}`} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Código postal</label>
            <input type="text" inputMode="numeric" value={data.codigo_postal}
              onChange={(e) => update('codigo_postal', e.target.value)}
              readOnly={sipsReadonly} disabled={!isFieldEditable('codigo_postal')} maxLength={5}
              className={`${inputClass} ${sipsReadonly ? 'opacity-60' : ''}`} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Población</label>
            <input type="text" value={data.poblacion} onChange={(e) => update('poblacion', e.target.value)}
              readOnly={sipsReadonly} disabled={!isFieldEditable('poblacion')}
              className={`${inputClass} ${sipsReadonly ? 'opacity-60' : ''}`} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Provincia</label>
            <input type="text" value={data.provincia} onChange={(e) => update('provincia', e.target.value)}
              readOnly={sipsReadonly} disabled={!isFieldEditable('provincia')}
              className={`${inputClass} ${sipsReadonly ? 'opacity-60' : ''}`} />
          </div>
        </div>
      </div>
    )
  }
)
