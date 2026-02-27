'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import type {
  Role, PagoStatus, CommissionLineFilters, CommissionLineListResult,
  CommissionLineItem, EnergyCompany, EnergyProduct, CommissionRate,
  FormulaConfig, FormulaFeeOption, CommissionTier,
  UserCommissionOverride, CommissionModel, ParsedCommissionExcel,
  Comercializadora, Product, RateTable, RateTableUpload,
  ParsedRateTable, ProductTipo,
} from '@/lib/types'

// ── Helpers ──────────────────────────────────────────────────────────────────

interface ActionResult {
  ok: boolean
  error?: string
}

const PAGE_SIZE = 20

async function getAuthProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  return profile ? { supabase, userId: user.id, role: profile.role as Role } : null
}

function isAdminOrBackoffice(role: Role): boolean {
  return role === 'ADMIN' || role === 'BACKOFFICE'
}

// ── 1. getCommissionLines ────────────────────────────────────────────────────

export async function getCommissionLines(
  filters: CommissionLineFilters = {}
): Promise<CommissionLineListResult> {
  const empty: CommissionLineListResult = { lines: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0 }
  const auth = await getAuthProfile()
  if (!auth || !isAdminOrBackoffice(auth.role)) return empty

  const { supabase, role } = auth
  const page = filters.page ?? 1
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('contract_commissions')
    .select(`
      id, contract_id, user_id, commission_paid, decomission,
      status_pago, fecha_pago, notes, tier_name, rate_applied, is_differential,
      created_at, updated_at,
      contract:contracts!contract_commissions_contract_id_fkey(
        cups, titular_contrato, su_ref, commission_gnew, status_commission_gnew
      ),
      user:profiles!contract_commissions_user_id_fkey(
        full_name, role
      )
    `, { count: 'exact' })

  if (filters.status_pago) {
    query = query.eq('status_pago', filters.status_pago)
  }
  if (filters.fecha_desde) {
    query = query.gte('created_at', filters.fecha_desde)
  }
  if (filters.fecha_hasta) {
    query = query.lte('created_at', filters.fecha_hasta + 'T23:59:59')
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const { data, count, error } = await query

  if (error) {
    console.error('[getCommissionLines]', error.message)
    return empty
  }

  const total = count ?? 0
  const lines: CommissionLineItem[] = (data ?? []).map((row: Record<string, unknown>) => {
    const contract = row.contract as {
      cups: string | null
      titular_contrato: string | null
      su_ref: string | null
      commission_gnew: number
      status_commission_gnew: string
    } | null
    const user = row.user as { full_name: string; role: string } | null

    const line: CommissionLineItem = {
      id: row.id as number,
      contract_id: row.contract_id as string,
      user_id: row.user_id as string,
      commission_paid: row.commission_paid as number,
      decomission: row.decomission as number,
      status_pago: row.status_pago as PagoStatus,
      fecha_pago: row.fecha_pago as string | null,
      notes: row.notes as string | null,
      tier_name: row.tier_name as string | null,
      rate_applied: row.rate_applied as number | null,
      is_differential: row.is_differential as boolean,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      cups: contract?.cups ?? null,
      titular_contrato: contract?.titular_contrato ?? null,
      su_ref: contract?.su_ref ?? null,
      commission_gnew: role === 'ADMIN' ? (contract?.commission_gnew ?? 0) : 0,
      status_commission_gnew: (contract?.status_commission_gnew ?? 'no_calculada') as CommissionLineItem['status_commission_gnew'],
      user_name: user?.full_name ?? '',
      user_role: (user?.role ?? 'COMERCIAL') as Role,
    }

    if (role !== 'ADMIN') {
      line.commission_gnew = 0
    }

    return line
  })

  let filteredLines = lines
  if (filters.search) {
    const search = filters.search.toLowerCase()
    filteredLines = lines.filter(l =>
      (l.titular_contrato?.toLowerCase().includes(search)) ||
      (l.cups?.toLowerCase().includes(search)) ||
      (l.user_name.toLowerCase().includes(search))
    )
  }

  return {
    lines: filteredLines,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  }
}

// ── 2. updateCommissionLineStatus ────────────────────────────────────────────

export async function updateCommissionLineStatus(
  lineId: number,
  status: PagoStatus,
  fechaPago?: string,
  notes?: string
): Promise<ActionResult> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') {
    return { ok: false, error: 'Solo ADMIN puede cambiar estados de pago.' }
  }

  const admin = getAdminClient()

  const updateData: Record<string, unknown> = { status_pago: status }
  if (fechaPago) updateData.fecha_pago = fechaPago
  if (notes !== undefined) updateData.notes = notes

  const { error } = await admin
    .from('contract_commissions')
    .update(updateData)
    .eq('id', lineId)

  if (error) {
    console.error('[updateCommissionLineStatus]', error.message)
    return { ok: false, error: error.message }
  }

  await admin.from('audit_log').insert({
    user_id: auth.userId,
    action: 'commission_status_change',
    details: { line_id: lineId, new_status: status, fecha_pago: fechaPago, notes },
  })

  revalidatePath('/comisionado')
  return { ok: true }
}

