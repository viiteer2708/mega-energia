'use server'

import { revalidatePath } from 'next/cache'
import { getAdminClient } from '@/lib/supabase/admin'
import { getAuthProfile } from './auth'
import type { ActionResult } from './auth'
import type { CommissionRate } from '@/lib/types'

export async function getCommissionRates(productId?: number): Promise<CommissionRate[]> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') return []

  let query = auth.supabase
    .from('commission_rates')
    .select('*, product:energy_products!commission_rates_product_id_fkey(name)')
    .order('tariff')
    .order('consumption_min')

  if (productId) {
    query = query.eq('product_id', productId)
  }

  const { data } = await query

  return (data ?? []).map((row: Record<string, unknown>) => {
    const product = row.product as { name: string } | null
    return {
      id: row.id as number,
      product_id: row.product_id as number,
      tariff: row.tariff as string,
      consumption_min: row.consumption_min as number,
      consumption_max: row.consumption_max as number,
      gross_amount: row.gross_amount as number,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      product_name: product?.name,
    } satisfies CommissionRate
  })
}

interface CreateRateResult extends ActionResult {
  rate?: {
    id: number
    product_id: number
    tariff: string
    consumption_min: number
    consumption_max: number
    gross_amount: number
    created_at: string
    updated_at: string
  }
}

export async function updateCommissionRate(
  rateId: number,
  grossAmount: number,
): Promise<ActionResult> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') {
    return { ok: false, error: 'Solo ADMIN.' }
  }

  const admin = getAdminClient()
  const { error } = await admin
    .from('commission_rates')
    .update({ gross_amount: grossAmount })
    .eq('id', rateId)

  if (error) return { ok: false, error: error.message }

  await admin.from('audit_log').insert({
    user_id: auth.userId,
    action: 'commission_rate_update',
    details: { rate_id: rateId, gross_amount: grossAmount },
  })

  revalidatePath('/comisionado')
  return { ok: true }
}

export async function createCommissionRate(
  productId: number,
  tariff: string,
  consumptionMin: number,
  consumptionMax: number,
  grossAmount: number,
): Promise<CreateRateResult> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') {
    return { ok: false, error: 'Solo ADMIN.' }
  }

  if (consumptionMin > consumptionMax) {
    return { ok: false, error: 'Consumo min no puede ser mayor que max.' }
  }

  const admin = getAdminClient()

  const { data: overlapping } = await admin
    .from('commission_rates')
    .select('id, consumption_min, consumption_max')
    .eq('product_id', productId)
    .eq('tariff', tariff)
    .or(`and(consumption_min.lte.${consumptionMax},consumption_max.gte.${consumptionMin})`)

  if (overlapping && overlapping.length > 0) {
    return { ok: false, error: `Solapamiento con rango existente: ${overlapping[0].consumption_min}-${overlapping[0].consumption_max}.` }
  }

  const { data, error } = await admin
    .from('commission_rates')
    .insert({
      product_id: productId,
      tariff,
      consumption_min: consumptionMin,
      consumption_max: consumptionMax,
      gross_amount: grossAmount,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  await admin.from('audit_log').insert({
    user_id: auth.userId,
    action: 'commission_rate_create',
    details: { product_id: productId, tariff, consumption_min: consumptionMin, consumption_max: consumptionMax, gross_amount: grossAmount },
  })

  revalidatePath('/comisionado')
  return {
    ok: true,
    rate: data as CreateRateResult['rate'],
  }
}

export async function deleteCommissionRate(rateId: number): Promise<ActionResult> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') {
    return { ok: false, error: 'Solo ADMIN.' }
  }

  const admin = getAdminClient()

  const { data: existing } = await admin
    .from('commission_rates')
    .select('*')
    .eq('id', rateId)
    .single()

  const { error } = await admin
    .from('commission_rates')
    .delete()
    .eq('id', rateId)

  if (error) return { ok: false, error: error.message }

  await admin.from('audit_log').insert({
    user_id: auth.userId,
    action: 'commission_rate_delete',
    details: { rate_id: rateId, deleted_data: existing },
  })

  revalidatePath('/comisionado')
  return { ok: true }
}

export async function getCommissionRatesForCompany(
  companyId: number,
  filters?: { productId?: number; tariff?: string },
): Promise<CommissionRate[]> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') return []

  const admin = getAdminClient()

  const { data: companyProducts } = await admin
    .from('energy_products')
    .select('id')
    .eq('company_id', companyId)

  if (!companyProducts || companyProducts.length === 0) return []

  const productIds = companyProducts.map(p => p.id as number)

  let query = admin
    .from('commission_rates')
    .select('*')
    .in('product_id', productIds)
    .order('tariff')
    .order('consumption_min')

  if (filters?.productId) {
    query = query.eq('product_id', filters.productId)
  }
  if (filters?.tariff) {
    query = query.eq('tariff', filters.tariff)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getCommissionRatesForCompany]', error.message)
    return []
  }

  return (data ?? []) as CommissionRate[]
}
