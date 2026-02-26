'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { CREATABLE_ROLES } from '@/lib/types'
import type { Role, UserProfile, UserListItem, AssignableUser, CommissionType } from '@/lib/types'

export interface CreateUserResult {
  ok: boolean
  error?: string
}

export interface UpdateUserResult {
  ok: boolean
  error?: string
}

export interface HierarchyNode {
  id: string
  full_name: string
  role: Role
}

export interface UserDetailData {
  profile: UserProfile
  parentChain: HierarchyNode[]
  subordinates: HierarchyNode[]
}

export async function getUsers(): Promise<UserListItem[]> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    console.error('[getUsers] Auth error:', authError?.message ?? 'no user')
    return []
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, alias, commission_type, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getUsers] Query error:', error.message)
    return []
  }

  return (data ?? []) as UserListItem[]
}

export async function getAssignableUsers(): Promise<AssignableUser[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role, parent_id')
    .order('full_name')

  return (data ?? []) as AssignableUser[]
}

export async function createUser(
  _prev: CreateUserResult | null,
  formData: FormData
): Promise<CreateUserResult> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[createUser] SUPABASE_SERVICE_ROLE_KEY no está configurada')
    return { ok: false, error: 'Servicio no configurado. Contacta al administrador.' }
  }

  try {
    const supabase = await createClient()

    const { data: { user: currentAuthUser } } = await supabase.auth.getUser()
    if (!currentAuthUser) redirect('/login')

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentAuthUser.id)
      .single()

    if (!currentProfile) redirect('/login')

    const currentRole = currentProfile.role as Role
    const allowedRoles = CREATABLE_ROLES[currentRole]

    // Campos obligatorios
    const email = (formData.get('email') as string)?.trim()
    const password = (formData.get('password') as string)?.trim()
    const fullName = (formData.get('full_name') as string)?.trim()
    const alias = (formData.get('alias') as string)?.trim()
    const role = formData.get('role') as Role

    if (!email || !password || !fullName || !alias || !role) {
      return { ok: false, error: 'Email, password, nombre, alias y rol son obligatorios.' }
    }

    if (!allowedRoles.includes(role)) {
      return { ok: false, error: 'No tienes permiso para asignar ese rol.' }
    }

    // Campos opcionales
    const commercialNif = (formData.get('commercial_nif') as string)?.trim() ?? ''
    const commercialAddress = (formData.get('commercial_address') as string)?.trim() ?? ''
    const commercialPostalCode = (formData.get('commercial_postal_code') as string)?.trim() ?? ''

    const billingName = (formData.get('billing_name') as string)?.trim() ?? ''
    const billingNif = (formData.get('billing_nif') as string)?.trim() ?? ''
    const billingAddress = (formData.get('billing_address') as string)?.trim() ?? ''
    const billingPostalCode = (formData.get('billing_postal_code') as string)?.trim() ?? ''
    const billingCity = (formData.get('billing_city') as string)?.trim() ?? ''
    const billingIban = (formData.get('billing_iban') as string)?.trim() ?? ''
    const billingRetentionPct = parseFloat(formData.get('billing_retention_pct') as string) || 0
    const billingVatPct = parseFloat(formData.get('billing_vat_pct') as string) || 21

    // Solo ADMIN puede establecer campos de comisión; resto usa valores por defecto
    let commissionType: CommissionType = 'otro'
    let commissionPct: number | null = null
    let walletPersonal = 0.5
    let walletFamily = 0.5

    if (currentRole === 'ADMIN') {
      commissionType = (formData.get('commission_type') as CommissionType) || 'otro'
      const commissionPctRaw = formData.get('commission_pct') as string | null
      commissionPct = commissionPctRaw ? Math.min(100, Math.max(0, parseFloat(commissionPctRaw))) : null
      walletPersonal = parseFloat(formData.get('wallet_personal') as string) || 0.5
      walletFamily = parseFloat(formData.get('wallet_family') as string) || 0.5
    }

    const parentId = (formData.get('parent_id') as string)?.trim() || currentAuthUser.id
    const subordinateIdsRaw = (formData.get('subordinate_ids') as string)?.trim()
    const subordinateIds = subordinateIdsRaw ? subordinateIdsRaw.split(',').filter(Boolean) : []

    const admin = getAdminClient()

    // Crear usuario en auth
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (createError || !newUser.user) {
      console.error('[createUser] Error de Supabase:', createError?.message)
      return {
        ok: false,
        error: createError?.message === 'A user with this email address has already been registered'
          ? 'Ya existe un usuario con ese email.'
          : `Error al crear usuario: ${createError?.message ?? 'desconocido'}`,
      }
    }

    // Actualizar perfil con todos los campos
    await admin
      .from('profiles')
      .update({
        full_name: fullName,
        role,
        parent_id: parentId,
        alias,
        commercial_nif: commercialNif,
        commercial_address: commercialAddress,
        commercial_postal_code: commercialPostalCode,
        billing_name: billingName,
        billing_nif: billingNif,
        billing_address: billingAddress,
        billing_postal_code: billingPostalCode,
        billing_city: billingCity,
        billing_iban: billingIban,
        billing_retention_pct: billingRetentionPct,
        billing_vat_pct: billingVatPct,
        commission_type: commissionType,
        commission_pct: commissionPct,
        wallet_personal: walletPersonal,
        wallet_family: walletFamily,
      })
      .eq('id', newUser.user.id)

    // Insertar contador de factura para el año actual
    const currentYear = new Date().getFullYear()
    await admin
      .from('invoice_counters')
      .insert({ user_id: newUser.user.id, year: currentYear, last_number: 0 })

    // Asignar subordinados si se indicaron
    if (subordinateIds.length > 0) {
      await admin
        .from('profiles')
        .update({ parent_id: newUser.user.id })
        .in('id', subordinateIds)
    }

    revalidatePath('/usuarios')
    return { ok: true }
  } catch (err) {
    if (isRedirectError(err)) throw err
    console.error('[createUser] Error inesperado:', err)
    return { ok: false, error: 'Error inesperado. Revisa los logs del servidor.' }
  }
}