// ── 3. applyDecomission ──────────────────────────────────────────────────────

export async function applyDecomission(
  lineId: number,
  amount: number
): Promise<ActionResult> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') {
    return { ok: false, error: 'Solo ADMIN puede aplicar decomisiones.' }
  }

  if (amount < 0) return { ok: false, error: 'La cantidad debe ser positiva.' }

  const admin = getAdminClient()

  const { error } = await admin
    .from('contract_commissions')
    .update({ decomission: amount })
    .eq('id', lineId)

  if (error) {
    console.error('[applyDecomission]', error.message)
    return { ok: false, error: error.message }
  }

  await admin.from('audit_log').insert({
    user_id: auth.userId,
    action: 'commission_decomission',
    details: { line_id: lineId, amount },
  })

  revalidatePath('/comisionado')
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE COMISIONES v2 — CRUD
// ═══════════════════════════════════════════════════════════════════

// ── 4. Energy Companies ──────────────────────────────────────────────────────

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

// ── 5. Energy Products ──────────────────────────────────────────────────────

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

// ── 6. Commission Rates (modelo TABLE) ──────────────────────────────────────

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

// ── 7. Formula Configs (modelo FORMULA) ─────────────────────────────────────

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
    return { ok: false, error: 'Solo ADMIN puede configurar fórmulas.' }
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

// ── 8. Formula Fee Options ──────────────────────────────────────────────────

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

  // Buscar la formula_config de este producto
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

  // Borrar opciones existentes de este tipo
  await admin
    .from('formula_fee_options')
    .delete()
    .eq('formula_config_id', configId)
    .eq('fee_type', feeType)

  // Insertar nuevas
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

// ── 9. Commission Tiers ─────────────────────────────────────────────────────

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

// ── 10. User Commission Overrides ───────────────────────────────────────────

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

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE CÁLCULO AUTOMÁTICO
// ═══════════════════════════════════════════════════════════════════

// ── 11. calculateContractCommissions ────────────────────────────────────────

interface CalcResult extends ActionResult {
  gross_commission?: number
  gnew_margin?: number
  payout_partner_base?: number
}

