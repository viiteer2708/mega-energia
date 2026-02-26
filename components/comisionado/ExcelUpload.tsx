'use client'

import { useState, useCallback, useActionState } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { processExcelUpload } from '@/app/(app)/comisionado/actions'
import type { CommissionUpload } from '@/lib/types'

const inputClass =
  'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

interface ExcelUploadProps {
  uploads: CommissionUpload[]
}

interface ParsedRow {
  cups?: string
  su_ref?: string
  commission_gnew?: number
}

export function ExcelUpload({ uploads }: ExcelUploadProps) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState('')
  const [state, formAction, isPending] = useActionState(processExcelUpload, null)

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setParseError('')
    setParsedRows([])
    setFileName(file.name)

    try {
      // Import dinámico de xlsx
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

      if (json.length === 0) {
        setParseError('El archivo Excel está vacío.')
        return
      }

      // Normalizar nombres de columnas (case-insensitive)
      const rows: ParsedRow[] = json.map(row => {
        const normalized: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(row)) {
          normalized[key.toLowerCase().trim()] = val
        }
        return {
          cups: String(normalized.cups ?? '').trim() || undefined,
          su_ref: String(normalized.su_ref ?? normalized.referencia ?? '').trim() || undefined,
          commission_gnew: Number(normalized.commission_gnew ?? normalized.comision ?? normalized.comision_gnew ?? 0),
        }
      })

      setParsedRows(rows)
    } catch {
      setParseError('Error al leer el archivo Excel. Asegúrate de que es un .xlsx válido.')
    }
  }, [])

  const clearFile = () => {
    setParsedRows([])
    setFileName('')
    setParseError('')
  }

  return (
    <div className="space-y-6">
      {/* Zona de upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4 text-primary" />
            Subir Excel de comisiones GNE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {parsedRows.length === 0 ? (
            <>
              <label className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border/50 bg-accent/20 p-10 cursor-pointer hover:border-primary/40 transition-colors">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground/50" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Arrastra o selecciona un archivo .xlsx</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Columnas esperadas: cups (o su_ref), commission_gnew (o comision)
                  </p>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {parseError && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  {parseError}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Preview */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <Badge variant="outline">{parsedRows.length} filas</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">CUPS</th>
                      <th className="px-3 py-2">Ref.</th>
                      <th className="px-3 py-2">Comisión GNE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-1.5 font-mono text-xs">{row.cups ?? '—'}</td>
                        <td className="px-3 py-1.5 text-xs">{row.su_ref ?? '—'}</td>
                        <td className="px-3 py-1.5">{row.commission_gnew?.toFixed(4) ?? '—'}</td>
                      </tr>
                    ))}
                    {parsedRows.length > 50 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-2 text-center text-xs text-muted-foreground">
                          ... y {parsedRows.length - 50} filas más
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <form action={formAction}>
                <input type="hidden" name="file_name" value={fileName} />
                <input type="hidden" name="rows" value={JSON.stringify(parsedRows)} />
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Procesando...' : `Confirmar subida (${parsedRows.length} filas)`}
                </Button>
              </form>

              {/* Resultado */}
              {state && (
                <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
                  state.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {state.ok ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  )}
                  <div>
                    {state.ok ? (
                      <p>
                        Subida completada: {state.updatedRows} actualizados, {state.errorRows} errores
                        de {state.totalRows} filas.
                      </p>
                    ) : (
                      <p>{state.error}</p>
                    )}
                    {state.errors && state.errors.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-xs">
                        {state.errors.slice(0, 10).map((err, i) => (
                          <li key={i}>
                            Fila {err.row}: {err.error} {err.cups ? `(${err.cups})` : ''}
                          </li>
                        ))}
                        {state.errors.length > 10 && (
                          <li>... y {state.errors.length - 10} errores más</li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Historial de subidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de subidas</CardTitle>
        </CardHeader>
        <CardContent>
          {uploads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay subidas previas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="px-3 py-2">Archivo</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Filas</th>
                    <th className="px-3 py-2">Actualizados</th>
                    <th className="px-3 py-2">Errores</th>
                    <th className="px-3 py-2">Subido por</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map(upload => (
                    <tr key={upload.id} className="border-b border-border/50">
                      <td className="px-3 py-2 font-medium">{upload.file_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(upload.created_at).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-3 py-2">{upload.total_rows}</td>
                      <td className="px-3 py-2 text-green-400">{upload.updated_rows}</td>
                      <td className="px-3 py-2">
                        {upload.error_rows > 0 ? (
                          <span className="text-red-400">{upload.error_rows}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {upload.uploaded_by_name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
