'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { getAuthProfile } from './auth'
import type { ActionResult } from './auth'
import type { EnergyProduct } from '@/lib/types'

export async function getEnergyProducts(companyId?: number): Promise<EnergyProduct[]> {
  const supabase = await createClient()

  let query = supabase
    .from('energy_products')
    .select('*, company:energy_companies!energy_products_company_id_fkey(name)')
    .eq('active', true)
    .order('name')

  if (companyId) {
    query = query.eq('company_id', companyId)
  }

  const { data } = await query

  return (data ?? []).map((row: Record<string, unknown>) => {
    const company = row.company as { name: string } | null
    return {
      id: row.id as number,
      company_id: row.company_id as number,
      name: row.name as string,
      fee_value: row.fee_value as number | null,
      fee_label: row.fee_label as string | null,
      active: row.active as boolean,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      company_name: company?.name,
    } satisfies EnergyProduct
  })
}

export async function createEnergyProduct(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') {
    return { ok: false, error: 'Solo ADMIN puede crear productos.' }
  }

  const companyId = Number(formData.get('company_id'))
  const name = (formData.get('name') as string)?.trim()
  const feeValue = formData.get('fee_value') ? Number(formData.get('fee_value')) : null
  const feeLabel = (formData.get('fee_label') as string)?.trim() || null

  if (!companyId || !name) return { ok: false, error: 'Comercializadora y nombre son obligatorios.' }

  const admin = getAdminClient()
  const { error } = await admin
    .from('energy_products')
    .insert({ company_id: companyId, name, fee_value: feeValue, fee_label: feeLabel })

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Ya existe este producto para esta comercializadora.' }
    return { ok: false, error: error.message }
  }

  revalidatePath('/comisionado')
  return { ok: true }
}

export async function updateEnergyProduct(
  id: number,
  formData: FormData
): Promise<ActionResult> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') {
    return { ok: false, error: 'Solo ADMIN puede editar productos.' }
  }

  const admin = getAdminClient()
  const updateData: Record<string, unknown> = {}

  const name = formData.get('name') as string | null
  if (name?.trim()) updateData.name = name.trim()

  const feeValue = formData.get('fee_value') as string | null
  if (feeValue !== null) updateData.fee_value = feeValue ? Number(feeValue) : null

  const feeLabel = formData.get('fee_label') as string | null
  if (feeLabel !== null) updateData.fee_label = feeLabel?.trim() || null

  const active = formData.get('active') as string | null
  if (active !== null) updateData.active = active === 'true'

  const { error } = await admin
    .from('energy_products')
    .update(updateData)
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/comisionado')
  return { ok: true }
}
