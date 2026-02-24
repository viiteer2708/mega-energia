'use client'

import { useActionState, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Send, Loader2, Clock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BloqueComercial } from '@/components/contratos/BloqueComercial'
import { BloqueSuministro } from '@/components/contratos/BloqueSuministro'
import { BloqueTitular } from '@/components/contratos/BloqueTitular'
import { DocumentUpload } from '@/components/contratos/DocumentUpload'
import { DuplicateWarning } from '@/components/contratos/DuplicateWarning'
import { createContract, saveDraft, changeState } from '@/app/(app)/contratos/actions'
import {
  isValidDNI, isValidCUPS, isValidPhone, isValidEmail,
} from '@/lib/validations/validators'
import type { UserProfile, Product, ContractDocument, ContractEstado } from '@/lib/types'

interface ContratoFormProps {
  mode: 'create' | 'edit'
  user: UserProfile
  products: Product[]
  contractId?: string
  defaultValues?: Record<string, unknown>
  editableFields?: string[]
  devueltoMotivo?: string | null
  devueltoCampos?: string[] | null
}

interface FormResult {
  ok: boolean
  error?: string
  id?: string
  duplicates?: Array<{ id: string; cups: string; titular: string; estado: ContractEstado }>
}

export function ContratoForm({
  mode,
  user,
  products,
  contractId,
  defaultValues,
  editableFields,
  devueltoMotivo,
  devueltoCampos,
}: ContratoFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [documents, setDocuments] = useState<ContractDocument[]>([])
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [duplicates, setDuplicates] = useState<FormResult['duplicates']>(undefined)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [submittingValidation, setSubmittingValidation] = useState(false)

  const [result, formAction, isPending] = useActionState<FormResult | null, FormData>(
    createContract,
    null
  )

  // Redirigir tras crear exitosamente
  useEffect(() => {
    if (result?.ok && result.id) {
      router.push(`/contratos`)
    }
  }, [result, router])

  // Auto-guardado cada 30s
  const autoSave = useCallback(async () => {
    if (!contractId || !formRef.current) return

    const fd = new FormData(formRef.current)
    const draft: Record<string, unknown> = {}
    fd.forEach((value, key) => {
      if (key !== 'owner_id') draft[key] = value
    })

    await saveDraft(contractId, draft)
    setLastSaved(new Date())
  }, [contractId])

  useEffect(() => {
    if (mode !== 'create' || !contractId) return
    const interval = setInterval(autoSave, 30000)
    return () => clearInterval(interval)
  }, [mode, contractId, autoSave])

  // Calcular progreso
  const requiredFields = [
    'cups', 'titular_contrato', 'nombre_firmante',
    'dni_firmante', 'telefono_1', 'email_titular',
  ]

  const getProgress = () => {
    if (!formRef.current) return 0
    const fd = new FormData(formRef.current)
    let filled = 0
    for (const field of requiredFields) {
      if (fd.get(field)?.toString().trim()) filled++
    }
    return Math.round((filled / requiredFields.length) * 100)
  }

  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(getProgress())
    }, 2000)
    return () => clearInterval(interval)
  })

  // Validar antes de enviar a validación
  const handleSendToValidation = async () => {
    if (!contractId || !formRef.current) return

    const fd = new FormData(formRef.current)
    const errors: string[] = []

    const cups = fd.get('cups')?.toString().trim()
    if (!cups) errors.push('CUPS es obligatorio')
    else if (!isValidCUPS(cups)) errors.push('CUPS no tiene formato válido')

    if (!fd.get('titular_contrato')?.toString().trim()) errors.push('Titular del contrato es obligatorio')
    if (!fd.get('nombre_firmante')?.toString().trim()) errors.push('Nombre del firmante es obligatorio')

    const dni = fd.get('dni_firmante')?.toString().trim()
    if (!dni) errors.push('DNI del firmante es obligatorio')
    else if (!isValidDNI(dni)) errors.push('DNI del firmante no es válido')

    const tel = fd.get('telefono_1')?.toString().trim()
    if (!tel) errors.push('Teléfono 1 es obligatorio')
    else if (!isValidPhone(tel)) errors.push('Teléfono 1 no es válido')

    const email = fd.get('email_titular')?.toString().trim()
    if (!email) errors.push('Email del titular es obligatorio')
    else if (!isValidEmail(email)) errors.push('Email del titular no es válido')

    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    setValidationErrors([])
    setSubmittingValidation(true)

    const res = await changeState(contractId, 'pendiente_validacion')

    setSubmittingValidation(false)

    if (!res.ok) {
      if (res.duplicates) {
        setDuplicates(res.duplicates)
      } else {
        setValidationErrors([res.error ?? 'Error desconocido'])
      }
      return
    }

    if (res.duplicates && res.duplicates.length > 0) {
      setDuplicates(res.duplicates)
      return
    }

    router.push('/contratos')
  }

  return (
    <>
      {/* Banner de devolución */}
      {devueltoMotivo && (
        <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-400 shrink-0" />
            <div>
              <h4 className="font-semibold text-orange-400">Contrato devuelto</h4>
              <p className="mt-1 text-sm text-orange-300/80">{devueltoMotivo}</p>
              {devueltoCampos && devueltoCampos.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Campos a corregir: {devueltoCampos.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barra de progreso */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{progress}%</span>
        {lastSaved && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Guardado {formatTimeAgo(lastSaved)}
          </span>
        )}
      </div>

      {/* Errores de validación */}
      {validationErrors.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <h4 className="mb-2 text-sm font-semibold text-red-400">
            Corrige los siguientes errores:
          </h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-red-300/80">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Error del server action */}
      {result && !result.ok && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {result.error}
        </div>
      )}

      <form ref={formRef} action={formAction} className="space-y-4">
        <BloqueComercial
          products={products}
          user={user}
          disabled={mode === 'edit' && editableFields && !editableFields.some(f => ['product_id', 'observaciones'].includes(f))}
          defaultValues={defaultValues as BloqueComercialDefaults}
        />

        <BloqueSuministro
          disabled={mode === 'edit' && editableFields && !editableFields.some(f => f.startsWith('cups') || f.startsWith('pot') || f === 'tarifa')}
          defaultValues={defaultValues as BloqueSuministroDefaults}
          editableFields={editableFields}
        />

        <BloqueTitular
          disabled={mode === 'edit' && editableFields && !editableFields.some(f => ['titular_contrato', 'dni_firmante', 'nombre_firmante'].includes(f))}
          role={user.role}
          isCreator={true}
          defaultValues={defaultValues as BloqueTitularDefaults}
          editableFields={editableFields}
        />

        <DocumentUpload
          contractId={contractId ?? null}
          documents={documents}
          disabled={false}
          onDocumentsChange={setDocuments}
        />

        {/* Botones */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" variant="outline" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {mode === 'create' ? 'Guardar Borrador' : 'Guardar Cambios'}
          </Button>

          {contractId && (
            <Button
              type="button"
              onClick={handleSendToValidation}
              disabled={submittingValidation}
            >
              {submittingValidation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar para Validación
            </Button>
          )}
        </div>
      </form>

      {/* Modal duplicados */}
      {duplicates && (
        <DuplicateWarning
          duplicates={duplicates}
          blocking={duplicates.some(d => d.estado === 'ok')}
          onConfirm={async () => {
            setDuplicates(undefined)
            // Forzar transición ignorando duplicates warning
            const res = await changeState(contractId!, 'pendiente_validacion')
            if (res.ok) router.push('/contratos')
          }}
          onCancel={() => setDuplicates(undefined)}
        />
      )}
    </>
  )
}

// Tipos auxiliares para defaultValues
type BloqueComercialDefaults = { product_id?: number | null; observaciones?: string }
type BloqueSuministroDefaults = {
  cups?: string; tarifa?: string;
  potencia_1?: number | null; potencia_2?: number | null; potencia_3?: number | null;
  potencia_4?: number | null; potencia_5?: number | null; potencia_6?: number | null;
  consumo_anual?: number | null; direccion?: string; codigo_postal?: string;
  poblacion?: string; provincia?: string; datos_manuales?: boolean;
}
type BloqueTitularDefaults = {
  titular_contrato?: string; cif?: string; nombre_firmante?: string; dni_firmante?: string;
  telefono_1?: string; telefono_2?: string; email_titular?: string;
  cuenta_bancaria?: string; fecha_firma?: string;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'hace unos segundos'
  const minutes = Math.floor(seconds / 60)
  return `hace ${minutes} min`
}
