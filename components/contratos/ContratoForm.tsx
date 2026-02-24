'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Send, Loader2, Clock, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WizardStepper, type StepStatus } from '@/components/contratos/WizardStepper'
import { BloqueComercial } from '@/components/contratos/BloqueComercial'
import { BloqueTitular, type BloqueTitularRef, type TitularData } from '@/components/contratos/BloqueTitular'
import { BloqueSuministro, type BloqueSuministroRef, type SuministroData } from '@/components/contratos/BloqueSuministro'
import { DocumentUpload, type DocumentUploadRef, type DocFile } from '@/components/contratos/DocumentUpload'
import { RevisionCard } from '@/components/contratos/RevisionCard'
import { DuplicateWarning } from '@/components/contratos/DuplicateWarning'
import { createContract, saveDraft, changeState, uploadDocument } from '@/app/(app)/contratos/actions'
import { isValidDNI, isValidCUPS, isValidPhone, isValidEmail } from '@/lib/validations/validators'
import type { UserProfile, Product, ContractEstado, DocUploadMode } from '@/lib/types'

// ── Types ────────────────────────────────────────────────────────────────────

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

const STEP_LABELS = ['Titular', 'Suministro', 'Docs', 'Revisión']

const emptyTitular: TitularData = {
  titular_contrato: '', es_empresa: false, cif: '', nombre_firmante: '',
  dni_firmante: '', telefono_1: '', telefono_2: '', email_titular: '',
  cuenta_bancaria: '', fecha_firma: '',
}
const emptySuministro: SuministroData = {
  cups: '', tarifa: '', potencia_1: '', potencia_2: '', potencia_3: '',
  potencia_4: '', potencia_5: '', potencia_6: '', consumo_anual: '',
  direccion: '', codigo_postal: '', poblacion: '', provincia: '', datos_manuales: false,
}

// ── Component ────────────────────────────────────────────────────────────────

