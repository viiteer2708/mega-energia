'use server'

import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { getEditableFields, getVisibleFields } from '@/lib/contract-permissions'
import {
  isValidDNI, isValidCIF, isValidIBAN,
  isValidCUPS, isValidPhone, isValidEmail,
} from '@/lib/validations/validators'
import type {
  Role, ContractEstado, ContractListResult,
  ContractFilters, ContractDetailResponse, Contract,
  ContractCommission, ContractDocument, ContractStateLog, Product,
  AssignableUser,
} from '@/lib/types'

// ── Helpers ──────────────────────────────────────────────────────────────────

interface ActionResult {
  ok: boolean
  error?: string
  id?: string
  duplicates?: Array<{ id: string; cups: string; titular: string; estado: ContractEstado }>
}

const PAGE_SIZE = 20

async function getAuthProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, parent_id')
    .eq('id', user.id)
    .single()

  return profile ? { supabase, userId: user.id, role: profile.role as Role } : null
}

/** Elimina campos de gestión del contrato para roles non-ADMIN/BO */
function stripGestionFields(contract: Contract): void {
  contract.operador_id = null
  contract.operador_name = undefined
  contract.su_ref = null
  contract.fecha_entrega_contrato = null
  contract.fecha_cobro_distribuidor = null
}

// ── 1. getContracts ──────────────────────────────────────────────────────────