export async function calculateContractCommissions(contractId: string): Promise<CalcResult> {
  const admin = getAdminClient()

  // Obtener contrato completo
  const { data: contract } = await admin
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .single()

  if (!contract) return { ok: false, error: 'Contrato no encontrado.' }

  const companyId = contract.energy_company_id as number | null
  const productId = contract.energy_product_id as number | null

  if (!companyId || !productId) {
    return { ok: false, error: 'Faltan comercializadora o producto energético.' }
  }

  // Obtener comercializadora
  const { data: company } = await admin
    .from('energy_companies')
    .select('*')
    .eq('id', companyId)
    .single()

  if (!company) return { ok: false, error: 'Comercializadora no encontrada.' }

  const model = company.commission_model as CommissionModel
  const tarifa = contract.tarifa as string | null
  const consumoAnual = Number(contract.consumo_anual ?? 0)

  let grossCommission = 0
  let commissionGnew = 0
  let payoutPartnerBase = 0

  // ═══════════════════════════════════════════════
  // PASO 1: COMISIÓN BRUTA
  // ═══════════════════════════════════════════════

  if (model === 'table') {
    if (!tarifa || !consumoAnual) {
      return { ok: false, error: 'Faltan tarifa o consumo anual para modelo tabla.' }
    }

    const { data: rate } = await admin
      .from('commission_rates')
      .select('gross_amount')
      .eq('product_id', productId)
      .eq('tariff', tarifa)
      .lte('consumption_min', consumoAnual)
      .gte('consumption_max', consumoAnual)
      .limit(1)
      .maybeSingle()

    if (!rate) {
      return { ok: false, error: `No hay comisión para producto ${productId}, tarifa ${tarifa}, consumo ${consumoAnual}.` }
    }

    grossCommission = Number(rate.gross_amount)

  } else if (model === 'formula') {
    const { data: config } = await admin
      .from('formula_configs')
      .select('*')
      .eq('product_id', productId)
      .maybeSingle()

    if (!config) {
      return { ok: false, error: 'Producto sin configuración de fórmula.' }
    }

    const feeEne = Number(contract.selected_fee_energia ?? config.fee_energia ?? 0)
    const feePot = Number(contract.selected_fee_potencia ?? config.fee_potencia ?? 0)
    const mi = Number(config.margen_intermediacion ?? 0)
    const factorEnergia = Number(config.factor_energia ?? 1)
    const factorPotencia = Number(config.factor_potencia ?? 1)
    const comServicio = Number(config.comision_servicio ?? 0)
    const pricingType = config.pricing_type as string

    // Componente ENERGÍA
    let comEnergia: number
    if (pricingType === 'fijo') {
      comEnergia = consumoAnual * Number(config.fee_energia_fijo ?? 0)
    } else {
      comEnergia = consumoAnual * (feeEne + mi)
    }

    // Componente POTENCIA
    let comPotencia = 0
    const calcMethod = config.potencia_calc_method as string

    if (calcMethod === 'sum_periods') {
      // Sumar CADA potencia × fee
      const potencias = [
        contract.potencia_1, contract.potencia_2, contract.potencia_3,
        contract.potencia_4, contract.potencia_5, contract.potencia_6,
      ]
      for (const p of potencias) {
        if (p != null) {
          comPotencia += Number(p) * feePot
        }
      }
    } else {
      // average: media_potencia × fee
      comPotencia = Number(contract.media_potencia ?? 0) * feePot
    }

    // Aplicar factores de ajuste
    const comEnergiaAjustada = comEnergia * factorEnergia
    const comPotenciaAjustada = comPotencia * factorPotencia

    grossCommission = comPotenciaAjustada + comEnergiaAjustada + comServicio
  }

  grossCommission = Math.round(grossCommission * 100) / 100

  // ═══════════════════════════════════════════════
  // PASO 2: commission_gnew, payout, gnew_margin
  // ═══════════════════════════════════════════════

  let gnewMargin = 0

  if (model === 'table') {
    // TABLE: gross viene de tabla, GNEW se queda gnew_margin_pct, el resto es payout
    commissionGnew = grossCommission
    const gnewMarginPct = Number(company.gnew_margin_pct ?? 0)
    gnewMargin = Math.round(grossCommission * gnewMarginPct * 100) / 100
    payoutPartnerBase = Math.round((grossCommission - gnewMargin) * 100) / 100
  } else {
    // FORMULA: GNEW cobra por fórmula, GNEW paga por tabla (SIEMPRE)
    commissionGnew = grossCommission

    // El payout a la red SIEMPRE viene de commission_rates (tabla)
    if (!tarifa || !consumoAnual) {
      return { ok: false, error: 'Faltan tarifa o consumo anual para calcular payout.' }
    }

    const { data: payoutRate } = await admin
      .from('commission_rates')
      .select('gross_amount')
      .eq('product_id', productId)
      .eq('tariff', tarifa)
      .lte('consumption_min', consumoAnual)
      .gte('consumption_max', consumoAnual)
      .limit(1)
      .maybeSingle()

    if (!payoutRate) {
      return { ok: false, error: `No hay tabla de payout definida para producto ${productId}, tarifa ${tarifa}, rango ${consumoAnual} kWh. Configure commission_rates para este producto.` }
    }

    payoutPartnerBase = Number(payoutRate.gross_amount)
    // gnew_margin puede ser negativo si payout > commission_gnew (el Admin debe ajustar las tablas)
    gnewMargin = Math.round((commissionGnew - payoutPartnerBase) * 100) / 100
  }

  // ═══════════════════════════════════════════════
  // PASO 3: GUARDAR EN CONTRATO
  // ═══════════════════════════════════════════════

  await admin
    .from('contracts')
    .update({
      gross_commission: grossCommission,
      commission_gnew: commissionGnew,
      gnew_margin: gnewMargin,
      payout_partner_base: payoutPartnerBase,
      status_commission_gnew: model === 'table' ? 'cargada_excel' : 'calculada_formula',
    })
    .eq('id', contractId)

  // ═══════════════════════════════════════════════
  // PASO 4: COMISIONES DE LA RED
  // ═══════════════════════════════════════════════

  await calculateNetworkCommissions(admin, contractId, contract.owner_id as string, payoutPartnerBase, commissionGnew)

  revalidatePath('/comisionado')
  revalidatePath(`/contratos/${contractId}`)
  return { ok: true, gross_commission: grossCommission, gnew_margin: commissionGnew, payout_partner_base: payoutPartnerBase }
}

