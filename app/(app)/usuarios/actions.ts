'use server'

import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { CREATABLE_ROLES } from '@/lib/types'
import type { Role, UserListItem, AssignableUser, CommissionType } from '@/lib/types'

export interface CreateUserResult {
  ok: boolean
  error?: string
}

export async function getUsers(): Promise<UserListItem[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, alias, commission_type, created_at')
    .order('created_at', { ascending: false })

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

    const commissionType = (formData.get('commission_type') as CommissionType) || 'otro'
    const walletPersonal = parseFloat(formData.get('wallet_personal') as string) || 0.5
    const walletFamily = parseFloat(formData.get('wallet_family') as string) || 0.5

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

    return { ok: true }
  } catch (err) {
    if (isRedirectError(err)) throw err
    console.error('[createUser] Error inesperado:', err)
    return { ok: false, error: 'Error inesperado. Revisa los logs del servidor.' }
  }
}
