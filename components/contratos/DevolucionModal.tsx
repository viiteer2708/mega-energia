'use client'

import { useState } from 'react'
import { Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Campos que Backoffice puede marcar para corrección */
const CAMPOS_DEVOLUCION = [
  { key: 'cups', label: 'CUPS' },
  { key: 'tarifa', label: 'Tarifa' },
  { key: 'potencia_1', label: 'Potencia P1' },
  { key: 'potencia_2', label: 'Potencia P2' },
  { key: 'potencia_3', label: 'Potencia P3' },
  { key: 'consumo_anual', label: 'Consumo anual' },
  { key: 'direccion', label: 'Dirección' },
  { key: 'codigo_postal', label: 'Código postal' },
  { key: 'poblacion', label: 'Población' },
  { key: 'provincia', label: 'Provincia' },
  { key: 'titular_contrato', label: 'Titular del contrato' },
  { key: 'cif', label: 'CIF' },
  { key: 'nombre_firmante', label: 'Nombre firmante' },
  { key: 'dni_firmante', label: 'DNI firmante' },
  { key: 'telefono_1', label: 'Teléfono 1' },
  { key: 'telefono_2', label: 'Teléfono 2' },
  { key: 'email_titular', label: 'Email titular' },
  { key: 'cuenta_bancaria', label: 'Cuenta bancaria' },
  { key: 'fecha_firma', label: 'Fecha de firma' },
]

interface DevolucionModalProps {
  onConfirm: (motivo: string, campos: string[]) => void
  onCancel: () => void
  loading?: boolean
}

export function DevolucionModal({ onConfirm, onCancel, loading }: DevolucionModalProps) {
  const [motivo, setMotivo] = useState('')
  const [campos, setCampos] = useState<Set<string>>(new Set())

  const toggleCampo = (key: string) => {
    const next = new Set(campos)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setCampos(next)
  }

  const canSubmit = motivo.trim().length > 0 && campos.size > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center gap-3">
          <Undo2 className="h-6 w-6 text-orange-400 shrink-0" />
          <h3 className="text-lg font-semibold text-foreground">Devolver contrato</h3>
        </div>

        {/* Motivo obligatorio */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-foreground">
            Motivo de la devolución *
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Describe el motivo de la devolución..."
            className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
          {motivo.trim().length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">El motivo es obligatorio.</p>
          )}
        </div>

        {/* Campos a corregir */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-foreground">
            Campos a corregir * <span className="text-muted-foreground font-normal">(selecciona al menos 1)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CAMPOS_DEVOLUCION.map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors text-sm"
              >
                <input
                  type="checkbox"
                  checked={campos.has(key)}
                  onChange={() => toggleCampo(key)}
                  className="rounded border-border"
                />
                <span className="text-foreground">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(motivo.trim(), Array.from(campos))}
            disabled={!canSubmit || loading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {loading ? 'Devolviendo...' : 'Devolver contrato'}
          </Button>
        </div>
      </div>
    </div>
  )
}