// ── 12. calculateNetworkCommissions (cascada jerárquica) ────────────────────

async function calculateNetworkCommissions(
  admin: ReturnType<typeof getAdminClient>,
  contractId: string,
  ownerId: string,
  payoutPartnerBase: number,
  commissionGnew: number
): Promise<void> {
  // Borrar comisiones anteriores de este contrato
  await admin
    .from('contract_commissions')
    .delete()
    .eq('contract_id', contractId)

  // Obtener la cadena jerárquica: owner + ancestros
  const chain = await getHierarchyChain(admin, ownerId)
  if (chain.length === 0) return

  // Obtener contrato para product_id
  const { data: contract } = await admin
    .from('contracts')
    .select('energy_product_id')
    .eq('id', contractId)
    .single()

  const productId = contract?.energy_product_id as number | null

  let comisionNivelInferior: number | null = null

  for (let i = 0; i < chain.length; i++) {
    const user = chain[i]
    const comisionEfectiva = await calculateUserCommission(admin, user.id, productId, payoutPartnerBase, user.tier_name, user.tier_rate_pct)

    if (i === 0) {
      // El owner cobra su comisión completa
      await admin.from('contract_commissions').insert({
        contract_id: contractId,
        user_id: user.id,
        commission_paid: Math.round(comisionEfectiva * 100) / 100,
        tier_name: user.tier_name,
        rate_applied: user.tier_rate_pct,
        is_differential: false,
      })
      comisionNivelInferior = comisionEfectiva
    } else {
      // Los superiores cobran diferencial
      const diferencial = comisionEfectiva - (comisionNivelInferior ?? 0)
      if (diferencial > 0) {
        await admin.from('contract_commissions').insert({
          contract_id: contractId,
          user_id: user.id,
          commission_paid: Math.round(diferencial * 100) / 100,
          tier_name: user.tier_name,
          rate_applied: user.tier_rate_pct,
          is_differential: true,
          differential_from_user_id: chain[i - 1].id,
        })
      }
      comisionNivelInferior = comisionEfectiva
    }
  }

  // Calcular total pagado y guardar decomission_gnew
  const { data: allCommissions } = await admin
    .from('contract_commissions')
    .select('commission_paid')
    .eq('contract_id', contractId)

  const totalPaid = (allCommissions ?? []).reduce((sum, c) => sum + Number(c.commission_paid), 0)

  // decomission_gnew = total pagado a la red
  // beneficio = commission_gnew - decomission_gnew (puede ser negativo en modelo fórmula)
  await admin
    .from('contracts')
    .update({ decomission_gnew: Math.round(totalPaid * 100) / 100 })
    .eq('id', contractId)
}

interface HierarchyUser {
  id: string
  parent_id: string | null
  tier_name: string | null
  tier_rate_pct: number | null
}

async function getHierarchyChain(
  admin: ReturnType<typeof getAdminClient>,
  userId: string
): Promise<HierarchyUser[]> {
  const chain: HierarchyUser[] = []
  let currentId: string | null = userId
  const visited = new Set<string>()

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)

    const { data: profile } = await admin
      .from('profiles')
      .select('id, parent_id, commission_tier_id')
      .eq('id', currentId)
      .single()

    if (!profile) break

    let tierName: string | null = null
    let tierRate: number | null = null

    if (profile.commission_tier_id) {
      const { data: tier } = await admin
        .from('commission_tiers')
        .select('name, rate_pct')
        .eq('id', profile.commission_tier_id)
        .single()

      if (tier) {
        tierName = tier.name as string
        tierRate = tier.rate_pct as number | null
      }
    }

    chain.push({
      id: profile.id as string,
      parent_id: profile.parent_id as string | null,
      tier_name: tierName,
      tier_rate_pct: tierRate,
    })

    currentId = profile.parent_id as string | null
  }

  return chain
}

