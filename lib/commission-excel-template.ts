import type { EnergyCompany, EnergyProduct, CommissionRate, CommissionModel } from '@/lib/types'
import { VALID_TARIFF_SHEETS } from '@/lib/types'

/**
 * Genera una plantilla Excel vacía para carga de comisiones.
 */
export async function generateCommissionTemplate(companyName: string, model: CommissionModel = 'table') {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  // Hoja CONFIG
  const configData = [
    ['Comercializadora', 'Modelo', 'Margen GNEW'],
    [companyName, model, 0],
  ]
  const configSheet = XLSX.utils.aoa_to_sheet(configData)
  configSheet['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, configSheet, 'CONFIG')

  // Hojas de tarifa
  for (const tariff of VALID_TARIFF_SHEETS) {
    const sheetData = [
      ['Tarifa', tariff],
      ['Producto', 'Fee', 'Consumo Mín', 'Consumo Máx', 'Comisión'],
      ['PRODUCTO_1', '', 1, 5000, 0],
      ['PRODUCTO_1', '', 5001, 10000, 0],
      ['PRODUCTO_1', '', 10001, 50000, 0],
    ]
    const ws = XLSX.utils.aoa_to_sheet(sheetData)
    ws['!cols'] = [
      { wch: 16 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, tariff)
  }

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `plantilla_comisiones_${companyName.replace(/\s+/g, '_').toLowerCase()}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Exporta los datos reales de comisiones de una comercializadora a formato plantilla Excel.
 */
export async function exportCompanyRatesToExcel(
  company: EnergyCompany,
  products: EnergyProduct[],
  rates: CommissionRate[],
) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  // Hoja CONFIG
  const configData = [
    ['Comercializadora', 'Modelo', 'Margen GNEW'],
    [company.name, company.commission_model, company.gnew_margin_pct],
  ]
  const configSheet = XLSX.utils.aoa_to_sheet(configData)
  configSheet['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, configSheet, 'CONFIG')

  // Agrupar rates por tarifa
  const ratesByTariff = new Map<string, Array<CommissionRate & { product_name: string; fee_value: number | null }>>()

  for (const rate of rates) {
    const product = products.find(p => p.id === rate.product_id)
    if (!product) continue

    if (!ratesByTariff.has(rate.tariff)) {
      ratesByTariff.set(rate.tariff, [])
    }
    ratesByTariff.get(rate.tariff)!.push({
      ...rate,
      product_name: product.name,
      fee_value: product.fee_value,
    })
  }

  // Crear hojas para cada tarifa con datos
  for (const tariff of VALID_TARIFF_SHEETS) {
    const tariffRates = ratesByTariff.get(tariff)

    const sheetData: unknown[][] = [
      ['Tarifa', tariff],
      ['Producto', 'Fee', 'Consumo Mín', 'Consumo Máx', 'Comisión'],
    ]

    if (tariffRates && tariffRates.length > 0) {
      // Ordenar por producto, luego por consumo mín
      tariffRates.sort((a, b) => {
        if (a.product_name !== b.product_name) return a.product_name.localeCompare(b.product_name)
        return a.consumption_min - b.consumption_min
      })

      for (const rate of tariffRates) {
        sheetData.push([
          rate.product_name,
          rate.fee_value ?? '',
          rate.consumption_min,
          rate.consumption_max,
          rate.gross_amount,
        ])
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData)
    ws['!cols'] = [
      { wch: 16 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, tariff)
  }

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `comisiones_${company.name.replace(/\s+/g, '_').toLowerCase()}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
