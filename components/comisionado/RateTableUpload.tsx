'use client'

import { useState, useCallback, useActionState } from 'react'
import {
  Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2,
  X, Table2, History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { processRateTableUpload } from '@/app/(app)/comisionado/actions'
import {
  ALL_TARIFAS, TARIFAS_ELECTRICIDAD,
  type RateTable, type RateTableUpload as RateTableUploadType,
  type ParsedRateTable, type ParsedRateTableSheet,
} from '@/lib/types'

const inputClass =
  'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

interface RateTableUploadProps {
  rateTables: RateTable[]
  rateTableUploads: RateTableUploadType[]
}

// ── Generador de plantilla Excel ──────────────────────────────────────────

async function generateTemplate(comercializadora: string) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  for (const tarifa of ALL_TARIFAS) {
    const isElec = TARIFAS_ELECTRICIDAD.includes(tarifa)
    const offer1 = isElec ? 'INDEXADA' : 'FIJO GAS'
    const offer2 = isElec ? 'FIJO LUZ' : 'VARIABLE GAS'

    const wsData = [
      ['Comercializadora', comercializadora],
      [],
      ['KWH_From', 'KWH_To', offer1, offer2],
      ['Fee', '', 0.5, ''],
      [1, 5000, 495, 485],
      [5001, 10000, 480, 470],
      [10001, 50000, 465, 455],
      [50001, 100000, 450, 440],
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, tarifa)
  }

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `plantilla_rangos_${comercializadora.replace(/\s+/g, '_').toLowerCase()}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Parser multi-hoja ─────────────────────────────────────────────────────

async function parseRateTableFile(file: File): Promise<ParsedRateTable> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })

  let comercializadora = ''
  const sheets: ParsedRateTableSheet[] = []

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 })

    if (json.length < 4) continue

    // Row 0: Comercializadora | nombre
    const row0 = json[0] as unknown[]
    if (!comercializadora && row0.length >= 2) {
      const val = String(row0[1] ?? '').trim()
      if (val) comercializadora = val
    }

    // Row 2: headers — KWH_From | KWH_To | OFERTA_1 | OFERTA_2 | ...
    const headerRow = json[2] as unknown[]
    if (!headerRow || headerRow.length < 3) continue

    const offerNames: string[] = []
    for (let c = 2; c < headerRow.length; c++) {
      const name = String(headerRow[c] ?? '').trim()
      if (name) offerNames.push(name)
    }

    if (offerNames.length === 0) continue

    // Row 3: Fee | (vacío) | fee1 | fee2 | ...
    const feeRow = json[3] as unknown[]
    const fees: (number | null)[] = offerNames.map((_, i) => {
      const val = feeRow?.[i + 2]
      if (val === undefined || val === null || val === '') return null
      const num = Number(val)
      return isNaN(num) ? null : num
    })

    // Row 4+: rangos de consumo
    const parsedOffers = offerNames.map((name, i) => ({
      offer_name: name,
      fee: fees[i],
      rates: [] as Array<{ kwh_from: number; kwh_to: number; commission: number }>,
    }))

    for (let r = 4; r < json.length; r++) {
      const dataRow = json[r] as unknown[]
      if (!dataRow || dataRow.length < 3) continue

      const kwhFrom = Number(dataRow[0])
      const kwhTo = Number(dataRow[1])
      if (isNaN(kwhFrom) || isNaN(kwhTo)) continue

      for (let c = 0; c < offerNames.length; c++) {
        const commission = Number(dataRow[c + 2])
        if (isNaN(commission)) continue
        parsedOffers[c].rates.push({ kwh_from: kwhFrom, kwh_to: kwhTo, commission })
      }
    }

    // Solo añadir si tiene al menos una oferta con rates
    const validOffers = parsedOffers.filter(o => o.rates.length > 0)
    if (validOffers.length > 0) {
      sheets.push({ tarifa: sheetName, offers: validOffers })
    }
  }

  return { comercializadora, sheets }
}

// ── Componente principal ──────────────────────────────────────────────────

export function RateTableUpload({ rateTables, rateTableUploads }: RateTableUploadProps) {
  const [templateName, setTemplateName] = useState('')
  const [parsed, setParsed] = useState<ParsedRateTable | null>(null)
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState('')
  const [activeSheet, setActiveSheet] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [state, formAction, isPending] = useActionState(processRateTableUpload, null)

  const handleDownloadTemplate = useCallback(async () => {
    if (!templateName.trim()) return
    setGenerating(true)
    try {
      await generateTemplate(templateName.trim())
    } finally {
      setGenerating(false)
    }
  }, [templateName])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setParseError('')
    setParsed(null)
    setFileName(file.name)
    setActiveSheet(0)

    try {
      const result = await parseRateTableFile(file)
      if (result.sheets.length === 0) {
        setParseError('No se encontraron hojas con datos válidos en el Excel.')
        return
      }
      if (!result.comercializadora) {
        setParseError('No se encontró el nombre de la comercializadora (celda B1).')
        return
      }
      setParsed(result)
    } catch {
      setParseError('Error al leer el archivo. Asegúrate de que sigue el formato de la plantilla.')
    }
  }, [])

  const clearFile = () => {
    setParsed(null)
    setFileName('')
    setParseError('')
    setActiveSheet(0)
  }

  const currentSheet = parsed?.sheets[activeSheet]
  const totalRates = parsed?.sheets.reduce(
    (acc, s) => acc + s.offers.reduce((a, o) => a + o.rates.length, 0), 0
  ) ?? 0

  return (
    <div className="space-y-6">
      {/* 1. Descargar plantilla */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4 text-primary" />
            Descargar plantilla
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Genera un archivo .xlsx con 10 hojas (6 electricidad + 4 gas) para rellenar las comisiones por rangos de consumo.
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1 max-w-xs">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Comercializadora</label>
              <input
                type="text"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="Ej: Iberdrola"
                className={inputClass}
              />
            </div>
            <Button
              onClick={handleDownloadTemplate}
              disabled={!templateName.trim() || generating}
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              {generating ? 'Generando...' : 'Descargar .xlsx'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Subir archivo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4 text-primary" />
            Subir tabla de rangos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!parsed ? (
            <>
              <label className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border/50 bg-accent/20 p-10 cursor-pointer hover:border-primary/40 transition-colors">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground/50" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Arrastra o selecciona un archivo .xlsx</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Una hoja por tarifa. Cada hoja: Comercializadora, headers, fees y rangos kWh.
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
                  <Badge variant="outline">{parsed.comercializadora}</Badge>
                  <Badge variant="outline">{parsed.sheets.length} hojas</Badge>
                  <Badge variant="outline">{totalRates} rangos</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Tabs por hoja/tarifa */}
              <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card/30 p-1">
                {parsed.sheets.map((sheet, i) => (
                  <button
                    key={sheet.tarifa}
                    onClick={() => setActiveSheet(i)}
                    className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                      activeSheet === i
                        ? 'bg-primary/15 text-primary border border-primary/20'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {sheet.tarifa}
                    <span className="ml-1 text-[10px] opacity-60">
                      ({sheet.offers.length})
                    </span>
                  </button>
                ))}
              </div>

              {/* Preview de la hoja activa */}
              {currentSheet && (
                <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                        <th className="px-3 py-2">KWH Desde</th>
                        <th className="px-3 py-2">KWH Hasta</th>
                        {currentSheet.offers.map(o => (
                          <th key={o.offer_name} className="px-3 py-2">
                            {o.offer_name}
                            {o.fee !== null && (
                              <span className="block text-[10px] font-normal text-muted-foreground/70">
                                Fee: {o.fee}
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Usar el primer offer como referencia de filas */}
                      {currentSheet.offers[0]?.rates.map((rate, ri) => (
                        <tr key={ri} className="border-b border-border/50">
                          <td className="px-3 py-1.5 font-mono text-xs">{rate.kwh_from.toLocaleString('es-ES')}</td>
                          <td className="px-3 py-1.5 font-mono text-xs">{rate.kwh_to.toLocaleString('es-ES')}</td>
                          {currentSheet.offers.map(o => (
                            <td key={o.offer_name} className="px-3 py-1.5">
                              {o.rates[ri]?.commission ?? '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Formulario de confirmación */}
              <form action={formAction}>
                <input type="hidden" name="file_name" value={fileName} />
                <input type="hidden" name="data" value={JSON.stringify(parsed)} />
                <Button type="submit" disabled={isPending}>
                  {isPending
                    ? 'Procesando...'
                    : `Confirmar subida — ${parsed.comercializadora} (${parsed.sheets.length} tarifas, ${totalRates} rangos)`
                  }
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
                        Subida completada: {state.totals?.sheets} hojas, {state.totals?.offers} ofertas, {state.totals?.rates} rangos.
                      </p>
                    ) : (
                      <p>{state.error}</p>
                    )}
                    {state.errors && state.errors.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-xs">
                        {state.errors.slice(0, 10).map((err, i) => (
                          <li key={i}>
                            {err.sheet ? `[${err.sheet}] ` : ''}{err.error}
                          </li>
                        ))}
                        {state.errors.length > 10 && (
                          <li>... y {state.errors.length - 10} errores mas</li>
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

      {/* 3. Tablas activas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Table2 className="h-4 w-4 text-primary" />
            Tablas activas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rateTables.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay tablas de rangos activas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="px-3 py-2">Comercializadora</th>
                    <th className="px-3 py-2">Version</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Subido por</th>
                  </tr>
                </thead>
                <tbody>
                  {rateTables.map(rt => (
                    <tr key={rt.id} className="border-b border-border/50">
                      <td className="px-3 py-2 font-medium">{rt.comercializadora_name}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">v{rt.version}</Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(rt.created_at).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{rt.uploaded_by_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Historial de subidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" />
            Historial de subidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rateTableUploads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay subidas previas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="px-3 py-2">Archivo</th>
                    <th className="px-3 py-2">Comercializadora</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Hojas</th>
                    <th className="px-3 py-2">Ofertas</th>
                    <th className="px-3 py-2">Rangos</th>
                    <th className="px-3 py-2">Errores</th>
                    <th className="px-3 py-2">Subido por</th>
                  </tr>
                </thead>
                <tbody>
                  {rateTableUploads.map(u => (
                    <tr key={u.id} className="border-b border-border/50">
                      <td className="px-3 py-2 font-medium">{u.file_name}</td>
                      <td className="px-3 py-2">{u.comercializadora_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-3 py-2 text-green-400">{u.totals?.sheets ?? '—'}</td>
                      <td className="px-3 py-2 text-green-400">{u.totals?.offers ?? '—'}</td>
                      <td className="px-3 py-2 text-green-400">{u.totals?.rates ?? '—'}</td>
                      <td className="px-3 py-2">
                        {u.errors && u.errors.length > 0 ? (
                          <span className="text-red-400">{u.errors.length}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{u.uploaded_by_name}</td>
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