export async function getContracts(filters: ContractFilters = {}): Promise<ContractListResult> {
  const auth = await getAuthProfile()
  if (!auth) return { contracts: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0 }

  const { supabase, role } = auth
  const page = filters.page ?? 1
  const offset = (page - 1) * PAGE_SIZE
  const isAdminOrBo = role === 'ADMIN' || role === 'BACKOFFICE'

  // Usamos la vista safe para non-ADMIN (ya filtra deleted_at IS NULL)
  const table = role === 'ADMIN' ? 'contracts' : 'contracts_safe'

  let query = supabase
    .from(table)
    .select('*, owner:profiles!contracts_owner_id_fkey(full_name), product:products!contracts_product_id_fkey(name, type)', { count: 'exact' })

  // ADMIN usa tabla directa, filtrar soft-deleted manualmente
  if (role === 'ADMIN') {
    query = query.is('deleted_at', null)
  }

  // Filtros
  if (filters.search) {
    const search = `%${filters.search}%`
    query = query.or(`cups.ilike.${search},titular_contrato.ilike.${search},dni_firmante.ilike.${search}`)
  }
  if (filters.estado) {
    query = query.eq('estado', filters.estado)
  }
  if (filters.fecha_desde) {
    query = query.gte('fecha_alta', filters.fecha_desde)
  }
  if (filters.fecha_hasta) {
    query = query.lte('fecha_alta', filters.fecha_hasta)
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const { data, count, error } = await query

  if (error) {
    console.error('[getContracts]', error.message)
    return { contracts: [], total: 0, page, pageSize: PAGE_SIZE, totalPages: 0 }
  }

  const total = count ?? 0
  const contracts: Contract[] = (data ?? []).map((row: Record<string, unknown>) => {
    const owner = row.owner as { full_name: string } | null
    const product = row.product as { name: string; type: string } | null
    return {
      ...row,
      owner_name: owner?.full_name ?? '',
      product_name: product?.name ?? '',
      product_type: product?.type as Contract['product_type'],
      owner: undefined,
      product: undefined,
    } as unknown as Contract
  })

  // Strip campos sensibles según rol
  if (!isAdminOrBo) {
    for (const c of contracts) {
      c.cuenta_bancaria = null
      stripGestionFields(c)
    }
  }

  return {
    contracts,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  }
}

// ── 2. getContract (detalle) ─────────────────────────────────────────────────

export async function getContract(id: string): Promise<ContractDetailResponse | null> {
  const auth = await getAuthProfile()
  if (!auth) return null

  const { supabase, userId, role } = auth
  const table = role === 'ADMIN' ? 'contracts' : 'contracts_safe'
  const isAdminOrBo = role === 'ADMIN' || role === 'BACKOFFICE'

  let contractQuery = supabase
    .from(table)
    .select('*, owner:profiles!contracts_owner_id_fkey(full_name), operador:profiles!contracts_operador_id_fkey(full_name), product:products!contracts_product_id_fkey(name, type)')
    .eq('id', id)

  // Filtrar soft-deleted para ADMIN (contracts_safe ya lo hace)
  if (role === 'ADMIN') {
    contractQuery = contractQuery.is('deleted_at', null)
  }

  const { data: contract, error } = await contractQuery.single()

  if (error || !contract) return null

  const owner = (contract as Record<string, unknown>).owner as { full_name: string } | null
  const operador = (contract as Record<string, unknown>).operador as { full_name: string } | null
  const product = (contract as Record<string, unknown>).product as { name: string; type: string } | null

  const contractData: Contract = {
    ...(contract as unknown as Contract),
    owner_name: owner?.full_name ?? '',
    operador_name: operador?.full_name ?? '',
    product_name: product?.name ?? '',
    product_type: product?.type as Contract['product_type'],
  }

  const isCreator = contractData.owner_id === userId

  // Strip cuenta_bancaria
  if (!isAdminOrBo && !isCreator) {
    contractData.cuenta_bancaria = null
  }

  // Strip campos de gestión para non-ADMIN/BO
  if (!isAdminOrBo) {
    stripGestionFields(contractData)
  }

  // Cargar commissions, documents, state_log en paralelo
  const [commissionsRes, docsRes, logRes, transitionsRes] = await Promise.all([
    supabase
      .from('contract_commissions')
      .select('*, user:profiles!contract_commissions_user_id_fkey(full_name)')
      .eq('contract_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('contract_documents')
      .select('*, uploader:profiles!contract_documents_uploaded_by_fkey(full_name)')
      .eq('contract_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('contract_state_log')
      .select('*, changer:profiles!contract_state_log_changed_by_fkey(full_name)')
      .eq('contract_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('state_transitions')
      .select('to_state')
      .eq('role', role)
      .eq('from_state', contractData.estado),
  ])

  const commissions: ContractCommission[] = (commissionsRes.data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    user_name: (row.user as { full_name: string } | null)?.full_name ?? '',
    user: undefined,
  })) as unknown as ContractCommission[]

  const documents: ContractDocument[] = (docsRes.data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    uploader_name: (row.uploader as { full_name: string } | null)?.full_name ?? '',
    uploader: undefined,
  })) as unknown as ContractDocument[]

  const state_log: ContractStateLog[] = (logRes.data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    changed_by_name: (row.changer as { full_name: string } | null)?.full_name ?? '',
    changer: undefined,
  })) as unknown as ContractStateLog[]

  const allowed_transitions: ContractEstado[] = role === 'ADMIN'
    ? getAllAdminTransitions(contractData.estado)
    : (transitionsRes.data ?? []).map((r: Record<string, unknown>) => r.to_state as ContractEstado)

  const editable_fields = getEditableFields(contractData.estado, role, isCreator)
  const visible_fields = getVisibleFields(role, isCreator)

  return {
    contract: contractData,
    commissions,
    documents,
    state_log,
    editable_fields,
    visible_fields,
    allowed_transitions,
  }
}

function getAllAdminTransitions(current: ContractEstado): ContractEstado[] {
  const map: Record<ContractEstado, ContractEstado[]> = {
    borrador: ['pendiente_validacion'],
    pendiente_validacion: ['tramitado', 'devuelto', 'ko'],
    devuelto: ['pendiente_validacion', 'borrador'],
    tramitado: ['pendiente_aceptacion', 'no_tramitado'],
    no_tramitado: [],
    pendiente_aceptacion: ['futura_activacion', 'ko'],
    futura_activacion: ['pendiente_instalacion', 'ok'],
    pendiente_instalacion: ['ok'],
    pendiente_renovar: [],
    ok: ['pendiente_renovar', 'incidencia', 'aviso_baja'],
    incidencia: ['ok'],
    ko: ['borrador'],
    baja: [],
    aviso_baja: ['baja', 'ok'],
  }
  return map[current] ?? []
}

