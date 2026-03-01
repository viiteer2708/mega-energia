'use server'

import { revalidatePath } from 'next/cache'
import { getAdminClient } from '@/lib/supabase/admin'
import { getAuthProfile, isAdminOrBackoffice } from './auth'
import type { ActionResult } from './auth'
import type {
  Role, PagoStatus, CommissionLineFilters, CommissionLineListResult,
  CommissionLineItem,
} from '@/lib/types'

const PAGE_SIZE = 20

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