async function calculateUserCommission(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  productId: number | null,
  payoutPartnerBase: number,
  tierName: string | null,
  tierRate: number | null
): Promise<number> {
  // 1. Override personalizado
  if (productId) {
    // Buscar override específico de producto primero, luego global
    const { data: specificOverride } = await admin
      .from('user_commission_overrides')
      .select('override_type, override_value')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle()

    if (specificOverride) {
      if (specificOverride.override_type === 'fixed') return Number(specificOverride.override_value)
      return payoutPartnerBase * Number(specificOverride.override_value)
    }

    // Buscar override global (product_id IS NULL)
    const { data: globalOverride } = await admin
      .from('user_commission_overrides')
      .select('override_type, override_value')
      .eq('user_id', userId)
      .is('product_id', null)
      .maybeSingle()

    if (globalOverride) {
      if (globalOverride.override_type === 'fixed') return Number(globalOverride.override_value)
      return payoutPartnerBase * Number(globalOverride.override_value)
    }
  }

  // 2. Tier estándar
  if (tierRate !== null) {
    return payoutPartnerBase * tierRate
  }

  return 0
}

// ═══════════════════════════════════════════════════════════════════
// CARGA MASIVA DESDE EXCEL
// ═══════════════════════════════════════════════════════════════════

// ── 13. processCommissionExcelUpload ────────────────────────────────────────

interface ExcelUploadResult extends ActionResult {
  companies_created?: number
  products_created?: number
  rates_upserted?: number
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
    return { ok: false, error: 'Formato de datos inválido.' }
  }

  if (!parsed.company_name?.trim()) {
    return { ok: false, error: 'Comercializadora es obligatoria.' }
  }

  const admin = getAdminClient()
  let companiesCreated = 0
  let productsCreated = 0
  let ratesUpserted = 0

  // Upsert comercializadora
  const { data: existingCompany } = await admin
    .from('energy_companies')
    .select('id')
    .eq('name', parsed.company_name.trim())
    .maybeSingle()

  let companyId: number

  if (existingCompany) {
    companyId = existingCompany.id as number
    // Actualizar margen si cambió
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

  // Procesar productos y rates
  for (const product of parsed.products) {
    // Upsert producto
    const { data: existingProduct } = await admin
      .from('energy_products')
      .select('id')
      .eq('company_id', companyId)
      .eq('name', product.name)
      .eq('fee_value', product.fee_value ?? 0)
      .maybeSingle()

    let productDbId: number

    if (existingProduct) {
      productDbId = existingProduct.id as number
    } else {
      const { data: newProduct, error: prodError } = await admin
        .from('energy_products')
        .insert({
          company_id: companyId,
          name: product.name,
          fee_value: product.fee_value,
          fee_label: product.fee_label,
        })
        .select('id')
        .single()

      if (prodError || !newProduct) continue
      productDbId = newProduct.id as number
      productsCreated++
    }

    // Upsert commission_rates
    for (const rate of product.rates) {
      const { error: rateError } = await admin
        .from('commission_rates')
        .upsert(
          {
            product_id: productDbId,
            tariff: product.tariff,
            consumption_min: rate.consumption_min,
            consumption_max: rate.consumption_max,
            gross_amount: rate.gross_amount,
          },
          { onConflict: 'product_id,tariff,consumption_min,consumption_max' }
        )

      if (!rateError) ratesUpserted++
    }
  }

  // Audit
  await admin.from('audit_log').insert({
    user_id: auth.userId,
    action: 'commission_excel_upload_v2',
    details: {
      file_name: fileName,
      company: parsed.company_name,
      companies_created: companiesCreated,
      products_created: productsCreated,
      rates_upserted: ratesUpserted,
    },
  })

  revalidatePath('/comisionado')
  return { ok: true, companies_created: companiesCreated, products_created: productsCreated, rates_upserted: ratesUpserted }
}

// ═══════════════════════════════════════════════════════════════════
// FUNCIONES LEGACY (backward compat para rate_tables existentes)
// ═══════════════════════════════════════════════════════════════════

export async function getComercializadoras(): Promise<Comercializadora[]> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') return []

  const { data } = await auth.supabase
    .from('comercializadoras')
    .select('*')
    .eq('active', true)
    .order('name')

  return (data ?? []) as Comercializadora[]
}

