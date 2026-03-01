'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { getAuthProfile } from './auth'
import type { ActionResult } from './auth'
import type { FormulaConfig, FormulaFeeOption } from '@/lib/types'

export async function getFormulaConfigs(companyId?: number): Promise<FormulaConfig[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('formula_configs')
    .select('*, product:energy_products!formula_configs_product_id_fkey(name, company_id)')
    .order('product_id')

  return (data ?? [])
    .filter((row: Record<string, unknown>) => {
      if (!companyId) return true
      const product = row.product as { company_id: number } | null
      return product?.company_id === companyId
    })
    .map((row: Record<string, unknown>) => {
      const product = row.product as { name: string } | null
      return {
        id: row.id as number,
        product_id: row.product_id as number,
        pricing_type: row.pricing_type as FormulaConfig['pricing_type'],
        fee_energia: row.fee_energia as number | null,
        fee_energia_fijo: row.fee_energia_fijo as number | null,
        margen_intermediacion: row.margen_intermediacion as number,
        fee_potencia: row.fee_potencia as number | null,
        potencia_calc_method: row.potencia_calc_method as FormulaConfig['potencia_calc_method'],
        comision_servicio: row.comision_servicio as number,
        factor_potencia: row.factor_potencia as number,
        factor_energia: row.factor_energia as number,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        product_name: product?.name,
      } satisfies FormulaConfig
    })
}

export async function upsertFormulaConfig(
  productId: number,
  formData: FormData
): Promise<ActionResult> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') {
    return { ok: false, error: 'Solo ADMIN puede configurar formulas.' }
  }

  const admin = getAdminClient()

  const configData = {
    product_id: productId,
    pricing_type: (formData.get('pricing_type') as string) || 'indexado',
    fee_energia: formData.get('fee_energia') ? Number(formData.get('fee_energia')) : null,
    fee_energia_fijo: formData.get('fee_energia_fijo') ? Number(formData.get('fee_energia_fijo')) : null,
    margen_intermediacion: Number(formData.get('margen_intermediacion') || 0),
    fee_potencia: formData.get('fee_potencia') ? Number(formData.get('fee_potencia')) : null,
    potencia_calc_method: (formData.get('potencia_calc_method') as string) || 'sum_periods',
    comision_servicio: Number(formData.get('comision_servicio') || 0),
    factor_potencia: Number(formData.get('factor_potencia') || 1),
    factor_energia: Number(formData.get('factor_energia') || 1),
  }

  const { error } = await admin
    .from('formula_configs')
    .upsert(configData, { onConflict: 'product_id' })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/comisionado')
  return { ok: true }
}

export async function getFormulaFeeOptions(configId: number): Promise<FormulaFeeOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('formula_fee_options')
    .select('*')
    .eq('formula_config_id', configId)
    .order('fee_type')
    .order('sort_order')

  return (data ?? []) as FormulaFeeOption[]
}

export async function getFeeOptionsForProduct(productId: number): Promise<FormulaFeeOption[]> {
  const supabase = await createClient()

  const { data: config } = await supabase
    .from('formula_configs')
    .select('id')
    .eq('product_id', productId)
    .maybeSingle()

  if (!config) return []

  const { data } = await supabase
    .from('formula_fee_options')
    .select('*')
    .eq('formula_config_id', config.id)
    .order('fee_type')
    .order('sort_order')

  return (data ?? []) as FormulaFeeOption[]
}

export async function saveFeeOptions(
  configId: number,
  feeType: 'energia' | 'potencia',
  options: Array<{ value: number; label: string | null }>
): Promise<ActionResult> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') {
    return { ok: false, error: 'Solo ADMIN puede editar opciones de fee.' }
  }

  const admin = getAdminClient()

  await admin
    .from('formula_fee_options')
    .delete()
    .eq('formula_config_id', configId)
    .eq('fee_type', feeType)

  if (options.length > 0) {
    const inserts = options.map((opt, i) => ({
      formula_config_id: configId,
      fee_type: feeType,
      value: opt.value,
      label: opt.label,
      sort_order: i,
    }))

    const { error } = await admin
      .from('formula_fee_options')
      .insert(inserts)

    if (error) return { ok: false, error: error.message }
  }

  revalidatePath('/comisionado')
  return { ok: true }
}
