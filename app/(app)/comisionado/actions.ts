'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import type {
  Role, PagoStatus, CommissionLineFilters, CommissionLineListResult,
  CommissionLineItem, CommissionFormulaConfig,
  Comercializadora, Product, RateTable, RateTableUpload,
  ParsedRateTable, ProductTipo,
} from '@/lib/types'

// ── Helpers ──────────────────────────────────────────────────────────────────

interface ActionResult {
  ok: boolean
  error?: string
}

interface FormulaCalcResult extends ActionResult {
  contractsUpdated?: number
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
      status_pago, fecha_pago, notes, created_at, updated_at,
      contract:contracts!contract_commissions_contract_id_fkey(
        cups, titular_contrato, su_ref, commission_gnew, status_commission_gnew
      ),
      user:profiles!contract_commissions_user_id_fkey(
        full_name, role
      )
    `, { count: 'exact' })

  // Filtros
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

    // BACKOFFICE no ve commission_gnew
    if (role !== 'ADMIN') {
      line.commission_gnew = 0
    }

    return line
  })

  // Filtrar por búsqueda en cliente (titular/CUPS) — post-query para simplificar
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

  // Audit log
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

// ── 4. recalculateCommissionPaid (helper interno) ────────────────────────────

async function recalculateCommissionPaid(
  admin: ReturnType<typeof getAdminClient>,
  contractId: string,
  commissionGnew: number
): Promise<void> {
  // Obtener owner del contrato y su commission_pct
  const { data: contract } = await admin
    .from('contracts')
    .select('owner_id')
    .eq('id', contractId)
    .single()

  if (!contract) return

  const { data: owner } = await admin
    .from('profiles')
    .select('id, commission_pct')
    .eq('id', contract.owner_id)
    .single()

  if (!owner) return

  const pct = (owner.commission_pct as number) ?? 0
  const paid = commissionGnew * (pct / 100)

  await admin
    .from('contract_commissions')
    .upsert(
      {
        contract_id: contractId,
        user_id: owner.id,
        commission_paid: Math.round(paid * 10000) / 10000,
      },
      { onConflict: 'contract_id,user_id' }
    )
}

// ── 5. getComercializadoras ─────────────────────────────────────────────────

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

// ── 6. getFormulaConfigs ─────────────────────────────────────────────────────

export async function getFormulaConfigs(): Promise<CommissionFormulaConfig[]> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') return []

  const { supabase } = auth

  const { data, error } = await supabase
    .from('commission_formula_config')
    .select(`
      *,
      comercializadora:comercializadoras!commission_formula_config_comercializadora_id_fkey(name),
      product:products!commission_formula_config_product_id_fkey(name),
      creator:profiles!commission_formula_config_created_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getFormulaConfigs]', error.message)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const comercializadora = row.comercializadora as { name: string } | null
    const product = row.product as { name: string } | null
    const creator = row.creator as { full_name: string } | null
    return {
      id: row.id as number,
      comercializadora_id: row.comercializadora_id as number,
      product_id: row.product_id as number,
      fee_energia: row.fee_energia as number,
      pct_fee_energia: row.pct_fee_energia as number,
      fee_potencia: row.fee_potencia as number,
      pct_fee_potencia: row.pct_fee_potencia as number,
      comision_servicio: row.comision_servicio as number,
      version: row.version as number,
      active: row.active as boolean,
      created_by: row.created_by as string,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      comercializadora_name: comercializadora?.name ?? '',
      product_name: product?.name ?? '',
      created_by_name: creator?.full_name ?? '',
    } satisfies CommissionFormulaConfig
  })
}

// ── 7. createFormulaConfig ───────────────────────────────────────────────────

