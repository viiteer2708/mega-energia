import type { ParsedCommissionExcel, CommissionModel } from '@/lib/types'
import { VALID_TARIFF_SHEETS } from '@/lib/types'

/**
 * Parser para Excel de comisiones formato CRM GNEW v3.
 *
 * Estructura esperada:
 * - Hoja "CONFIG": A2=comercializadora, B2=modelo (table/formula), C2=margen GNEW (decimal)
 * - Hojas de tarifa (2.0TD, 3.0TD, etc.):
 *   - Fila 1: cabeceras (ignorada o vacía)
 *   - Fila 2: Producto | Fee | Consumo Mín | Consumo Máx | Comisión
 *   - Fila 3+: datos
 */
export async function parseCommissionExcel(file: File): Promise<ParsedCommissionExcel> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })

  // 1. Leer hoja CONFIG
  let companyName = ''
  let commissionModel: CommissionModel = 'table'
  let gnewMarginPct = 0

  const configSheet = workbook.Sheets['CONFIG'] ?? workbook.Sheets['config']
  if (configSheet) {
    const configData = XLSX.utils.sheet_to_json<unknown[]>(configSheet, { header: 1 })

    // A2 (row index 1) = comercializadora
    if (configData[1]) {
      const row = configData[1] as unknown[]
      companyName = String(row[0] ?? '').trim()
    }
    // B2 = modelo
    if (configData[1]) {
      const row = configData[1] as unknown[]
      const model = String(row[1] ?? '').trim().toLowerCase()
      if (model === 'formula' || model === 'fórmula') {
        commissionModel = 'formula'
      }
    }
    // C2 = margen GNEW (como decimal, ej: 0.15 para 15%)
    if (configData[1]) {
      const row = configData[1] as unknown[]
      const margin = Number(row[2])
      if (!isNaN(margin)) {
        gnewMarginPct = margin
      }
    }
  } else {
    // Fallback: buscar en la primera hoja de tarifa (celda B1)
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    if (firstSheet) {
      const data = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1 })
      if (data[0]) {
        const row = data[0] as unknown[]
        const val = String(row[1] ?? '').trim()
        if (val) companyName = val
      }
    }
  }

  // 2. Leer hojas de tarifa
  const validSheetNames = new Set(VALID_TARIFF_SHEETS as readonly string[])
  const products: ParsedCommissionExcel['products'] = []

  for (const sheetName of workbook.SheetNames) {
    // Ignorar CONFIG y hojas no reconocidas
    if (sheetName.toUpperCase() === 'CONFIG') continue
    if (!validSheetNames.has(sheetName)) continue

    const ws = workbook.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 })

    // Necesitamos al menos cabecera + 1 fila de datos
    if (json.length < 3) continue

    // Fila 2 (index 1): cabeceras — Producto | Fee | Consumo Mín | Consumo Máx | Comisión
    // Verificar que tiene la estructura esperada
    const headerRow = json[1] as unknown[]
    if (!headerRow || headerRow.length < 5) continue

    // Leer datos desde fila 3 (index 2)
    const productMap = new Map<string, {
      name: string
      fee_value: number | null
      fee_label: string | null
      tariff: string
      rates: Array<{ consumption_min: number; consumption_max: number; gross_amount: number }>
    }>()

    for (let r = 2; r < json.length; r++) {
      const row = json[r] as unknown[]
      if (!row || row.length < 5) continue

      const productName = String(row[0] ?? '').trim()
      if (!productName) continue

      const feeRaw = row[1]
      const consumptionMin = Number(row[2])
      const consumptionMax = Number(row[3])
      const grossAmount = Number(row[4])

      if (isNaN(consumptionMin) || isNaN(consumptionMax) || isNaN(grossAmount)) continue

      const feeValue = (feeRaw !== undefined && feeRaw !== null && feeRaw !== '')
        ? Number(feeRaw)
        : null
      const feeLabel = feeValue !== null && !isNaN(feeValue) ? String(feeValue) : null

      // Agrupar por producto+fee dentro de la misma tarifa
      const key = `${productName}|${feeValue ?? 'null'}`

      if (!productMap.has(key)) {
        productMap.set(key, {
          name: productName,
          fee_value: feeValue !== null && !isNaN(feeValue) ? feeValue : null,
          fee_label: feeLabel,
          tariff: sheetName,
          rates: [],
        })
      }

      productMap.get(key)!.rates.push({
        consumption_min: consumptionMin,
        consumption_max: consumptionMax,
        gross_amount: grossAmount,
      })
    }

    for (const product of productMap.values()) {
      if (product.rates.length > 0) {
        products.push(product)
      }
    }
  }

  return {
    company_name: companyName,
    commission_model: commissionModel,
    gnew_margin_pct: gnewMarginPct,
    products,
  }
}
