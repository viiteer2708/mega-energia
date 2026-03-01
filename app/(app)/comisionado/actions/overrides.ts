'use server'

import { revalidatePath } from 'next/cache'
import { getAdminClient } from '@/lib/supabase/admin'
import { getAuthProfile } from './auth'
import type { ActionResult } from './auth'
import type { UserCommissionOverride } from '@/lib/types'

export async function getUserOverrides(userId: string): Promise<UserCommissionOverride[]> {
  const auth = await getAuthProfile()
  if (!auth) return []

  const { data } = await auth.supabase
    .from('user_commission_overrides')
    .select('*, user:profiles!user_commission_overrides_user_id_fkey(full_name), product:energy_products!user_commission_overrides_product_id_fkey(name)')
    .eq('user_id', userId)
    .order('product_id', { nullsFirst: true })

  return (data ?? []).map((row: Record<string, unknown>) => {
    const user = row.user as { full_name: string } | null
    const product = row.product as { name: string } | null
    return {
      id: row.id as number,
      user_id: row.user_id as string,
      product_id: row.product_id as number | null,
      override_type: row.override_type as UserCommissionOverride['override_type'],
      override_value: row.override_value as number,
      set_by_user_id: row.set_by_user_id as string,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      user_name: user?.full_name,
      product_name: product?.name,
    } satisfies UserCommissionOverride
  })
}

export async function setUserOverride(
  userId: string,
  productId: number | null,
  overrideType: 'percentage' | 'fixed',
  overrideValue: number
): Promise<ActionResult> {
  const auth = await getAuthProfile()
  if (!auth) return { ok: false, error: 'No autenticado.' }

  const admin = getAdminClient()

  const { error } = await admin
    .from('user_commission_overrides')
    .upsert(
      {
        user_id: userId,
        product_id: productId,
        override_type: overrideType,
        override_value: overrideValue,
        set_by_user_id: auth.userId,
      },
      { onConflict: 'user_id,product_id' }
    )

  if (error) return { ok: false, error: error.message }

  revalidatePath('/comisionado')
  return { ok: true }
}