// ── 3. createContract ────────────────────────────────────────────────────────

export async function createContract(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const auth = await getAuthProfile()
    if (!auth) redirect('/login')

    const { supabase, userId, role } = auth
    const isAdminOrBo = role === 'ADMIN' || role === 'BACKOFFICE'

    const ownerId = (formData.get('owner_id') as string)?.trim() || userId

    // Verificar jerarquía si owner_id ≠ self
    if (ownerId !== userId && !isAdminOrBo) {
      // Non-ADMIN/BO solo pueden crear para descendientes
      const { data: isDesc } = await supabase.rpc('is_descendant_of', {
        child_id: ownerId,
        ancestor_id: userId,
      })
      if (!isDesc) {
        return { ok: false, error: 'No tienes permiso para crear contratos para este usuario.' }
      }
    }

    const insertData: Record<string, unknown> = {
      owner_id: ownerId,
      estado: 'borrador',
      product_id: formData.get('product_id') ? Number(formData.get('product_id')) : null,
      observaciones: (formData.get('observaciones') as string)?.trim() || null,
      cups: (formData.get('cups') as string)?.trim().toUpperCase() || null,
      tarifa: (formData.get('tarifa') as string)?.trim() || null,
      potencia_1: formData.get('potencia_1') ? Number(formData.get('potencia_1')) : null,
      potencia_2: formData.get('potencia_2') ? Number(formData.get('potencia_2')) : null,
      potencia_3: formData.get('potencia_3') ? Number(formData.get('potencia_3')) : null,
      potencia_4: formData.get('potencia_4') ? Number(formData.get('potencia_4')) : null,
      potencia_5: formData.get('potencia_5') ? Number(formData.get('potencia_5')) : null,
      potencia_6: formData.get('potencia_6') ? Number(formData.get('potencia_6')) : null,
      consumo_anual: formData.get('consumo_anual') ? Number(formData.get('consumo_anual')) : null,
      direccion: (formData.get('direccion') as string)?.trim() || null,
      codigo_postal: (formData.get('codigo_postal') as string)?.trim() || null,
      poblacion: (formData.get('poblacion') as string)?.trim() || null,
      provincia: (formData.get('provincia') as string)?.trim() || null,
      datos_manuales: formData.get('datos_manuales') === 'true',
      titular_contrato: (formData.get('titular_contrato') as string)?.trim() || null,
      cif: (formData.get('cif') as string)?.trim().toUpperCase() || null,
      nombre_firmante: (formData.get('nombre_firmante') as string)?.trim() || null,
      dni_firmante: (formData.get('dni_firmante') as string)?.trim().toUpperCase() || null,
      telefono_1: (formData.get('telefono_1') as string)?.trim() || null,
      telefono_2: (formData.get('telefono_2') as string)?.trim() || null,
      email_titular: (formData.get('email_titular') as string)?.trim().toLowerCase() || null,
      cuenta_bancaria: (formData.get('cuenta_bancaria') as string)?.trim().toUpperCase().replace(/\s/g, '') || null,
      fecha_firma: (formData.get('fecha_firma') as string)?.trim() || null,
    }

    // Solo ADMIN/BO pueden establecer operador_id
    if (isAdminOrBo) {
      const operadorId = (formData.get('operador_id') as string)?.trim()
      if (operadorId) insertData.operador_id = operadorId
    }

    const { data, error } = await supabase
      .from('contracts')
      .insert(insertData)
      .select('id')
      .single()

    if (error) {
      console.error('[createContract]', error.message)
      return { ok: false, error: `Error al crear contrato: ${error.message}` }
    }

    // Log de estado inicial
    await supabase
      .from('contract_state_log')
      .insert({
        contract_id: data.id,
        from_state: null,
        to_state: 'borrador',
        changed_by: userId,
      })

    return { ok: true, id: data.id }
  } catch (err) {
    if (isRedirectError(err)) throw err
    console.error('[createContract]', err)
    return { ok: false, error: 'Error inesperado al crear contrato.' }
  }
}

// ── 4. updateContract ────────────────────────────────────────────────────────