export async function getProducts(comercializadoraId?: number): Promise<Product[]> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') return []

  let query = auth.supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('name')

  if (comercializadoraId) {
    query = query.eq('comercializadora_id', comercializadoraId)
  }

  const { data } = await query

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as number,
    name: row.name as string,
    type: row.type as ProductTipo,
    comercializadora_id: (row.comercializadora_id as number) ?? null,
    active: row.active as boolean,
    created_at: row.created_at as string,
  })) satisfies Product[]
}

export async function getRateTables(): Promise<RateTable[]> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') return []

  const { data, error } = await auth.supabase
    .from('rate_tables')
    .select(`
      *,
      comercializadora:comercializadoras!rate_tables_comercializadora_id_fkey(name),
      uploader:profiles!rate_tables_uploaded_by_fkey(full_name)
    `)
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getRateTables]', error.message)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const comercializadora = row.comercializadora as { name: string } | null
    const uploader = row.uploader as { full_name: string } | null
    return {
      id: row.id as number,
      comercializadora_id: row.comercializadora_id as number,
      comercializadora_name: comercializadora?.name ?? '',
      version: row.version as number,
      active: row.active as boolean,
      notes: row.notes as string | null,
      uploaded_by: row.uploaded_by as string,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      uploaded_by_name: uploader?.full_name ?? '',
    } satisfies RateTable
  })
}

