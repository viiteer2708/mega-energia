'use client'

import { ChevronDown, ChevronRight, Pencil, AlertCircle, FileText, Image as ImageIcon, Check } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { DOC_TIPO_LABELS } from '@/lib/types'
import { isFieldVisible } from '@/lib/contract-permissions'
import type { TitularData } from './BloqueTitular'
import type { SuministroData } from './BloqueSuministro'
import type { DocFile } from './DocumentUpload'
import type { DocUploadMode, Role } from '@/lib/types'

interface RevisionCardProps {
  titular: TitularData
  suministro: SuministroData
  docs: { mode: DocUploadMode; files: DocFile[] }
  validationErrors: string[]
  onGoToStep: (step: number) => void
  role: Role
  isCreator: boolean
}

export function RevisionCard({ titular, suministro, docs, validationErrors, onGoToStep, role, isCreator }: RevisionCardProps) {
  return (
    <div className="space-y-4">
      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <h4 className="text-sm font-semibold text-red-400">Faltan campos por completar</h4>
          </div>
          <ul className="list-inside list-disc space-y-1 text-sm text-red-300/80">
            {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      <Section title="Datos del Titular" onEdit={() => onGoToStep(0)}>
        <Row label="Titular" value={titular.titular_contrato} required />
        {titular.es_empresa && <Row label="CIF" value={titular.cif} />}
        <Row label="Firmante" value={titular.nombre_firmante} required />
        <Row label="DNI" value={titular.dni_firmante} required />
        <Row label="Teléfono 1" value={titular.telefono_1} required />
        {titular.telefono_2 && <Row label="Teléfono 2" value={titular.telefono_2} />}
        <Row label="Email" value={titular.email_titular} required />
        {titular.cuenta_bancaria && isFieldVisible('cuenta_bancaria', role, isCreator) && (
          <Row label="IBAN" value={titular.cuenta_bancaria} />
        )}
        {titular.fecha_firma && <Row label="Fecha firma" value={titular.fecha_firma} />}
      </Section>

      <Section title="Datos de Suministro" onEdit={() => onGoToStep(1)}>
        <Row label="CUPS" value={suministro.cups} required />
        <Row label="Tarifa" value={suministro.tarifa} />
        <Row label="Potencias (kW)" value={
          [suministro.potencia_1, suministro.potencia_2, suministro.potencia_3,
           suministro.potencia_4, suministro.potencia_5, suministro.potencia_6]
            .filter(Boolean).map(v => Number(v).toLocaleString('es-ES', { minimumFractionDigits: 1 })).join(' / ') || ''
        } />
        <Row label="Consumo anual" value={suministro.consumo_anual ? `${Number(suministro.consumo_anual).toLocaleString('es-ES')} kWh` : ''} />
        <Row label="Dirección" value={suministro.direccion} />
        <Row label="CP" value={suministro.codigo_postal} />
        <Row label="Población" value={suministro.poblacion} />
        <Row label="Provincia" value={suministro.provincia} />
      </Section>

      <Section title="Documentación" onEdit={() => onGoToStep(2)}>
        {docs.files.length === 0 ? (
          <p className="text-sm text-red-400">No se ha subido ningún documento</p>
        ) : (
          <div className="space-y-2">
            {docs.files.map(doc => {
              const isImage = doc.file.type.startsWith('image/')
              return (
                <div key={doc.id} className="flex items-center gap-3">
                  {doc.preview ? (
                    <img src={doc.preview} alt="" className="h-10 w-10 rounded object-cover border border-border" />
                  ) : isImage ? (
                    <ImageIcon className="h-5 w-5 text-cyan-400" />
                  ) : (
                    <FileText className="h-5 w-5 text-amber-400" />
                  )}
                  <div>
                    <p className="text-sm text-foreground">{doc.file.name}</p>
                    <p className="text-xs text-muted-foreground">{DOC_TIPO_LABELS[doc.tipo_doc]}</p>
                  </div>
                  <Check className="ml-auto h-4 w-4 text-green-400" />
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5">
        <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          {title}
        </button>
        <button type="button" onClick={onEdit} className="flex items-center gap-1 text-xs text-primary hover:underline">
          <Pencil className="h-3 w-3" /> Editar
        </button>
      </div>
      {open && (
        <div className="border-t border-border px-4 py-3 space-y-1.5">
          {children}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, required }: { label: string; value: string; required?: boolean }) {
  const missing = required && !value.trim()
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      {missing ? (
        <span className="text-red-400 text-xs">Falta por completar</span>
      ) : (
        <span className={cn('text-foreground', !value.trim() && 'text-muted-foreground/50')}>
          {value.trim() || '—'}
        </span>
      )}
    </div>
  )
}
