'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { getAuthProfile } from './auth'
import type { ActionResult } from './auth'
import type { EnergyCompany } from '@/lib/types'

export async function getEnergyCompanies(): Promise<EnergyCompany[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('energy_companies')
    .select('*')
    .eq('active', true)
    .order('name')

  return (data ?? []) as EnergyCompany[]
}

export async function createEnergyCompany(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') {
    return { ok: false, error: 'Solo ADMIN puede crear comercializadoras.' }
  }

  const name = (formData.get('name') as string)?.trim()
  const commissionModel = (formData.get('commission_model') as string) || 'table'
  const gnewMarginPct = Number(formData.get('gnew_margin_pct') || 0)

  if (!name) return { ok: false, error: 'El nombre es obligatorio.' }

  const admin = getAdminClient()
  const { error } = await admin
    .from('energy_companies')
    .insert({
      name,
      commission_model: commissionModel,
      gnew_margin_pct: gnewMarginPct,
    })

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Ya existe una comercializadora con ese nombre.' }
    return { ok: false, error: error.message }
  }

  revalidatePath('/comisionado')
  return { ok: true }
}

export async function updateEnergyCompany(
  id: number,
  formData: FormData
): Promise<ActionResult> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') {
    return { ok: false, error: 'Solo ADMIN puede editar comercializadoras.' }
  }

  const admin = getAdminClient()
  const updateData: Record<string, unknown> = {}

  const name = formData.get('name') as string | null
  if (name?.trim()) updateData.name = name.trim()

  const model = formData.get('commission_model') as string | null
  if (model) updateData.commission_model = model

  const margin = formData.get('gnew_margin_pct') as string | null
  if (margin !== null) updateData.gnew_margin_pct = Number(margin)

  const active = formData.get('active') as string | null
  if (active !== null) updateData.active = active === 'true'

  const { error } = await admin
    .from('energy_companies')
    .update(updateData)
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/comisionado')
  return { ok: true }
}