export async function getRateTableUploadHistory(): Promise<RateTableUpload[]> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') return []

  const { data, error } = await auth.supabase
    .from('rate_table_uploads')
    .select(`
      *,
      comercializadora:comercializadoras!rate_table_uploads_comercializadora_id_fkey(name),
      uploader:profiles!rate_table_uploads_uploaded_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[getRateTableUploadHistory]', error.message)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const comercializadora = row.comercializadora as { name: string } | null
    const uploader = row.uploader as { full_name: string } | null
    return {
      id: row.id as number,
      rate_table_id: row.rate_table_id as number,
      file_name: row.file_name as string,
      comercializadora_id: (row.comercializadora_id as number) ?? null,
      comercializadora_name: comercializadora?.name ?? '',
      totals: row.totals as RateTableUpload['totals'],
      errors: row.errors as RateTableUpload['errors'],
      uploaded_by: row.uploaded_by as string,
      created_at: row.created_at as string,
      uploaded_by_name: uploader?.full_name ?? '',
    } satisfies RateTableUpload
  })
}

export async function processRateTableUpload(
  _prev: { ok: boolean; error?: string; totals?: { sheets: number; offers: number; rates: number }; errors?: Array<{ sheet?: string; row?: number; error: string }> } | null,
  formData: FormData
): Promise<{ ok: boolean; error?: string; totals?: { sheets: number; offers: number; rates: number }; errors?: Array<{ sheet?: string; row?: number; error: string }> }> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') {
    return { ok: false, error: 'Solo ADMIN puede subir tablas de rangos.' }
  }

  const jsonData = formData.get('data') as string
  const fileName = formData.get('file_name') as string

  if (!jsonData || !fileName) {
    return { ok: false, error: 'Datos no recibidos.' }
  }

  let parsed: ParsedRateTable
  try {
    parsed = JSON.parse(jsonData)
  } catch {
    return { ok: false, error: 'Formato de datos inválido.' }
  }

  if (!parsed.comercializadora?.trim()) {
    return { ok: false, error: 'Comercializadora es obligatoria.' }
  }

  if (!parsed.sheets || parsed.sheets.length === 0) {
    return { ok: false, error: 'No se encontraron hojas con datos.' }
  }

  const admin = getAdminClient()
  const errors: Array<{ sheet?: string; row?: number; error: string }> = []
  let totalOffers = 0
  let totalRates = 0
  const comercializadoraName = parsed.comercializadora.trim()

  // Upsert comercializadora en tabla legacy
  const { data: existingComerc } = await admin
    .from('comercializadoras')
    .select('id')
    .eq('name', comercializadoraName)
    .maybeSingle()

  let comercializadoraId: number

  if (existingComerc) {
    comercializadoraId = existingComerc.id as number
  } else {
    const { data: newComerc, error: comercError } = await admin
      .from('comercializadoras')
      .insert({ name: comercializadoraName })
      .select('id')
      .single()

    if (comercError || !newComerc) {
      return { ok: false, error: comercError?.message ?? 'Error al crear comercializadora.' }
    }
    comercializadoraId = newComerc.id as number
  }

  // También crear en energy_companies si no existe
  const { data: existingEC } = await admin
    .from('energy_companies')
    .select('id')
    .eq('name', comercializadoraName)
    .maybeSingle()

  if (!existingEC) {
    await admin
      .from('energy_companies')
      .insert({ name: comercializadoraName, commission_model: 'table' })
  }

  // Desactivar versión anterior
  const { data: existing } = await admin
    .from('rate_tables')
    .select('id, version')
    .eq('comercializadora_id', comercializadoraId)
    .eq('active', true)
    .maybeSingle()

  const newVersion = existing ? (existing.version as number) + 1 : 1

  if (existing) {
    await admin
      .from('rate_tables')
      .update({ active: false })
      .eq('id', existing.id)
  }

  const { data: rateTable, error: rtError } = await admin
    .from('rate_tables')
    .insert({
      comercializadora_id: comercializadoraId,
      version: newVersion,
      active: true,
      uploaded_by: auth.userId,
    })
    .select('id')
    .single()

  if (rtError || !rateTable) {
    return { ok: false, error: rtError?.message ?? 'Error al crear rate_table.' }
  }

  const rateTableId = rateTable.id as number

  for (const sheet of parsed.sheets) {
    const sheetName = sheet.tarifa
    const isGas = sheetName.startsWith('RL.')
    const productType: ProductTipo = isGas ? 'gas_empresa' : 'luz_empresa'

    const { data: existingProduct } = await admin
      .from('products')
      .select('id')
      .eq('name', sheetName)
      .eq('comercializadora_id', comercializadoraId)
      .maybeSingle()

    if (!existingProduct) {
      await admin.from('products').insert({
        name: sheetName,
        type: productType,
        comercializadora_id: comercializadoraId,
        active: true,
      })
    }
  }

  for (const sheet of parsed.sheets) {
    if (!sheet.tarifa || !sheet.offers || sheet.offers.length === 0) {
      errors.push({ sheet: sheet.tarifa, error: 'Hoja sin ofertas' })
      continue
    }

    const { data: sheetRow, error: sheetError } = await admin
      .from('rate_table_sheets')
      .insert({ rate_table_id: rateTableId, tarifa: sheet.tarifa })
      .select('id')
      .single()

    if (sheetError || !sheetRow) {
      errors.push({ sheet: sheet.tarifa, error: sheetError?.message ?? 'Error creando hoja' })
      continue
    }

    const sheetId = sheetRow.id as number

    for (let oi = 0; oi < sheet.offers.length; oi++) {
      const offer = sheet.offers[oi]

      const { data: offerRow, error: offerError } = await admin
        .from('rate_table_offers')
        .insert({
          sheet_id: sheetId,
          offer_name: offer.offer_name,
          fee: offer.fee,
          sort_order: oi,
        })
        .select('id')
        .single()

      if (offerError || !offerRow) {
        errors.push({ sheet: sheet.tarifa, error: `Oferta "${offer.offer_name}": ${offerError?.message ?? 'Error'}` })
        continue
      }

      const offerId = offerRow.id as number
      totalOffers++

      if (offer.rates.length > 0) {
        const rateInserts = offer.rates.map(r => ({
          offer_id: offerId,
          kwh_from: r.kwh_from,
          kwh_to: r.kwh_to,
          commission: r.commission,
        }))

        const { error: ratesError } = await admin
          .from('rate_table_rates')
          .insert(rateInserts)

        if (ratesError) {
          errors.push({ sheet: sheet.tarifa, error: `Rates "${offer.offer_name}": ${ratesError.message}` })
        } else {
          totalRates += offer.rates.length
        }
      }
    }
  }

  const totals = { sheets: parsed.sheets.length, offers: totalOffers, rates: totalRates }

  await admin.from('rate_table_uploads').insert({
    rate_table_id: rateTableId,
    file_name: fileName,
    comercializadora_id: comercializadoraId,
    totals,
    errors: errors.length > 0 ? errors : null,
    uploaded_by: auth.userId,
  })

  await admin.from('audit_log').insert({
    user_id: auth.userId,
    action: 'rate_table_upload',
    details: { file_name: fileName, comercializadora: comercializadoraName, totals, errors_count: errors.length },
  })

  revalidatePath('/comisionado')
  return { ok: true, totals, errors: errors.length > 0 ? errors : undefined }
}