export async function createFormulaConfig(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') {
    return { ok: false, error: 'Solo ADMIN puede crear fórmulas.' }
  }

  const comercializadoraId = Number(formData.get('comercializadora_id'))
  const productId = Number(formData.get('product_id'))
  const feeEnergia = Number(formData.get('fee_energia') || 0)
  const pctFeeEnergia = Number(formData.get('pct_fee_energia') || 100)
  const feePotencia = Number(formData.get('fee_potencia') || 0)
  const pctFeePotencia = Number(formData.get('pct_fee_potencia') || 100)
  const comisionServicio = Number(formData.get('comision_servicio') || 0)

  if (!comercializadoraId || !productId) {
    return { ok: false, error: 'Comercializadora y producto son obligatorios.' }
  }

  const admin = getAdminClient()

  // Desactivar config activa previa para la misma comercializadora+producto
  const { data: existing } = await admin
    .from('commission_formula_config')
    .select('id, version')
    .eq('comercializadora_id', comercializadoraId)
    .eq('product_id', productId)
    .eq('active', true)
    .maybeSingle()

  const newVersion = existing ? (existing.version as number) + 1 : 1

  if (existing) {
    await admin
      .from('commission_formula_config')
      .update({ active: false })
      .eq('id', existing.id)
  }

  const { error } = await admin
    .from('commission_formula_config')
    .insert({
      comercializadora_id: comercializadoraId,
      product_id: productId,
      fee_energia: feeEnergia,
      pct_fee_energia: pctFeeEnergia,
      fee_potencia: feePotencia,
      pct_fee_potencia: pctFeePotencia,
      comision_servicio: comisionServicio,
      version: newVersion,
      active: true,
      created_by: auth.userId,
    })

  if (error) {
    console.error('[createFormulaConfig]', error.message)
    return { ok: false, error: error.message }
  }

  revalidatePath('/comisionado')
  return { ok: true }
}

// ── 8. updateFormulaConfig ───────────────────────────────────────────────────

export async function updateFormulaConfig(
  id: number,
  formData: FormData
): Promise<ActionResult> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') {
    return { ok: false, error: 'Solo ADMIN puede editar fórmulas.' }
  }

  const feeEnergia = Number(formData.get('fee_energia') || 0)
  const pctFeeEnergia = Number(formData.get('pct_fee_energia') || 100)
  const feePotencia = Number(formData.get('fee_potencia') || 0)
  const pctFeePotencia = Number(formData.get('pct_fee_potencia') || 100)
  const comisionServicio = Number(formData.get('comision_servicio') || 0)

  const admin = getAdminClient()

  const { error } = await admin
    .from('commission_formula_config')
    .update({
      fee_energia: feeEnergia,
      pct_fee_energia: pctFeeEnergia,
      fee_potencia: feePotencia,
      pct_fee_potencia: pctFeePotencia,
      comision_servicio: comisionServicio,
    })
    .eq('id', id)

  if (error) {
    console.error('[updateFormulaConfig]', error.message)
    return { ok: false, error: error.message }
  }

  revalidatePath('/comisionado')
  return { ok: true }
}

// ── 9. calculateByFormula ────────────────────────────────────────────────────

