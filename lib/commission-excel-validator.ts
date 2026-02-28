import type {
  ParsedCommissionExcel,
  EnergyProduct,
  EnergyCompany,
  CommissionRate,
  CommissionValidationResult,
  CommissionValidationError,
  CommissionValidationWarning,
} from '@/lib/types'
import { VALID_TARIFF_SHEETS } from '@/lib/types'

/**
 * Valida datos parseados de un Excel de comisiones.
 * Devuelve errores bloqueantes, advertencias y resumen de impacto.
 */
export function validateCommissionData(
  parsed: ParsedCommissionExcel,
  existingProducts: EnergyProduct[],
  existingCompanies: EnergyCompany[],
  existingRates?: CommissionRate[],
): CommissionValidationResult {
  const errors: CommissionValidationError[] = []
  const warnings: CommissionValidationWarning[] = []
  const newProducts: string[] = []
  const existingProductNames: string[] = []
  const ratesByTariff: Record<string, { new_count: number; update_count: number }> = {}

  const validTariffs = new Set(VALID_TARIFF_SHEETS as readonly string[])

  // Validar nombre de comercializadora
  if (!parsed.company_name?.trim()) {
    errors.push({
      type: 'empty_name',
      message: 'El nombre de la comercializadora está vacío.',
    })
  }

  // Verificar si la comercializadora ya existe
  const existingCompany = existingCompanies.find(
    c => c.name.toLowerCase() === parsed.company_name?.trim().toLowerCase()
  )

  // Validar productos y rates
  const seenProductKeys = new Set<string>()
  const tariffProductRates = new Map<string, Array<{ min: number; max: number; product: string; row: number }>>()

  for (const product of parsed.products) {
    // Nombre vacío
    if (!product.name?.trim()) {
      errors.push({
        type: 'empty_field',
        message: 'Producto con nombre vacío.',
        tariff: product.tariff,
      })
      continue
    }

    // Tarifa inválida
    if (!validTariffs.has(product.tariff)) {
      errors.push({
        type: 'invalid_tariff',
        message: `Tarifa "${product.tariff}" no reconocida.`,
        tariff: product.tariff,
        product: product.name,
      })
    }

    // Producto duplicado en el mismo Excel (misma tarifa + nombre + fee)
    const productKey = `${product.tariff}|${product.name}|${product.fee_value ?? 'null'}`
    if (seenProductKeys.has(productKey)) {
      errors.push({
        type: 'duplicate_product',
        message: `Producto "${product.name}" duplicado en tarifa ${product.tariff}.`,
        tariff: product.tariff,
        product: product.name,
      })
    }
    seenProductKeys.add(productKey)

    // Clasificar como nuevo o existente
    if (existingCompany) {
      const match = existingProducts.find(
        p => p.company_id === existingCompany.id
          && p.name === product.name
          && p.fee_value === (product.fee_value ?? null)
      )
      if (match) {
        if (!existingProductNames.includes(product.name)) {
          existingProductNames.push(product.name)
        }
      } else {
        if (!newProducts.includes(product.name)) {
          newProducts.push(product.name)
        }
      }
    } else {
      if (!newProducts.includes(product.name)) {
        newProducts.push(product.name)
      }
    }

    // Sin rates
    if (!product.rates || product.rates.length === 0) {
      warnings.push({
        type: 'product_no_rates',
        message: `Producto "${product.name}" sin rangos en tarifa ${product.tariff}.`,
        tariff: product.tariff,
        product: product.name,
      })
      continue
    }

    // Inicializar conteo de tarifa
    if (!ratesByTariff[product.tariff]) {
      ratesByTariff[product.tariff] = { new_count: 0, update_count: 0 }
    }

    // Validar cada rate
    const rangesForProduct: Array<{ min: number; max: number; row: number }> = []

    for (let i = 0; i < product.rates.length; i++) {
      const rate = product.rates[i]

      // Comisión negativa
      if (rate.gross_amount < 0) {
        errors.push({
          type: 'negative',
          message: `Comisión negativa (${rate.gross_amount}) en "${product.name}", tarifa ${product.tariff}, rango ${rate.consumption_min}-${rate.consumption_max}.`,
          tariff: product.tariff,
          product: product.name,
          row: i + 3, // offset por cabeceras
        })
      }

      // Min > Max
      if (rate.consumption_min > rate.consumption_max) {
        errors.push({
          type: 'min_gt_max',
          message: `Consumo mín (${rate.consumption_min}) > máx (${rate.consumption_max}) en "${product.name}", tarifa ${product.tariff}.`,
          tariff: product.tariff,
          product: product.name,
          row: i + 3,
        })
      }

      rangesForProduct.push({ min: rate.consumption_min, max: rate.consumption_max, row: i + 3 })

      // Contar nuevos vs actualizados
      if (existingRates) {
        const matchingProduct = existingProducts.find(
          p => p.company_id === existingCompany?.id && p.name === product.name
        )
        if (matchingProduct) {
          const existingRate = existingRates.find(
            r => r.product_id === matchingProduct.id
              && r.tariff === product.tariff
              && r.consumption_min === rate.consumption_min
              && r.consumption_max === rate.consumption_max
          )
          if (existingRate) {
            ratesByTariff[product.tariff].update_count++
          } else {
            ratesByTariff[product.tariff].new_count++
          }
        } else {
          ratesByTariff[product.tariff].new_count++
        }
      } else {
        ratesByTariff[product.tariff].new_count++
      }
    }

    // Detectar solapamiento de rangos dentro del mismo producto+tarifa
    const sorted = [...rangesForProduct].sort((a, b) => a.min - b.min)
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].min <= sorted[i - 1].max) {
        errors.push({
          type: 'overlap',
          message: `Rangos solapados en "${product.name}", tarifa ${product.tariff}: [${sorted[i - 1].min}-${sorted[i - 1].max}] y [${sorted[i].min}-${sorted[i].max}].`,
          tariff: product.tariff,
          product: product.name,
          row: sorted[i].row,
        })
      }
    }

    // Detectar huecos en rangos (advertencia)
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].min > sorted[i - 1].max + 1) {
        warnings.push({
          type: 'gap_in_ranges',
          message: `Hueco en rangos de "${product.name}", tarifa ${product.tariff}: ${sorted[i - 1].max + 1} - ${sorted[i].min - 1}.`,
          tariff: product.tariff,
          product: product.name,
        })
      }
    }

    // Acumular rangos para detección cross-product
    const tariffKey = `${product.tariff}|${product.name}`
    if (!tariffProductRates.has(tariffKey)) {
      tariffProductRates.set(tariffKey, [])
    }
    tariffProductRates.get(tariffKey)!.push(
      ...rangesForProduct.map(r => ({ ...r, product: product.name }))
    )
  }

  // Detectar hojas vacías del set esperado
  const tariffsSeen = new Set(parsed.products.map(p => p.tariff))
  for (const tariff of VALID_TARIFF_SHEETS) {
    if (!tariffsSeen.has(tariff)) {
      warnings.push({
        type: 'empty_sheet',
        message: `No hay datos para la tarifa ${tariff}.`,
        tariff,
      })
    }
  }

  const totalRates = parsed.products.reduce((acc, p) => acc + (p.rates?.length ?? 0), 0)

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      new_products: newProducts,
      existing_products: existingProductNames,
      rates_by_tariff: ratesByTariff,
      total_rates: totalRates,
    },
  }
}
