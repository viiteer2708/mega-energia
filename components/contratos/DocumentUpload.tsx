'use client'

import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Upload, Camera, X, FileText, Image as ImageIcon, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DOC_TIPO_LABELS } from '@/lib/types'
import type { DocTipo, DocUploadMode } from '@/lib/types'

export interface DocFile {
  id: string
  tipo_doc: DocTipo
  file: File
  preview?: string
}

export interface DocumentUploadRef {
  validate: () => boolean
  getData: () => { mode: DocUploadMode; files: DocFile[] }
}

interface DocumentUploadProps {
  disabled?: boolean
  esEmpresa?: boolean
  data: { mode: DocUploadMode; files: DocFile[] }
  onChange: (data: { mode: DocUploadMode; files: DocFile[] }) => void
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024

export const DocumentUpload = forwardRef<DocumentUploadRef, DocumentUploadProps>(
  function DocumentUpload({ disabled, esEmpresa, data, onChange }, ref) {
    const [error, setError] = useState<string | null>(null)

    const setMode = (mode: DocUploadMode) => {
      onChange({ ...data, mode })
    }

    const addFile = (tipo: DocTipo, file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) { setError('Solo se permiten PDF, JPG y PNG.'); return }
      if (file.size > MAX_SIZE) { setError('El archivo no puede superar 10MB.'); return }
      setError(null)

      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      const newFile: DocFile = { id: crypto.randomUUID(), tipo_doc: tipo, file, preview }

      if (data.mode === 'single') {
        // Replace the single document
        onChange({ ...data, files: [newFile] })
      } else {
        // Replace existing file of same tipo_doc, or add
        const filtered = data.files.filter(f => f.tipo_doc !== tipo)
        onChange({ ...data, files: [...filtered, newFile] })
      }
    }

    const removeFile = (id: string) => {
      onChange({ ...data, files: data.files.filter(f => f.id !== id) })
    }

    useImperativeHandle(ref, () => ({
      validate: () => {
        if (data.mode === 'single') {
          const hasSingle = data.files.some(f => f.tipo_doc === 'documentacion_completa')
          if (!hasSingle) { setError('Sube al menos un documento.'); return false }
        } else {
          const hasFactura = data.files.some(f => f.tipo_doc === 'factura')
          const hasDni = data.files.some(f => f.tipo_doc === 'dni')
          if (!hasFactura || !hasDni) { setError('La factura y el DNI son obligatorios.'); return false }
          if (esEmpresa && !data.files.some(f => f.tipo_doc === 'cif')) { setError('El CIF es obligatorio para empresas.'); return false }
        }
        setError(null); return true
      },
      getData: () => data,
    }))

    return (
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode('single')} disabled={disabled}
            className={cn('flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all',
              data.mode === 'single' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50')}>
            Subir todo en un documento
          </button>
          <button type="button" onClick={() => setMode('separate')} disabled={disabled}
            className={cn('flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all',
              data.mode === 'separate' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50')}>
            Subir por separado
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
            <X className="h-4 w-4 shrink-0" />{error}
          </div>
        )}

        {/* Single mode */}
        {data.mode === 'single' && (
          <div className="transition-opacity duration-200">
            <p className="mb-2 text-sm text-muted-foreground">
              Arrastra aquí toda la documentación en un solo archivo (factura + DNI + lo que tengas).
            </p>
            <DropZone tipo="documentacion_completa" onFile={(f) => addFile('documentacion_completa', f)} disabled={disabled}
              existing={data.files.find(f => f.tipo_doc === 'documentacion_completa')}
              onRemove={(id) => removeFile(id)} large />
          </div>
        )}

        {/* Separate mode */}
        {data.mode === 'separate' && (
          <div className="space-y-3 transition-opacity duration-200">
            <DropZone tipo="factura" label="Factura reciente *" onFile={(f) => addFile('factura', f)} disabled={disabled}
              existing={data.files.find(f => f.tipo_doc === 'factura')} onRemove={(id) => removeFile(id)} />
            <DropZone tipo="dni" label="Copia DNI *" onFile={(f) => addFile('dni', f)} disabled={disabled}
              existing={data.files.find(f => f.tipo_doc === 'dni')} onRemove={(id) => removeFile(id)} />
            {esEmpresa && (
              <DropZone tipo="cif" label="Copia CIF *" onFile={(f) => addFile('cif', f)} disabled={disabled}
                existing={data.files.find(f => f.tipo_doc === 'cif')} onRemove={(id) => removeFile(id)} />
            )}
            <DropZone tipo="escrituras" label="Escrituras / Contrato alquiler" onFile={(f) => addFile('escrituras', f)} disabled={disabled}
              existing={data.files.find(f => f.tipo_doc === 'escrituras')} onRemove={(id) => removeFile(id)} />
          </div>
        )}
      </div>
    )
  }
)

// ── DropZone individual ──────────────────────────────────────────────────────
function DropZone({ tipo, label, onFile, disabled, existing, onRemove, large }: {
  tipo: DocTipo
  label?: string
  onFile: (file: File) => void
  disabled?: boolean
  existing?: DocFile
  onRemove: (id: string) => void
  large?: boolean
}) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    onFile(file)
  }, [onFile])

  if (existing) {
    const isImage = existing.file.type.startsWith('image/')
    return (
      <div className="rounded-lg border border-border bg-background p-3">
        {label && <p className="mb-2 text-xs font-medium text-muted-foreground">{label ?? DOC_TIPO_LABELS[tipo]}</p>}
        <div className="flex items-center gap-3">
          {existing.preview ? (
            <img src={existing.preview} alt="" className="h-14 w-14 rounded-md object-cover border border-border" />
          ) : isImage ? (
            <ImageIcon className="h-8 w-8 text-cyan-400" />
          ) : (
            <FileText className="h-8 w-8 text-amber-400" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{existing.file.name}</p>
            <p className="text-xs text-muted-foreground">{(existing.file.size / 1024).toFixed(0)} KB</p>
          </div>
          {!disabled && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon-xs" onClick={() => inputRef.current?.click()} title="Reemplazar">
                <Upload className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon-xs" className="text-red-400" onClick={() => onRemove(existing.id)} title="Eliminar">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
        </div>
      </div>
    )
  }

  return (
    <div>
      {label && <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>}
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!disabled) { const f = e.dataTransfer.files[0]; if (f) handleFile(f) } }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
          large ? 'p-8' : 'p-4',
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <Upload className={cn('text-muted-foreground', large ? 'mb-2 h-10 w-10' : 'mb-1 h-6 w-6')} />
        <p className={cn('text-muted-foreground', large ? 'text-sm' : 'text-xs')}>
          Arrastra o pulsa para seleccionar
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground/60">PDF, JPG, PNG — máx. 10MB</p>
        <div className="mt-2 flex gap-2">
          <Button type="button" variant="outline" size="xs" disabled={disabled}
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}>
            <Camera className="h-3 w-3" /> Cámara
          </Button>
        </div>
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" capture="environment" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
      </div>
    </div>
  )
}