// ── getUserById ────────────────────────────────────────────────────────────────

export async function getUserById(id: string): Promise<UserDetailData | null> {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  // Obtener rol del caller para filtrar campos sensibles
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authUser.id)
    .single()

  const callerRole = callerProfile?.role as Role | undefined

  // Perfil completo
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, parent_id, avatar_url, alias, commercial_nif, commercial_address, commercial_postal_code, billing_name, billing_nif, billing_address, billing_postal_code, billing_city, billing_iban, billing_retention_pct, billing_vat_pct, commission_type, commission_pct, wallet_personal, wallet_family')
    .eq('id', id)
    .single()

  if (error || !profile) return null

  // Defensa en profundidad: eliminar campos de comisión si no es ADMIN
  if (callerRole !== 'ADMIN') {
    profile.commission_type = null
    profile.commission_pct = null
    profile.wallet_personal = null
    profile.wallet_family = null
  }

  // Cadena ascendente de superiores
  const parentChain: HierarchyNode[] = []
  if (profile.parent_id) {
    // Obtenemos todos los perfiles para recorrer la cadena
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, role, parent_id')

    if (allProfiles) {
      const map = new Map(allProfiles.map(p => [p.id, p]))
      let currentId: string | null = profile.parent_id
      const visited = new Set<string>()
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId)
        const node = map.get(currentId)
        if (!node) break
        parentChain.unshift({ id: node.id, full_name: node.full_name, role: node.role as Role })
        currentId = node.parent_id
      }
    }
  }

  // Subordinados directos
  const { data: subs } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('parent_id', id)
    .order('full_name')

  return {
    profile: profile as UserProfile,
    parentChain,
    subordinates: (subs ?? []) as HierarchyNode[],
  }
}

// ── updateUser ─────────────────────────────────────────────────────────────────

export async function updateUser(
  _prev: UpdateUserResult | null,
  formData: FormData
): Promise<UpdateUserResult> {
  try {
    const supabase = await createClient()

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return { ok: false, error: 'No autenticado.' }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (!currentProfile) return { ok: false, error: 'Perfil no encontrado.' }

    const currentRole = currentProfile.role as Role
    if (currentRole !== 'ADMIN' && currentRole !== 'BACKOFFICE') {
      return { ok: false, error: 'No tienes permisos para editar usuarios.' }
    }

    const userId = (formData.get('user_id') as string)?.trim()
    if (!userId) return { ok: false, error: 'ID de usuario no proporcionado.' }

    const fullName = (formData.get('full_name') as string)?.trim()
    const alias = (formData.get('alias') as string)?.trim()

    if (!fullName || !alias) {
      return { ok: false, error: 'Nombre y alias son obligatorios.' }
    }

    const updateData: Record<string, unknown> = {
      full_name: fullName,
      alias,
      commercial_nif: (formData.get('commercial_nif') as string)?.trim() ?? '',
      commercial_address: (formData.get('commercial_address') as string)?.trim() ?? '',
      commercial_postal_code: (formData.get('commercial_postal_code') as string)?.trim() ?? '',
      billing_name: (formData.get('billing_name') as string)?.trim() ?? '',
      billing_nif: (formData.get('billing_nif') as string)?.trim() ?? '',
      billing_address: (formData.get('billing_address') as string)?.trim() ?? '',
      billing_postal_code: (formData.get('billing_postal_code') as string)?.trim() ?? '',
      billing_city: (formData.get('billing_city') as string)?.trim() ?? '',
      billing_iban: (formData.get('billing_iban') as string)?.trim() ?? '',
      billing_retention_pct: parseFloat(formData.get('billing_retention_pct') as string) || 0,
      billing_vat_pct: parseFloat(formData.get('billing_vat_pct') as string) || 21,
    }

    // Solo ADMIN puede modificar campos de comisión
    if (currentRole === 'ADMIN') {
      updateData.commission_type = (formData.get('commission_type') as CommissionType) || 'otro'
      updateData.commission_pct = formData.get('commission_pct')
        ? Math.min(100, Math.max(0, parseFloat(formData.get('commission_pct') as string)))
        : null
      updateData.wallet_personal = parseFloat(formData.get('wallet_personal') as string) || 0.5
      updateData.wallet_family = parseFloat(formData.get('wallet_family') as string) || 0.5
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    if (updateError) {
      console.error('[updateUser] Error:', updateError.message)
      return { ok: false, error: `Error al actualizar: ${updateError.message}` }
    }

    revalidatePath(`/usuarios/${userId}`)
    revalidatePath('/usuarios')
    return { ok: true }
  } catch (err) {
    if (isRedirectError(err)) throw err
    console.error('[updateUser] Error inesperado:', err)
    return { ok: false, error: 'Error inesperado. Revisa los logs del servidor.' }
  }
}