export function ContratoForm({
  mode, user, products, contractId, defaultValues,
  editableFields, devueltoMotivo, devueltoCampos,
}: ContratoFormProps) {
  const router = useRouter()

  // Step state
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right'>('right')
  const [animating, setAnimating] = useState(false)

  // Data state
  const [comercializadora, setComercializadora] = useState('')
  const [productId, setProductId] = useState<number | null>(null)
  const [observaciones, setObservaciones] = useState('')
  const [titular, setTitular] = useState<TitularData>(emptyTitular)
  const [suministro, setSuministro] = useState<SuministroData>(emptySuministro)
  const [docs, setDocs] = useState<{ mode: DocUploadMode; files: DocFile[] }>({ mode: 'single', files: [] })

  // Refs for validation
  const titularRef = useRef<BloqueTitularRef>(null)
  const suministroRef = useRef<BloqueSuministroRef>(null)
  const docsRef = useRef<DocumentUploadRef>(null)

  // UI state
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [duplicates, setDuplicates] = useState<Array<{ id: string; cups: string; titular: string; estado: ContractEstado }>>()
  const [globalErrors, setGlobalErrors] = useState<string[]>([])
  const [createdId, setCreatedId] = useState<string | null>(contractId ?? null)

  // Swipe
  const touchStartX = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Step navigation ─────────────────────────────────────────────────────

  const goToStep = (target: number, validate = false) => {
    if (target === step || target < 0 || target > 3 || animating) return
    // Validate current step if advancing with "Siguiente"
    if (validate && target > step) {
      if (!validateCurrentStep()) return
    }
    setDirection(target > step ? 'right' : 'left')
    setAnimating(true)
    setTimeout(() => { setStep(target); setAnimating(false) }, 300)
  }

  const validateCurrentStep = (): boolean => {
    if (step === 0) return titularRef.current?.validate() ?? true
    if (step === 1) return suministroRef.current?.validate() ?? true
    if (step === 2) return docsRef.current?.validate() ?? true
    return true
  }

  // ── Step status for stepper ─────────────────────────────────────────────

  const getStepStatus = (idx: number): StepStatus => {
    if (idx === step) return 'in_progress'
    if (idx === 0) {
      const hasRequired = titular.titular_contrato && titular.nombre_firmante && titular.dni_firmante && titular.telefono_1 && titular.email_titular
      if (!titular.titular_contrato && !titular.nombre_firmante) return 'pending'
      return hasRequired ? 'complete' : 'in_progress'
    }
    if (idx === 1) {
      if (!suministro.cups) return 'pending'
      return isValidCUPS(suministro.cups) ? 'complete' : 'in_progress'
    }
    if (idx === 2) {
      if (docs.files.length === 0) return 'pending'
      return 'complete'
    }
    return 'pending'
  }

  const progress = (() => {
    let total = 0
    const checks = [
      !!titular.titular_contrato, !!titular.nombre_firmante, !!titular.dni_firmante,
      !!titular.telefono_1, !!titular.email_titular, !!suministro.cups, docs.files.length > 0,
    ]
    for (const c of checks) if (c) total++
    return Math.round((total / checks.length) * 100)
  })()

  // ── Auto-save ──────────────────────────────────────────────────────────

  const collectFormData = useCallback(() => ({
    ...titular, ...suministro, comercializadora, product_id: productId, observaciones,
    doc_upload_mode: docs.mode,
  }), [titular, suministro, comercializadora, productId, observaciones, docs.mode])

  const handleSaveDraft = useCallback(async () => {
    setSaving(true)
    setGlobalErrors([])

    if (!createdId) {
      // First save — create the contract
      const fd = new FormData()
      fd.set('owner_id', user.id)
      const data = collectFormData()
      for (const [k, v] of Object.entries(data)) {
        if (v !== null && v !== undefined) fd.set(k, String(v))
      }
      const result = await createContract(null, fd)
      if (result?.ok && result.id) {
        setCreatedId(result.id)
        setLastSaved(new Date())
      } else {
        setGlobalErrors([result?.error ?? 'Error al guardar.'])
      }
    } else {
      await saveDraft(createdId, collectFormData())
      setLastSaved(new Date())
    }
    setSaving(false)
  }, [createdId, collectFormData, user.id])

  // Auto-save every 30s
  useEffect(() => {
    if (!createdId) return
    const interval = setInterval(async () => {
      await saveDraft(createdId, collectFormData())
      setLastSaved(new Date())
    }, 30000)
    return () => clearInterval(interval)
  }, [createdId, collectFormData])

  // ── Submit for validation ──────────────────────────────────────────────

  const handleSubmitValidation = async () => {
    // Full validation
    const errors: string[] = []
    if (!titular.titular_contrato.trim()) errors.push('Titular del contrato es obligatorio')
    if (!titular.nombre_firmante.trim()) errors.push('Nombre del firmante es obligatorio')
    if (!titular.dni_firmante.trim()) errors.push('DNI del firmante es obligatorio')
    else if (!isValidDNI(titular.dni_firmante)) errors.push('DNI del firmante no es válido')
    if (!titular.telefono_1.trim()) errors.push('Teléfono 1 es obligatorio')
    else if (!isValidPhone(titular.telefono_1)) errors.push('Teléfono 1 no es válido')
    if (!titular.email_titular.trim()) errors.push('Email del titular es obligatorio')
    else if (!isValidEmail(titular.email_titular)) errors.push('Email del titular no es válido')
    if (!suministro.cups.trim()) errors.push('CUPS es obligatorio')
    else if (!isValidCUPS(suministro.cups)) errors.push('CUPS no tiene formato válido')
    if (docs.files.length === 0) errors.push('Se necesita al menos un documento')

    if (errors.length > 0) { setGlobalErrors(errors); return }
    setGlobalErrors([])

    // Ensure saved first
    setSubmitting(true)
    if (!createdId) {
      const fd = new FormData()
      fd.set('owner_id', user.id)
      const data = collectFormData()
      for (const [k, v] of Object.entries(data)) {
        if (v !== null && v !== undefined) fd.set(k, String(v))
      }
      const result = await createContract(null, fd)
      if (!result?.ok || !result.id) {
        setGlobalErrors([result?.error ?? 'Error al crear contrato.'])
        setSubmitting(false); return
      }
      setCreatedId(result.id)

      // Upload files
      for (const doc of docs.files) {
        const fd2 = new FormData()
        fd2.set('contract_id', result.id)
        fd2.set('tipo_doc', doc.tipo_doc)
        fd2.set('file', doc.file)
        await uploadDocument(fd2)
      }

      // Change state
      const stateRes = await changeState(result.id, 'pendiente_validacion')
      if (!stateRes.ok) {
        if (stateRes.duplicates) { setDuplicates(stateRes.duplicates) }
        else { setGlobalErrors([stateRes.error ?? 'Error']) }
        setSubmitting(false); return
      }
      if (stateRes.duplicates?.length) { setDuplicates(stateRes.duplicates); setSubmitting(false); return }
    } else {
      // Update + upload + state change
      await saveDraft(createdId, collectFormData())
      for (const doc of docs.files) {
        const fd2 = new FormData()
        fd2.set('contract_id', createdId)
        fd2.set('tipo_doc', doc.tipo_doc)
        fd2.set('file', doc.file)
        await uploadDocument(fd2)
      }
      const stateRes = await changeState(createdId, 'pendiente_validacion')
      if (!stateRes.ok) {
        if (stateRes.duplicates) { setDuplicates(stateRes.duplicates) }
        else { setGlobalErrors([stateRes.error ?? 'Error']) }
        setSubmitting(false); return
      }
      if (stateRes.duplicates?.length) { setDuplicates(stateRes.duplicates); setSubmitting(false); return }
    }
    setSubmitting(false)
    router.push('/contratos')
  }

  // ── Swipe handling ─────────────────────────────────────────────────────

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 60) {
      if (dx < 0 && step < 3) goToStep(step + 1)
      if (dx > 0 && step > 0) goToStep(step - 1)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const steps = STEP_LABELS.map((label, i) => ({ label, status: getStepStatus(i) }))

  return (
    <div className="mx-auto max-w-3xl">
      {/* Devuelto banner */}
      {devueltoMotivo && (
        <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-400 shrink-0" />
            <div>
              <h4 className="font-semibold text-orange-400">Contrato devuelto</h4>
              <p className="mt-1 text-sm text-orange-300/80">{devueltoMotivo}</p>
              {devueltoCampos?.length ? (
                <p className="mt-1 text-xs text-muted-foreground">Campos a corregir: {devueltoCampos.join(', ')}</p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Bloque A — cabecera fija */}
      <BloqueComercial products={products} user={user} comercializadora={comercializadora}
        productId={productId} observaciones={observaciones}
        onComercializadoraChange={setComercializadora} onProductChange={setProductId}
        onObservacionesChange={setObservaciones} />

      {/* Stepper */}
      <WizardStepper steps={steps} currentStep={step} onStepClick={(i) => goToStep(i)} progress={progress} />

      {/* Auto-save indicator */}
      {lastSaved && (
        <div className="mb-3 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" /> Guardado {formatTimeAgo(lastSaved)}
        </div>
      )}

      {/* Global errors */}
      {globalErrors.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <ul className="list-inside list-disc space-y-1 text-sm text-red-300/80">
            {globalErrors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      {/* Card container with slide animation */}
      <div ref={containerRef} className="overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div
          className="transition-transform duration-300 ease-in-out"
          style={{
            transform: animating
              ? direction === 'right' ? 'translateX(-100%)' : 'translateX(100%)'
              : 'translateX(0)',
            opacity: animating ? 0 : 1,
          }}
        >
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm min-h-[400px]">
            {step === 0 && (
              <BloqueTitular ref={titularRef} role={user.role} isCreator={true}
                data={titular} onChange={setTitular} editableFields={editableFields} />
            )}
            {step === 1 && (
              <BloqueSuministro ref={suministroRef} data={suministro}
                onChange={setSuministro} editableFields={editableFields} />
            )}
            {step === 2 && (
              <DocumentUpload ref={docsRef} esEmpresa={titular.es_empresa}
                data={docs} onChange={setDocs} />
            )}
            {step === 3 && (
              <RevisionCard titular={titular} suministro={suministro} docs={docs}
                validationErrors={globalErrors} onGoToStep={(s) => goToStep(s)} />
            )}
          </div>
        </div>
      </div>

      {/* Navigation buttons — sticky bottom */}
      <div className="sticky bottom-0 z-10 mt-4 flex items-center gap-3 rounded-lg border border-border bg-card/95 backdrop-blur-sm px-4 py-3 shadow-lg">
        {step > 0 && (
          <Button variant="outline" onClick={() => goToStep(step - 1)}>
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
        )}

        <Button variant="outline" onClick={handleSaveDraft} disabled={saving} className="ml-auto">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="hidden sm:inline">Guardar Borrador</span>
          <span className="sm:hidden">Guardar</span>
        </Button>

        {step < 3 && (
          <Button onClick={() => goToStep(step + 1, true)}>
            Siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {step === 3 && (
          <Button onClick={handleSubmitValidation} disabled={submitting || globalErrors.length > 0}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar para Validación
          </Button>
        )}
      </div>

      {/* Duplicates modal */}
      {duplicates && (
        <DuplicateWarning duplicates={duplicates} blocking={duplicates.some(d => d.estado === 'ok')}
          onConfirm={async () => {
            setDuplicates(undefined)
            if (createdId) {
              const res = await changeState(createdId, 'pendiente_validacion')
              if (res.ok) router.push('/contratos')
            }
          }}
          onCancel={() => setDuplicates(undefined)} />
      )}
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60) return 'hace unos segundos'
  return `hace ${Math.floor(s / 60)} min`
}
