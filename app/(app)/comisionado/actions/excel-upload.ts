'use server'

import { revalidatePath } from 'next/cache'
import { getAdminClient } from '@/lib/supabase/admin'
import { getAuthProfile } from './auth'
import type { ActionResult } from './auth'
import type { ParsedCommissionExcel, CommissionUploadV2 } from '@/lib/types'

interface ExcelUploadResult extends ActionResult {
  companies_created?: number
  products_created?: number
  rates_upserted?: number
  records_created?: number
  records_updated?: number
}

export async function processCommissionExcelUpload(
  _prev: ExcelUploadResult | null,
  formData: FormData
): Promise<ExcelUploadResult> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') {
    return { ok: false, error: 'Solo ADMIN puede cargar Excel de comisiones.' }
  }

  const jsonData = formData.get('data') as string
  const fileName = formData.get('file_name') as string

  if (!jsonData || !fileName) {
    return { ok: false, error: 'Datos no recibidos.' }
  }

  let parsed: ParsedCommissionExcel
  try {
    parsed = JSON.parse(jsonData)
  } catch {
    return { ok: false, error: 'Formato de datos invalido.' }
  }

  if (!parsed.company_name?.trim()) {
    return { ok: false, error: 'Comercializadora es obligatoria.' }
  }

  const admin = getAdminClient()
  let companiesCreated = 0
  let productsCreated = 0
  let recordsCreated = 0
  let recordsUpdated = 0
  const tariffSummary: Record<string, { products: number; rates_created: number; rates_updated: number }> = {}

  // 1. Upsert comercializadora (1 query)
  const { data: existingCompany } = await admin
    .from('energy_companies')
    .select('id')
    .eq('name', parsed.company_name.trim())
    .maybeSingle()

  let companyId: number

  if (existingCompany) {
    companyId = existingCompany.id as number
    await admin
      .from('energy_companies')
      .update({
        gnew_margin_pct: parsed.gnew_margin_pct,
        commission_model: parsed.commission_model,
      })
      .eq('id', companyId)
  } else {
    const { data: newCompany, error: companyError } = await admin
      .from('energy_companies')
      .insert({
        name: parsed.company_name.trim(),
        commission_model: parsed.commission_model,
        gnew_margin_pct: parsed.gnew_margin_pct,
      })
      .select('id')
      .single()

    if (companyError || !newCompany) {
      return { ok: false, error: companyError?.message ?? 'Error al crear comercializadora.' }
    }
    companyId = newCompany.id as number
    companiesCreated++
  }

  // 2. Batch: obtener todos los productos existentes del company (1 query)
  const { data: existingProducts } = await admin
    .from('energy_products')
    .select('id, name, fee_value')
    .eq('company_id', companyId)

  const productMap = new Map<string, number>()
  for (const p of existingProducts ?? []) {
    const key = `${p.name}|${p.fee_value ?? 0}`
    productMap.set(key, p.id as number)
  }

  // 3. Identificar productos nuevos y hacer batch insert (1 query)
  const uniqueProducts = new Map<string, { name: string; fee_value: number | null; fee_label: string | null }>()
  for (const product of parsed.products) {
    const key = `${product.name}|${product.fee_value ?? 0}`
    if (!productMap.has(key) && !uniqueProducts.has(key)) {
      uniqueProducts.set(key, {
        name: product.name,
        fee_value: product.fee_value,
        fee_label: product.fee_label,
      })
    }
  }

  if (uniqueProducts.size > 0) {
    const newProducts = Array.from(uniqueProducts.values()).map(p => ({
      company_id: companyId,
      name: p.name,
      fee_value: p.fee_value,
      fee_label: p.fee_label,
    }))

    const { data: insertedProducts, error: prodError } = await admin
      .from('energy_products')
      .insert(newProducts)
      .select('id, name, fee_value')

    if (prodError) {
      return { ok: false, error: `Error al crear productos: ${prodError.message}` }
    }

    for (const p of insertedProducts ?? []) {
      const key = `${p.name}|${p.fee_value ?? 0}`
      productMap.set(key, p.id as number)
    }
    productsCreated = insertedProducts?.length ?? 0
  }

  // 4. Batch: obtener todos los rates existentes del company (1 query)
  const allProductIds = Array.from(productMap.values())
  const { data: existingRates } = allProductIds.length > 0
    ? await admin
        .from('commission_rates')
        .select('id, product_id, tariff, consumption_min, consumption_max')
        .in('product_id', allProductIds)
    : { data: [] }

  const existingRateSet = new Set<string>()
  for (const r of existingRates ?? []) {
    existingRateSet.add(`${r.product_id}|${r.tariff}|${r.consumption_min}|${r.consumption_max}`)
  }

  // 5. Preparar batch upsert de rates y contar created vs updated
  const ratesToUpsert: Array<{
    product_id: number
    tariff: string
    consumption_min: number
    consumption_max: number
    gross_amount: number
  }> = []

  for (const product of parsed.products) {
    const productKey = `${product.name}|${product.fee_value ?? 0}`
    const productDbId = productMap.get(productKey)
    if (!productDbId) continue

    if (!tariffSummary[product.tariff]) {
      tariffSummary[product.tariff] = { products: 0, rates_created: 0, rates_updated: 0 }
    }

    for (const rate of product.rates) {
      const rateKey = `${productDbId}|${product.tariff}|${rate.consumption_min}|${rate.consumption_max}`
      const isExisting = existingRateSet.has(rateKey)

      ratesToUpsert.push({
        product_id: productDbId,
        tariff: product.tariff,
        consumption_min: rate.consumption_min,
        consumption_max: rate.consumption_max,
        gross_amount: rate.gross_amount,
      })

      if (isExisting) {
        recordsUpdated++
        tariffSummary[product.tariff].rates_updated++
      } else {
        recordsCreated++
        tariffSummary[product.tariff].rates_created++
      }
    }
  }

  // 6. Batch upsert rates (1 query en vez de N)
  if (ratesToUpsert.length > 0) {
    const BATCH_SIZE = 500
    for (let i = 0; i < ratesToUpsert.length; i += BATCH_SIZE) {
      const batch = ratesToUpsert.slice(i, i + BATCH_SIZE)
      const { error: rateError } = await admin
        .from('commission_rates')
        .upsert(batch, { onConflict: 'product_id,tariff,consumption_min,consumption_max' })

      if (rateError) {
        return { ok: false, error: `Error al cargar rates (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${rateError.message}` }
      }
    }
  }

  // Contabilizar productos nuevos por tarifa
  for (const product of parsed.products) {
    const productKey = `${product.name}|${product.fee_value ?? 0}`
    if (!productMap.has(productKey)) continue
    if (!tariffSummary[product.tariff]) continue
    // Solo contar si el producto fue nuevo (no existia antes del batch)
    const wasNew = !(existingProducts ?? []).some(
      ep => ep.name === product.name && (ep.fee_value ?? 0) === (product.fee_value ?? 0)
    )
    if (wasNew) {
      tariffSummary[product.tariff].products++
    }
  }

  // 7. Registrar en commission_uploads
  await admin.from('commission_uploads').insert({
    file_name: fileName,
    uploaded_by: auth.userId,
    company_id: companyId,
    records_created: recordsCreated,
    records_updated: recordsUpdated,
    products_created: productsCreated,
    total_rows: recordsCreated + recordsUpdated,
    updated_rows: recordsUpdated,
    error_rows: 0,
    summary: {
      tariffs: tariffSummary,
      total_products: productsCreated,
      total_rates: recordsCreated + recordsUpdated,
    },
  })

  await admin.from('audit_log').insert({
    user_id: auth.userId,
    action: 'commission_excel_upload_v2',
    details: {
      file_name: fileName,
      company: parsed.company_name,
      companies_created: companiesCreated,
      products_created: productsCreated,
      records_created: recordsCreated,
      records_updated: recordsUpdated,
    },
  })

  revalidatePath('/comisionado')
  return {
    ok: true,
    companies_created: companiesCreated,
    products_created: productsCreated,
    rates_upserted: recordsCreated + recordsUpdated,
    records_created: recordsCreated,
    records_updated: recordsUpdated,
  }
}

export async function getCommissionUploads(companyId: number): Promise<CommissionUploadV2[]> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') return []

  const admin = getAdminClient()

  const { data, error } = await admin
    .from('commission_uploads')
    .select(`
      *,
      company:energy_companies!commission_uploads_company_id_fkey(name),
      uploader:profiles!commission_uploads_uploaded_by_fkey(full_name)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[getCommissionUploads]', error.message)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const company = row.company as { name: string } | null
    const uploader = row.uploader as { full_name: string } | null
    return {
      id: row.id as number,
      company_id: row.company_id as number,
      file_name: row.file_name as string,
      file_path: (row.file_path as string) ?? null,
      records_created: (row.records_created as number) ?? 0,
      records_updated: (row.records_updated as number) ?? 0,
      products_created: (row.products_created as number) ?? 0,
      summary: row.summary as CommissionUploadV2['summary'],
      uploaded_by: row.uploaded_by as string,
      created_at: row.created_at as string,
      company_name: company?.name ?? '',
      uploaded_by_name: uploader?.full_name ?? '',
    } satisfies CommissionUploadV2
  })
}
