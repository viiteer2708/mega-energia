'use client'

import { AlertTriangle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CONTRACT_STATE_CONFIG } from '@/lib/types'
import type { ContractEstado } from '@/lib/types'

interface Duplicate {
  id: string
  cups: string
  titular: string
  estado: ContractEstado
}

interface DuplicateWarningProps {
  duplicates: Duplicate[]
  blocking: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DuplicateWarning({ duplicates, blocking, onConfirm, onCancel }: DuplicateWarningProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          {blocking ? (
            <XCircle className="h-6 w-6 text-red-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0" />
          )}
          <h3 className="text-lg font-semibold text-foreground">
            {blocking ? 'CUPS duplicado — Bloqueado' : 'Posibles duplicados detectados'}
          </h3>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {blocking
            ? 'Ya existe un contrato OK con este CUPS. No es posible enviar a validación.'
            : 'Se encontraron contratos con el mismo CUPS en proceso. ¿Deseas continuar igualmente?'
          }
        </p>

        <div className="mb-6 space-y-2">
          {duplicates.map((d) => {
            const stateConfig = CONTRACT_STATE_CONFIG[d.estado]
            return (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-3 text-sm"
              >
                <div>
                  <span className="font-medium text-foreground">{d.cups}</span>
                  {d.titular && (
                    <span className="ml-2 text-muted-foreground">— {d.titular}</span>
                  )}
                </div>
                <Badge variant="outline" className={stateConfig.color}>
                  {stateConfig.label}
                </Badge>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          {!blocking && (
            <Button onClick={onConfirm}>
              Continuar igualmente
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