export async function updateContract(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const auth = await getAuthProfile()
    if (!auth) redirect('/login')

    const { supabase, userId, role } = auth
    const isAdminOrBo = role === 'ADMIN' || role === 'BACKOFFICE'

    // Obtener contrato para verificar permisos
    const { data: contract } = await supabase
      .from('contracts')
      .select('owner_id, estado')
      .eq('id', id)
      .single()

    if (!contract) return { ok: false, error: 'Contrato no encontrado.' }

    const isCreator = contract.owner_id === userId
    const allowed = getEditableFields(contract.estado as ContractEstado, role, isCreator)

    // Construir update solo con campos permitidos
    const updateData: Record<string, unknown> = {}
    const fieldMap: Record<string, (v: string) => unknown> = {
      product_id: (v) => v ? Number(v) : null,
      observaciones: (v) => v.trim() || null,
      cups: (v) => v.trim().toUpperCase() || null,
      tarifa: (v) => v.trim() || null,
      potencia_1: (v) => v ? Number(v) : null,
      potencia_2: (v) => v ? Number(v) : null,
      potencia_3: (v) => v ? Number(v) : null,
      potencia_4: (v) => v ? Number(v) : null,
      potencia_5: (v) => v ? Number(v) : null,
      potencia_6: (v) => v ? Number(v) : null,
      consumo_anual: (v) => v ? Number(v) : null,
      direccion: (v) => v.trim() || null,
      codigo_postal: (v) => v.trim() || null,
      poblacion: (v) => v.trim() || null,
      provincia: (v) => v.trim() || null,
      datos_manuales: (v) => v === 'true',
      titular_contrato: (v) => v.trim() || null,
      cif: (v) => v.trim().toUpperCase() || null,
      nombre_firmante: (v) => v.trim() || null,
      dni_firmante: (v) => v.trim().toUpperCase() || null,
      telefono_1: (v) => v.trim() || null,
      telefono_2: (v) => v.trim() || null,
      email_titular: (v) => v.trim().toLowerCase() || null,
      cuenta_bancaria: (v) => v.trim().toUpperCase().replace(/\s/g, '') || null,
      fecha_firma: (v) => v.trim() || null,
      operador_id: (v) => v.trim() || null,
      su_ref: (v) => v.trim() || null,
      campaign_id: (v) => v ? Number(v) : null,
      fecha_entrega_contrato: (v) => v.trim() || null,
      fecha_cobro_distribuidor: (v) => v.trim() || null,
      commission_gnew: (v) => Number(v) || 0,
      decomission_gnew: (v) => Number(v) || 0,
    }

    for (const field of allowed) {
      // Guardia: non-ADMIN/BO no pueden escribir operador_id
      if (!isAdminOrBo && field === 'operador_id') continue

      const raw = formData.get(field) as string | null
      if (raw !== null && fieldMap[field]) {
        updateData[field] = fieldMap[field](raw)
      }
    }

    if (Object.keys(updateData).length === 0) {
      return { ok: true }
    }

    const { error } = await supabase
      .from('contracts')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('[updateContract]', error.message)
      return { ok: false, error: `Error al actualizar: ${error.message}` }
    }

    return { ok: true }
  } catch (err) {
    if (isRedirectError(err)) throw err
    console.error('[updateContract]', err)
    return { ok: false, error: 'Error inesperado al actualizar contrato.' }
  }
}

// ── 5. changeState ───────────────────────────────────────────────────────────

