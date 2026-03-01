'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { getAuthProfile } from './auth'
import type { ActionResult } from './auth'
import type { CommissionTier } from '@/lib/types'

export async function getCommissionTiers(): Promise<CommissionTier[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('commission_tiers')
    .select('*')
    .order('sort_order')

  return (data ?? []) as CommissionTier[]
}

export async function upsertCommissionTier(
  formData: FormData
): Promise<ActionResult> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') {
    return { ok: false, error: 'Solo ADMIN puede editar comisionados.' }
  }

  const admin = getAdminClient()
  const id = formData.get('id') ? Number(formData.get('id')) : null
  const name = (formData.get('name') as string)?.trim().toUpperCase()
  const ratePct = formData.get('rate_pct') ? Number(formData.get('rate_pct')) : null
  const sortOrder = Number(formData.get('sort_order') || 0)

  if (!name) return { ok: false, error: 'El nombre es obligatorio.' }

  if (id) {
    const { error } = await admin
      .from('commission_tiers')
      .update({ name, rate_pct: ratePct, sort_order: sortOrder })
      .eq('id', id)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await admin
      .from('commission_tiers')
      .insert({ name, rate_pct: ratePct, sort_order: sortOrder })
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath('/comisionado')
  return { ok: true }
}
