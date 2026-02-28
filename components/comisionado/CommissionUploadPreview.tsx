'use client'

import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type {
  ParsedCommissionExcel,
  CommissionValidationResult,
} from '@/lib/types'

interface CommissionUploadPreviewProps {
  parsed: ParsedCommissionExcel
  validation: CommissionValidationResult
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}

export function CommissionUploadPreview({
  parsed,
  validation,
  onConfirm,
  onCancel,
  isPending,
}: CommissionUploadPreviewProps) {
  const [showWarnings, setShowWarnings] = useState(false)

  const { errors, warnings, summary } = validation
  const hasErrors = errors.length > 0

  return (
    <div className="space-y-4">
      {/* Resumen general */}
      <div className="rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-foreground">{parsed.company_name}</span>
          <Badge variant="outline">
            {parsed.commission_model === 'table' ? 'Tabla' : 'Fórmula'}
          </Badge>
          <Badge variant="outline">
            Margen: {(parsed.gnew_margin_pct * 100).toFixed(2)}%
          </Badge>
          <Badge variant="outline">
            {summary.total_rates} rangos
          </Badge>
        </div>

        {/* Productos */}
        <div className="grid grid-cols-2 gap-3">
          {summary.new_products.length > 0 && (
            <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3">
              <p className="text-xs font-medium text-green-400 mb-1">
                Productos nuevos ({summary.new_products.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {summary.new_products.map(name => (
                  <Badge key={name} variant="outline" className="text-xs text-green-400 border-green-500/30">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {summary.existing_products.length > 0 && (
            <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-3">
              <p className="text-xs font-medium text-blue-400 mb-1">
                Productos existentes ({summary.existing_products.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {summary.existing_products.map(name => (
                  <Badge key={name} variant="outline" className="text-xs text-blue-400 border-blue-500/30">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Desglose por tarifa */}
        {Object.keys(summary.rates_by_tariff).length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Rangos por tarifa</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.rates_by_tariff).map(([tariff, counts]) => (
                <div key={tariff} className="text-xs rounded-md border border-border px-2 py-1">
                  <span className="font-medium">{tariff}</span>
                  <span className="text-muted-foreground ml-1">
                    {counts.new_count > 0 && <span className="text-green-400">+{counts.new_count}</span>}
                    {counts.update_count > 0 && (
                      <span className="text-blue-400 ml-1">~{counts.update_count}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Errores bloqueantes */}
      {hasErrors && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {errors.length} error{errors.length > 1 ? 'es' : ''} bloqueante{errors.length > 1 ? 's' : ''}
            </span>
          </div>
          <ul className="space-y-1">
            {errors.map((err, i) => (
              <li key={i} className="text-xs text-red-300 flex items-start gap-1.5">
                <span className="text-red-400 mt-0.5">•</span>
                {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Advertencias */}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <button
            onClick={() => setShowWarnings(!showWarnings)}
            className="flex items-center gap-2 text-amber-400 w-full"
          >
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {warnings.length} advertencia{warnings.length > 1 ? 's' : ''}
            </span>
            {showWarnings ? (
              <ChevronUp className="h-3.5 w-3.5 ml-auto" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 ml-auto" />
            )}
          </button>
          {showWarnings && (
            <ul className="mt-2 space-y-1">
              {warnings.map((warn, i) => (
                <li key={i} className="text-xs text-amber-300 flex items-start gap-1.5">
                  <span className="text-amber-400 mt-0.5">•</span>
                  {warn.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Sin errores */}
      {!hasErrors && warnings.length === 0 && (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          Validación correcta. Todo listo para cargar.
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2">
        <Button
          onClick={onConfirm}
          disabled={hasErrors || isPending}
          size="sm"
        >
          {isPending ? 'Cargando...' : 'Confirmar carga'}
        </Button>
        <Button onClick={onCancel} variant="ghost" size="sm" disabled={isPending}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
