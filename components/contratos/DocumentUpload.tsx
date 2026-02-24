'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, Image, Trash2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DOC_TIPO_LABELS } from '@/lib/types'
import type { DocTipo, ContractDocument } from '@/lib/types'
import { uploadDocument, deleteDocument } from '@/app/(app)/contratos/actions'

interface DocumentUploadProps {
  contractId: string | null
  documents: ContractDocument[]
  disabled?: boolean
  onDocumentsChange: (docs: ContractDocument[]) => void
}

const docTipos: DocTipo[] = ['factura', 'dni', 'cif', 'escrituras', 'contrato_firmado']

export function DocumentUpload({ contractId, documents, disabled, onDocumentsChange }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTipo, setSelectedTipo] = useState<DocTipo>('factura')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(async (file: File) => {
    if (!contractId) {
      setError('Guarda el contrato primero antes de subir documentos.')
      return
    }

    setError(null)
    setUploading(true)

    const formData = new FormData()
    formData.set('contract_id', contractId)
    formData.set('tipo_doc', selectedTipo)
    formData.set('file', file)

    const result = await uploadDocument(formData)

    setUploading(false)
    if (!result.ok) {
      setError(result.error ?? 'Error al subir documento.')
      return
    }
    if (result.document) {
      onDocumentsChange([result.document, ...documents])
    }
  }, [contractId, selectedTipo, documents, onDocumentsChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }, [disabled, handleUpload])

  const handleDelete = async (docId: number) => {
    const result = await deleteDocument(docId)
    if (result.ok) {
      onDocumentsChange(documents.filter(d => d.id !== docId))
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {/* Selector de tipo */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Tipo de documento
        </label>
        <select
          value={selectedTipo}
          onChange={(e) => setSelectedTipo(e.target.value as DocTipo)}
          disabled={disabled}
          className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {docTipos.map(t => (
            <option key={t} value={t}>{DOC_TIPO_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {/* Zona drag-and-drop */}
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          disabled && 'cursor-not-allowed opacity-50',
          uploading && 'pointer-events-none opacity-70'
        )}
      >
        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {uploading ? 'Subiendo...' : 'Arrastra un archivo o haz clic para seleccionar'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          PDF, JPG, PNG — máx. 10MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
            e.target.value = ''
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
          <X className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Lista de documentos */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Documentos adjuntos ({documents.length})
          </h4>
          {documents.map((doc) => {
            const isImage = doc.mime_type.startsWith('image/')
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
              >
                {isImage ? (
                  <Image className="h-5 w-5 text-cyan-400 shrink-0" />
                ) : (
                  <FileText className="h-5 w-5 text-amber-400 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {DOC_TIPO_LABELS[doc.tipo_doc]} — {formatSize(doc.file_size)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    title="Descargar"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Placeholder: downloads need signed URL from Storage
                    }}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  {!disabled && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      title="Eliminar"
                      className="text-red-400 hover:text-red-300"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(doc.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
