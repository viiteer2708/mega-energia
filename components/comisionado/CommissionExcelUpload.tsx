'use client'

import { useState, useCallback, useTransition } from 'react'
import {
  Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CommissionUploadPreview } from './CommissionUploadPreview'
import { parseCommissionExcel } from '@/lib/commission-excel-parser'
import { validateCommissionData } from '@/lib/commission-excel-validator'
import { generateCommissionTemplate } from '@/lib/commission-excel-template'
import { processCommissionExcelUpload } from '@/app/(app)/comisionado/actions'
import type {
  ParsedCommissionExcel,
  CommissionValidationResult,
  EnergyCompany,
  EnergyProduct,
  CommissionModel,
} from '@/lib/types'

const inputClass =
  'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

interface CommissionExcelUploadProps {
  companies: EnergyCompany[]
  products: EnergyProduct[]
}

export function CommissionExcelUpload({ companies, products }: CommissionExcelUploadProps) {
  const [templateName, setTemplateName] = useState('')
  const [templateModel, setTemplateModel] = useState<CommissionModel>('table')
  const [generating, setGenerating] = useState(false)

  const [parsed, setParsed] = useState<ParsedCommissionExcel | null>(null)
  const [validation, setValidation] = useState<CommissionValidationResult | null>(null)
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState('')
  const [uploadResult, setUploadResult] = useState<{
    ok: boolean
    error?: string
    companies_created?: number
    products_created?: number
    rates_upserted?: number
  } | null>(null)

  const [isPending, startTransition] = useTransition()

  const handleDownloadTemplate = useCallback(async () => {
    if (!templateName.trim()) return
    setGenerating(true)
    try {
      await generateCommissionTemplate(templateName.trim(), templateModel)
    } finally {
      setGenerating(false)
    }
  }, [templateName, templateModel])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setParseError('')
    setParsed(null)
    setValidation(null)
    setUploadResult(null)
    setFileName(file.name)

    try {
      const result = await parseCommissionExcel(file)

      if (!result.company_name) {
        setParseError('No se encontró el nombre de la comercializadora. Verifica la hoja CONFIG.')
        return
      }

      if (result.products.length === 0) {
        setParseError('No se encontraron productos con datos en las hojas de tarifa.')
        return
      }

      const validationResult = validateCommissionData(result, products, companies)

      setParsed(result)
      setValidation(validationResult)
    } catch {
      setParseError('Error al leer el archivo. Verifica que sigue el formato de la plantilla.')
    }
  }, [companies, products])

  const handleConfirm = useCallback(() => {
    if (!parsed || !validation?.valid) return

    startTransition(async () => {
      const formData = new FormData()
      formData.set('data', JSON.stringify(parsed))
      formData.set('file_name', fileName)

      const result = await processCommissionExcelUpload(null, formData)
      setUploadResult(result)

      if (result.ok) {
        setParsed(null)
        setValidation(null)
      }
    })
  }, [parsed, validation, fileName])

  const clearFile = () => {
    setParsed(null)
    setValidation(null)
    setFileName('')
    setParseError('')
    setUploadResult(null)
  }

  return (
    <div className="space-y-4">
      {/* Descargar plantilla */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Download className="h-4 w-4 text-primary" />
            Descargar plantilla
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Genera un .xlsx con hoja CONFIG + hojas por tarifa para rellenar productos y comisiones.
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1 max-w-xs">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Comercializadora</label>
              <input
                type="text"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="Ej: MEGA"
                className={inputClass}
              />
            </div>
            <div className="max-w-[140px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Modelo</label>
              <select
                value={templateModel}
                onChange={e => setTemplateModel(e.target.value as CommissionModel)}
                className={inputClass}
              >
                <option value="table">Tabla</option>
                <option value="formula">Fórmula</option>
              </select>
            </div>
            <Button
              onClick={handleDownloadTemplate}
              disabled={!templateName.trim() || generating}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-1" />
              {generating ? 'Generando...' : '.xlsx'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subir archivo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Upload className="h-4 w-4 text-primary" />
            Cargar Excel de comisiones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!parsed ? (
            <>
              <label className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border/50 bg-accent/20 p-8 cursor-pointer hover:border-primary/40 transition-colors">
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground/50" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Arrastra o selecciona un archivo .xlsx</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Formato: hoja CONFIG + hojas por tarifa (2.0TD, 3.0TD, etc.)
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
              {/* Header del archivo */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <Badge variant="outline" className="text-xs">
                    {parsed.products.length} productos
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Preview y validación */}
              {validation && (
                <CommissionUploadPreview
                  parsed={parsed}
                  validation={validation}
                  onConfirm={handleConfirm}
                  onCancel={clearFile}
                  isPending={isPending}
                />
              )}
            </>
          )}

          {/* Resultado de la carga */}
          {uploadResult && (
            <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
              uploadResult.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {uploadResult.ok ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <div>
                {uploadResult.ok ? (
                  <p>
                    Carga completada: {uploadResult.products_created ?? 0} productos creados,{' '}
                    {uploadResult.rates_upserted ?? 0} rangos procesados.
                  </p>
                ) : (
                  <p>{uploadResult.error}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