export async function calculateByFormula(configId: number): Promise<FormulaCalcResult> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') {
    return { ok: false, error: 'Solo ADMIN puede ejecutar cálculos por fórmula.' }
  }

  const admin = getAdminClient()

  // Obtener la config
  const { data: config } = await admin
    .from('commission_formula_config')
    .select('*')
    .eq('id', configId)
    .single()

  if (!config) return { ok: false, error: 'Configuración no encontrada.' }

  // Buscar contratos cuyo producto coincida (el producto ya pertenece a una comercializadora)
  const { data: contracts } = await admin
    .from('contracts')
    .select('id, consumo_anual, media_potencia')
    .eq('product_id', config.product_id)
    .is('deleted_at', null)
    .neq('status_commission_gnew', 'bloqueada')

  if (!contracts || contracts.length === 0) {
    return { ok: false, error: 'No se encontraron contratos para este producto.' }
  }

  let updated = 0
  const feeE = Number(config.fee_energia)
  const pctE = Number(config.pct_fee_energia)
  const feeP = Number(config.fee_potencia)
  const pctP = Number(config.pct_fee_potencia)
  const comServ = Number(config.comision_servicio)

  for (const c of contracts) {
    const consumo = Number(c.consumo_anual ?? 0)
    const potencia = Number(c.media_potencia ?? 0)

    // Fórmula: (consumo × fee_energia × pct/100) + (potencia × fee_potencia × pct/100) + comision_servicio
    let gnew = (consumo * feeE * (pctE / 100)) + (potencia * feeP * (pctP / 100)) + comServ
    gnew = Math.round(gnew * 10000) / 10000

    // Actualizar contrato
    await admin
      .from('contracts')
      .update({
        commission_gnew: gnew,
        status_commission_gnew: 'calculada_formula',
      })
      .eq('id', c.id)

    // Log del cálculo
    await admin.from('commission_calculations').insert({
      contract_id: c.id,
      formula_config_id: configId,
      consumo_used: consumo,
      potencia_used: potencia,
      fee_energia_used: feeE,
      pct_fee_energia_used: pctE,
      fee_potencia_used: feeP,
      pct_fee_potencia_used: pctP,
      comision_servicio_used: comServ,
      result_amount: gnew,
      calculated_by: auth.userId,
    })

    // Auto-calcular paid
    await recalculateCommissionPaid(admin, c.id as string, gnew)
    updated++
  }

  // Audit
  await admin.from('audit_log').insert({
    user_id: auth.userId,
    action: 'commission_formula_calculate',
    details: { config_id: configId, contracts_updated: updated },
  })

  revalidatePath('/comisionado')
  return { ok: true, contractsUpdated: updated }
}

// ── 10. getProducts ─────────────────────────────────────────────────────────

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

// ── 11. processRateTableUpload ──────────────────────────────────────────────

interface RateTableUploadResult extends ActionResult {
  totals?: { sheets: number; offers: number; rates: number }
  errors?: Array<{ sheet?: string; row?: number; error: string }>
}

export async function processRateTableUpload(
  _prev: RateTableUploadResult | null,
  formData: FormData
): Promise<RateTableUploadResult> {
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

  // Upsert comercializadora por nombre → obtener ID
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

  // Desactivar versión anterior de esta comercializadora
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

  // Insertar rate_table
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

  // Auto-crear productos por cada hoja del Excel
  for (const sheet of parsed.sheets) {
    const sheetName = sheet.tarifa
    // Inferir tipo de producto a partir de la tarifa
    const isGas = sheetName.startsWith('RL.')
    const productType: ProductTipo = isGas ? 'gas_empresa' : 'luz_empresa'

    // Upsert producto con nombre = nombre de hoja, vinculado a esta comercializadora
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

  // Insertar sheets, offers y rates
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

      // Insertar rates en batch
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

  // Log de subida
  await admin.from('rate_table_uploads').insert({
    rate_table_id: rateTableId,
    file_name: fileName,
    comercializadora_id: comercializadoraId,
    totals,
    errors: errors.length > 0 ? errors : null,
    uploaded_by: auth.userId,
  })

  // Audit
  await admin.from('audit_log').insert({
    user_id: auth.userId,
    action: 'rate_table_upload',
    details: { file_name: fileName, comercializadora: comercializadoraName, totals, errors_count: errors.length },
  })

  revalidatePath('/comisionado')
  return { ok: true, totals, errors: errors.length > 0 ? errors : undefined }
}

// ── 12. getRateTables ───────────────────────────────────────────────────────

export async function getRateTables(): Promise<RateTable[]> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') return []

  const { supabase } = auth

  const { data, error } = await supabase
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

// ── 13. getRateTableUploadHistory ───────────────────────────────────────────

export async function getRateTableUploadHistory(): Promise<RateTableUpload[]> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') return []

  const { supabase } = auth

  const { data, error } = await supabase
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
