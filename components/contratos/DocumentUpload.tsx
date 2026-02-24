'use client'

import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Upload, Camera, X, FileText, Image as ImageIcon, Trash2, Plus } from 'lucide-react'
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

      // Always append — multiple files per tipo_doc allowed
      onChange({ ...data, files: [...data.files, newFile] })
    }

    const addMultipleFiles = (tipo: DocTipo, fileList: FileList) => {
      const newFiles: DocFile[] = []
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        if (!ALLOWED_TYPES.includes(file.type)) { setError('Solo se permiten PDF, JPG y PNG.'); continue }
        if (file.size > MAX_SIZE) { setError('El archivo no puede superar 10MB.'); continue }
        const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
        newFiles.push({ id: crypto.randomUUID(), tipo_doc: tipo, file, preview })
      }
      if (newFiles.length > 0) {
        setError(null)
        onChange({ ...data, files: [...data.files, ...newFiles] })
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
            Subir todo junto
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
              Sube toda la documentación (factura + DNI + lo que tengas). Puedes subir varios archivos.
            </p>
            <MultiDropZone tipo="documentacion_completa"
              files={data.files.filter(f => f.tipo_doc === 'documentacion_completa')}
              onAddFiles={(files) => addMultipleFiles('documentacion_completa', files)}
              onAddFile={(f) => addFile('documentacion_completa', f)}
              onRemove={removeFile} disabled={disabled} large />
          </div>
        )}

        {/* Separate mode */}
        {data.mode === 'separate' && (
          <div className="space-y-3 transition-opacity duration-200">
            <MultiDropZone tipo="factura" label="Factura reciente *"
              files={data.files.filter(f => f.tipo_doc === 'factura')}
              onAddFiles={(files) => addMultipleFiles('factura', files)}
              onAddFile={(f) => addFile('factura', f)}
              onRemove={removeFile} disabled={disabled} />
            <MultiDropZone tipo="dni" label="Copia DNI *"
              files={data.files.filter(f => f.tipo_doc === 'dni')}
              onAddFiles={(files) => addMultipleFiles('dni', files)}
              onAddFile={(f) => addFile('dni', f)}
              onRemove={removeFile} disabled={disabled} />
            {esEmpresa && (
              <MultiDropZone tipo="cif" label="Copia CIF *"
                files={data.files.filter(f => f.tipo_doc === 'cif')}
                onAddFiles={(files) => addMultipleFiles('cif', files)}
                onAddFile={(f) => addFile('cif', f)}
                onRemove={removeFile} disabled={disabled} />
            )}
            <MultiDropZone tipo="escrituras" label="Escrituras / Contrato alquiler"
              files={data.files.filter(f => f.tipo_doc === 'escrituras')}
              onAddFiles={(files) => addMultipleFiles('escrituras', files)}
              onAddFile={(f) => addFile('escrituras', f)}
              onRemove={removeFile} disabled={disabled} />
          </div>
        )}
      </div>
    )
  }
)

// ── MultiDropZone — supports multiple files per tipo ────────────────────────
function MultiDropZone({ tipo, label, files, onAddFiles, onAddFile, onRemove, disabled, large }: {
  tipo: DocTipo
  label?: string
  files: DocFile[]
  onAddFiles: (files: FileList) => void
  onAddFile: (file: File) => void
  onRemove: (id: string) => void
  disabled?: boolean
  large?: boolean
}) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    if (e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files)
    }
  }, [disabled, onAddFiles])

  // Has at least one file — show file list + add more button
  if (files.length > 0) {
    return (
      <div className="rounded-lg border border-border bg-background p-3">
        {label && <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>}

        {/* File grid */}
        <div className="space-y-2">
          {files.map(doc => {
            const isImage = doc.file.type.startsWith('image/')
            return (
              <div key={doc.id} className="flex items-center gap-3 rounded-md bg-card/50 px-2 py-1.5">
                {doc.preview ? (
                  <img src={doc.preview} alt="" className="h-12 w-12 rounded-md object-cover border border-border" />
                ) : isImage ? (
                  <ImageIcon className="h-7 w-7 text-cyan-400 shrink-0" />
                ) : (
                  <FileText className="h-7 w-7 text-amber-400 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{doc.file.name}</p>
                  <p className="text-xs text-muted-foreground">{(doc.file.size / 1024).toFixed(0)} KB</p>
                </div>
                {!disabled && (
                  <Button variant="ghost" size="icon-xs" className="text-red-400 shrink-0"
                    onClick={() => onRemove(doc.id)} title="Eliminar">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {/* Add more button */}
        {!disabled && (
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="outline" size="xs"
              onClick={() => addInputRef.current?.click()}>
              <Plus className="h-3 w-3" /> Añadir más
            </Button>
            <Button type="button" variant="outline" size="xs"
              onClick={() => {
                if (addInputRef.current) {
                  addInputRef.current.setAttribute('capture', 'environment')
                  addInputRef.current.click()
                  addInputRef.current.removeAttribute('capture')
                }
              }}>
              <Camera className="h-3 w-3" /> Cámara
            </Button>
            <input ref={addInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple className="hidden"
              onChange={(e) => { if (e.target.files?.length) onAddFiles(e.target.files); e.target.value = '' }} />
          </div>
        )}
      </div>
    )
  }

  // Empty — show drop zone
  return (
    <div>
      {label && <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>}
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
          large ? 'p-8' : 'p-4',
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <Upload className={cn('text-muted-foreground', large ? 'mb-2 h-10 w-10' : 'mb-1 h-6 w-6')} />
        <p className={cn('text-muted-foreground text-center', large ? 'text-sm' : 'text-xs')}>
          Arrastra o pulsa para seleccionar
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground/60">PDF, JPG, PNG — máx. 10MB — puedes subir varios</p>
        <div className="mt-2 flex gap-2">
          <Button type="button" variant="outline" size="xs" disabled={disabled}
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}>
            <Upload className="h-3 w-3" /> Archivos
          </Button>
          <Button type="button" variant="outline" size="xs" disabled={disabled}
            onClick={(e) => {
              e.stopPropagation()
              if (inputRef.current) {
                inputRef.current.setAttribute('capture', 'environment')
                inputRef.current.click()
                inputRef.current.removeAttribute('capture')
              }
            }}>
            <Camera className="h-3 w-3" /> Cámara
          </Button>
        </div>
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple className="hidden"
          onChange={(e) => { if (e.target.files?.length) onAddFiles(e.target.files); e.target.value = '' }} />
      </div>
    </div>
  )
}