export async function changeState(
  id: string,
  newState: ContractEstado,
  motivo?: string,
  camposDevueltos?: string[]
): Promise<ActionResult> {
  try {
    const auth = await getAuthProfile()
    if (!auth) redirect('/login')

    const { supabase, userId, role } = auth

    // Obtener estado actual (excluir soft-deleted)
    const { data: contract } = await supabase
      .from('contracts')
      .select('estado, cups, deleted_at')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (!contract) return { ok: false, error: 'Contrato no encontrado.' }

    const currentState = contract.estado as ContractEstado

    // Validar transición y consultar requires_motivo/requires_campos
    if (role !== 'ADMIN') {
      const { data: transition } = await supabase
        .from('state_transitions')
        .select('id, requires_motivo, requires_campos')
        .eq('role', role)
        .eq('from_state', currentState)
        .eq('to_state', newState)
        .single()

      if (!transition) return { ok: false, error: 'Transición de estado no permitida.' }

      // Validar motivo obligatorio
      if (transition.requires_motivo && !motivo?.trim()) {
        return { ok: false, error: 'Se requiere un motivo para esta transición.' }
      }
      // Validar campos a corregir obligatorios
      if (transition.requires_campos && (!camposDevueltos || camposDevueltos.length === 0)) {
        return { ok: false, error: 'Se requiere indicar los campos a corregir.' }
      }
    } else {
      // ADMIN: también validar motivo para devuelto y ko
      if (newState === 'devuelto' && !motivo?.trim()) {
        return { ok: false, error: 'Se requiere un motivo para devolver el contrato.' }
      }
      if (newState === 'devuelto' && (!camposDevueltos || camposDevueltos.length === 0)) {
        return { ok: false, error: 'Se requiere indicar los campos a corregir.' }
      }
      if (newState === 'ko' && !motivo?.trim()) {
        return { ok: false, error: 'Se requiere un motivo para marcar como KO.' }
      }
    }

    // Si va a pendiente_validacion: detectar duplicados por CUPS
    let duplicates: ActionResult['duplicates']
    if (newState === 'pendiente_validacion' && contract.cups) {
      const { data: dups } = await supabase
        .from('contracts')
        .select('id, cups, titular_contrato, estado')
        .eq('cups', contract.cups)
        .eq('activo', true)
        .neq('id', id)
        .is('deleted_at', null)
        .in('estado', ['pendiente_validacion', 'tramitado', 'pendiente_aceptacion', 'futura_activacion', 'pendiente_instalacion', 'ok'])

      if (dups && dups.length > 0) {
        duplicates = dups.map(d => ({
          id: d.id,
          cups: d.cups ?? '',
          titular: d.titular_contrato ?? '',
          estado: d.estado as ContractEstado,
        }))
        // CUPS con estado OK → bloquear
        const hasActive = dups.some(d => d.estado === 'ok')
        if (hasActive) {
          return {
            ok: false,
            error: 'Ya existe un contrato OK con este CUPS. No se puede enviar a validación.',
            duplicates,
          }
        }
      }
    }

    // Ejecutar transición + guardar motivo/campos si es devolución
    const updateData: Record<string, unknown> = { estado: newState }
    if (newState === 'devuelto') {
      updateData.devolucion_motivo = motivo || null
      updateData.campos_a_corregir = camposDevueltos || null
    }
    // Limpiar devolución cuando sale del estado devuelto
    if (currentState === 'devuelto' && newState !== 'devuelto') {
      updateData.devolucion_motivo = null
      updateData.campos_a_corregir = null
    }

    const { error } = await supabase
      .from('contracts')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('[changeState]', error.message)
      return { ok: false, error: `Error al cambiar estado: ${error.message}` }
    }

    // Log de estado
    await supabase
      .from('contract_state_log')
      .insert({
        contract_id: id,
        from_state: currentState,
        to_state: newState,
        changed_by: userId,
        motivo: motivo || null,
        campos_devueltos: camposDevueltos || null,
      })

    // Auditoría
    await supabase
      .from('audit_log')
      .insert({
        contract_id: id,
        user_id: userId,
        action: 'status_change',
        details: {
          from: currentState,
          to: newState,
          motivo: motivo || null,
          campos_a_corregir: camposDevueltos || null,
        },
      })

    return { ok: true, duplicates }
  } catch (err) {
    if (isRedirectError(err)) throw err
    console.error('[changeState]', err)
    return { ok: false, error: 'Error inesperado al cambiar estado.' }
  }
}

// ── 6. saveDraft ─────────────────────────────────────────────────────────────

