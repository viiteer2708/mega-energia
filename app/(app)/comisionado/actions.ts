'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import type {
  Role, PagoStatus, CommissionLineFilters, CommissionLineListResult,
  CommissionLineItem, CommissionFormulaConfig, CommissionUpload,
  Campaign, Product,
} from '@/lib/types'

// ── Helpers ──────────────────────────────────────────────────────────────────

interface ActionResult {
  ok: boolean
  error?: string
}

interface ExcelUploadResult extends ActionResult {
  totalRows?: number
  updatedRows?: number
  errorRows?: number
  errors?: Array<{ row: number; cups?: string; error: string }>
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

// ── 5. processExcelUpload ────────────────────────────────────────────────────

export async function processExcelUpload(
  _prev: ExcelUploadResult | null,
  formData: FormData
): Promise<ExcelUploadResult> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') {
    return { ok: false, error: 'Solo ADMIN puede subir archivos Excel.' }
  }

  const jsonRows = formData.get('rows') as string
  const fileName = formData.get('file_name') as string

  if (!jsonRows || !fileName) {
    return { ok: false, error: 'Datos del Excel no recibidos.' }
  }

  let rows: Array<{ cups?: string; su_ref?: string; commission_gnew?: number }>
  try {
    rows = JSON.parse(jsonRows)
  } catch {
    return { ok: false, error: 'Formato de datos inválido.' }
  }

  const admin = getAdminClient()
  let updatedRows = 0
  let errorRows = 0
  const errors: Array<{ row: number; cups?: string; error: string }> = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const cups = row.cups?.trim()
    const suRef = row.su_ref?.trim()
    const gnew = row.commission_gnew

    if (gnew === undefined || gnew === null || isNaN(Number(gnew))) {
      errorRows++
      errors.push({ row: i + 1, cups, error: 'commission_gnew no válido' })
      continue
    }

    // Buscar contrato por CUPS o su_ref
    let query = admin.from('contracts').select('id').is('deleted_at', null)
    if (cups) {
      query = query.eq('cups', cups)
    } else if (suRef) {
      query = query.eq('su_ref', suRef)
    } else {
      errorRows++
      errors.push({ row: i + 1, error: 'Sin CUPS ni referencia' })
      continue
    }

    const { data: contracts } = await query
    if (!contracts || contracts.length === 0) {
      errorRows++
      errors.push({ row: i + 1, cups, error: 'Contrato no encontrado' })
      continue
    }

    // Actualizar commission_gnew en el contrato
    const contractId = contracts[0].id as string
    const { error: updateError } = await admin
      .from('contracts')
      .update({
        commission_gnew: Number(gnew),
        status_commission_gnew: 'cargada_excel',
      })
      .eq('id', contractId)

    if (updateError) {
      errorRows++
      errors.push({ row: i + 1, cups, error: updateError.message })
      continue
    }

    // Auto-calcular commission_paid
    await recalculateCommissionPaid(admin, contractId, Number(gnew))
    updatedRows++
  }

  // Log de subida
  await admin.from('commission_uploads').insert({
    file_name: fileName,
    total_rows: rows.length,
    updated_rows: updatedRows,
    error_rows: errorRows,
    errors: errors.length > 0 ? errors : null,
    uploaded_by: auth.userId,
  })

  // Audit
  await admin.from('audit_log').insert({
    user_id: auth.userId,
    action: 'commission_excel_upload',
    details: { file_name: fileName, total_rows: rows.length, updated_rows: updatedRows, error_rows: errorRows },
  })

  revalidatePath('/comisionado')
  return { ok: true, totalRows: rows.length, updatedRows, errorRows, errors: errors.length > 0 ? errors : undefined }
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
      campaign:campaigns!commission_formula_config_campaign_id_fkey(name),
      product:products!commission_formula_config_product_id_fkey(name),
      creator:profiles!commission_formula_config_created_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getFormulaConfigs]', error.message)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const campaign = row.campaign as { name: string } | null
    const product = row.product as { name: string } | null
    const creator = row.creator as { full_name: string } | null
    return {
      id: row.id as number,
      campaign_id: row.campaign_id as number,
      product_id: row.product_id as number,
      fee_energia: row.fee_energia as number,
      fee_potencia: row.fee_potencia as number,
      servicio_pct: row.servicio_pct as number,
      version: row.version as number,
      active: row.active as boolean,
      created_by: row.created_by as string,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      campaign_name: campaign?.name ?? '',
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

  const campaignId = Number(formData.get('campaign_id'))
  const productId = Number(formData.get('product_id'))
  const feeEnergia = Number(formData.get('fee_energia') || 0)
  const feePotencia = Number(formData.get('fee_potencia') || 0)
  const servicioPct = Number(formData.get('servicio_pct') || 0)

  if (!campaignId || !productId) {
    return { ok: false, error: 'Campaña y producto son obligatorios.' }
  }

  const admin = getAdminClient()

  // Desactivar config activa previa para la misma campaña+producto
  const { data: existing } = await admin
    .from('commission_formula_config')
    .select('id, version')
    .eq('campaign_id', campaignId)
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
      campaign_id: campaignId,
      product_id: productId,
      fee_energia: feeEnergia,
      fee_potencia: feePotencia,
      servicio_pct: servicioPct,
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
  const feePotencia = Number(formData.get('fee_potencia') || 0)
  const servicioPct = Number(formData.get('servicio_pct') || 0)

  const admin = getAdminClient()

  const { error } = await admin
    .from('commission_formula_config')
    .update({ fee_energia: feeEnergia, fee_potencia: feePotencia, servicio_pct: servicioPct })
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

  // Buscar contratos que coincidan con campaña+producto y no estén bloqueados
  const { data: contracts } = await admin
    .from('contracts')
    .select('id, consumo_anual, media_potencia')
    .eq('campaign_id', config.campaign_id)
    .eq('product_id', config.product_id)
    .is('deleted_at', null)
    .neq('status_commission_gnew', 'bloqueada')

  if (!contracts || contracts.length === 0) {
    return { ok: false, error: 'No se encontraron contratos para esta campaña/producto.' }
  }

  let updated = 0
  const feeE = Number(config.fee_energia)
  const feeP = Number(config.fee_potencia)
  const servPct = Number(config.servicio_pct)

  for (const c of contracts) {
    const consumo = Number(c.consumo_anual ?? 0)
    const potencia = Number(c.media_potencia ?? 0)

    let gnew = consumo * feeE + potencia * feeP
    if (servPct > 0) {
      gnew += gnew * (servPct / 100)
    }
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
      fee_potencia_used: feeP,
      servicio_pct_used: servPct,
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

// ── 10. getUploadHistory ─────────────────────────────────────────────────────

export async function getUploadHistory(): Promise<CommissionUpload[]> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') return []

  const { supabase } = auth

  const { data, error } = await supabase
    .from('commission_uploads')
    .select(`
      *,
      uploader:profiles!commission_uploads_uploaded_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[getUploadHistory]', error.message)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const uploader = row.uploader as { full_name: string } | null
    return {
      id: row.id as number,
      file_name: row.file_name as string,
      total_rows: row.total_rows as number,
      updated_rows: row.updated_rows as number,
      error_rows: row.error_rows as number,
      errors: row.errors as CommissionUpload['errors'],
      uploaded_by: row.uploaded_by as string,
      created_at: row.created_at as string,
      uploaded_by_name: uploader?.full_name ?? '',
    } satisfies CommissionUpload
  })
}

// ── 11. getCampaigns / getProducts ───────────────────────────────────────────

export async function getCampaigns(): Promise<Campaign[]> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') return []

  const { data } = await auth.supabase
    .from('campaigns')
    .select('*')
    .eq('active', true)
    .order('name')

  return (data ?? []) as Campaign[]
}

export async function getProducts(): Promise<Product[]> {
  const auth = await getAuthProfile()
  if (!auth || auth.role !== 'ADMIN') return []

  const { data } = await auth.supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('name')

  return (data ?? []) as Product[]
}