export async function saveDraft(
  id: string,
  draftData: Record<string, unknown>
): Promise<ActionResult> {
  try {
    const auth = await getAuthProfile()
    if (!auth) redirect('/login')

    const { supabase } = auth

    const { error } = await supabase
      .from('contracts')
      .update({ draft_data: draftData })
      .eq('id', id)

    if (error) {
      console.error('[saveDraft]', error.message)
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    if (isRedirectError(err)) throw err
    return { ok: false, error: 'Error al guardar borrador.' }
  }
}

// ── 7. uploadDocument ────────────────────────────────────────────────────────

export async function uploadDocument(formData: FormData): Promise<ActionResult & { document?: ContractDocument }> {
  try {
    const auth = await getAuthProfile()
    if (!auth) redirect('/login')

    const { supabase, userId } = auth
    const contractId = formData.get('contract_id') as string
    const tipoDoc = formData.get('tipo_doc') as string
    const file = formData.get('file') as File

    if (!contractId || !tipoDoc || !file) {
      return { ok: false, error: 'Faltan campos requeridos.' }
    }

    // Validar tipo y tamaño
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      return { ok: false, error: 'Solo se permiten archivos PDF, JPG y PNG.' }
    }
    if (file.size > 10 * 1024 * 1024) {
      return { ok: false, error: 'El archivo no puede superar 10MB.' }
    }

    // Subir a Storage
    const fileExt = file.name.split('.').pop()
    const storagePath = `contracts/${contractId}/${crypto.randomUUID()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('contract-documents')
      .upload(storagePath, file)

    if (uploadError) {
      console.error('[uploadDocument] Storage:', uploadError.message)
      return { ok: false, error: `Error al subir archivo: ${uploadError.message}` }
    }

    // Registrar en DB
    const { data: doc, error: dbError } = await supabase
      .from('contract_documents')
      .insert({
        contract_id: contractId,
        tipo_doc: tipoDoc,
        file_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: userId,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[uploadDocument] DB:', dbError.message)
      return { ok: false, error: dbError.message }
    }

    return { ok: true, document: doc as unknown as ContractDocument }
  } catch (err) {
    if (isRedirectError(err)) throw err
    console.error('[uploadDocument]', err)
    return { ok: false, error: 'Error al subir documento.' }
  }
}

// ── 8. deleteDocument ────────────────────────────────────────────────────────

export async function deleteDocument(docId: number): Promise<ActionResult> {
  try {
    const auth = await getAuthProfile()
    if (!auth) redirect('/login')

    const { supabase } = auth

    // Obtener path para borrar de Storage
    const { data: doc } = await supabase
      .from('contract_documents')
      .select('file_path')
      .eq('id', docId)
      .single()

    if (!doc) return { ok: false, error: 'Documento no encontrado.' }

    // Borrar de Storage
    await supabase.storage
      .from('contract-documents')
      .remove([doc.file_path])

    // Borrar de DB
    const { error } = await supabase
      .from('contract_documents')
      .delete()
      .eq('id', docId)

    if (error) {
      console.error('[deleteDocument]', error.message)
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    if (isRedirectError(err)) throw err
    return { ok: false, error: 'Error al eliminar documento.' }
  }
}

// ── 9. getProducts (para select en formulario) ──────────────────────────────

export async function getProducts(): Promise<Product[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('name')

  return (data ?? []) as Product[]
}

// ── 10. getDevueltoCount (para badge sidebar) ────────────────────────────────

export async function getDevueltoCount(): Promise<number> {
  const auth = await getAuthProfile()
  if (!auth) return 0

  const { supabase } = auth
  const { count } = await supabase
    .from('contracts')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'devuelto')
    .is('deleted_at', null)

  return count ?? 0
}

// ── 11. deleteContract (soft-delete) ─────────────────────────────────────────

export async function deleteContract(id: string, motivo: string): Promise<ActionResult> {
  try {
    const auth = await getAuthProfile()
    if (!auth) redirect('/login')

    const { supabase, userId, role } = auth

    if (role !== 'ADMIN') {
      return { ok: false, error: 'Solo ADMIN puede eliminar contratos.' }
    }

    if (!motivo?.trim()) {
      return { ok: false, error: 'Se requiere un motivo para eliminar el contrato.' }
    }

    // Verificar estado: solo borrador o ko
    const { data: contract } = await supabase
      .from('contracts')
      .select('estado')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (!contract) return { ok: false, error: 'Contrato no encontrado.' }

    const estado = contract.estado as ContractEstado
    if (estado !== 'borrador' && estado !== 'ko') {
      return { ok: false, error: 'Solo se pueden eliminar contratos en estado borrador o KO.' }
    }

    // Soft-delete
    const { error } = await supabase
      .from('contracts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('[deleteContract]', error.message)
      return { ok: false, error: `Error al eliminar: ${error.message}` }
    }

    // Auditoría
    await supabase
      .from('audit_log')
      .insert({
        contract_id: id,
        user_id: userId,
        action: 'soft_delete',
        details: { motivo, estado_previo: estado },
      })

    return { ok: true }
  } catch (err) {
    if (isRedirectError(err)) throw err
    console.error('[deleteContract]', err)
    return { ok: false, error: 'Error inesperado al eliminar contrato.' }
  }
}

// ── 12. getContractsExport (sin paginación, solo ADMIN/BO) ──────────────────

export async function getContractsExport(filters: ContractFilters = {}): Promise<Contract[]> {
  const auth = await getAuthProfile()
  if (!auth) return []

  const { supabase, role } = auth
  const isAdminOrBo = role === 'ADMIN' || role === 'BACKOFFICE'

  if (!isAdminOrBo) return []

  const table = role === 'ADMIN' ? 'contracts' : 'contracts_safe'

  let query = supabase
    .from(table)
    .select('*, owner:profiles!contracts_owner_id_fkey(full_name), product:products!contracts_product_id_fkey(name, type)')

  if (role === 'ADMIN') {
    query = query.is('deleted_at', null)
  }

  if (filters.search) {
    const search = `%${filters.search}%`
    query = query.or(`cups.ilike.${search},titular_contrato.ilike.${search},dni_firmante.ilike.${search}`)
  }
  if (filters.estado) {
    query = query.eq('estado', filters.estado)
  }
  if (filters.product_type) {
    query = query.eq('product.type', filters.product_type)
  }
  if (filters.fecha_desde) {
    query = query.gte('fecha_alta', filters.fecha_desde)
  }
  if (filters.fecha_hasta) {
    query = query.lte('fecha_alta', filters.fecha_hasta)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) {
    console.error('[getContractsExport]', error.message)
    return []
  }

  const contracts: Contract[] = (data ?? []).map((row: Record<string, unknown>) => {
    const owner = row.owner as { full_name: string } | null
    const product = row.product as { name: string; type: string } | null
    return {
      ...row,
      owner_name: owner?.full_name ?? '',
      product_name: product?.name ?? '',
      product_type: product?.type as Contract['product_type'],
      owner: undefined,
      product: undefined,
    } as unknown as Contract
  })

  // BO: strip commission fields (la vista ya los excluye, pero doble seguridad)
  if (role === 'BACKOFFICE') {
    for (const c of contracts) {
      c.commission_gnew = 0
      c.decomission_gnew = 0
      c.beneficio = 0
    }
  }

  return contracts
}

// ── 13. getAssignableUsers ───────────────────────────────────────────────────

export async function getAssignableUsers(): Promise<AssignableUser[]> {
  const auth = await getAuthProfile()
  if (!auth) return []

  const { supabase, userId, role } = auth
  const isAdminOrBo = role === 'ADMIN' || role === 'BACKOFFICE'

  if (isAdminOrBo) {
    // ADMIN/BO: todos los usuarios
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, parent_id')
      .order('full_name')

    return (data ?? []).map(p => ({
      id: p.id,
      full_name: p.full_name,
      role: p.role as Role,
      parent_id: p.parent_id,
    }))
  }

  // Otros roles: self + descendants
  const { data: descendants } = await supabase.rpc('get_descendants', { root_id: userId })

  const allIds = [userId, ...(descendants ?? [])]

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role, parent_id')
    .in('id', allIds)
    .order('full_name')

  return (data ?? []).map(p => ({
    id: p.id,
    full_name: p.full_name,
    role: p.role as Role,
    parent_id: p.parent_id,
  }))
}
