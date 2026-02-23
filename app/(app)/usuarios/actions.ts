'use server'

import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { CREATABLE_ROLES } from '@/lib/types'
import type { Role, UserListItem } from '@/lib/types'

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
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false })

  return (data ?? []) as UserListItem[]
}

export async function createUser(
  _prev: CreateUserResult | null,
  formData: FormData
): Promise<CreateUserResult> {
  // Validar que el servicio está configurado
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

    const email = (formData.get('email') as string)?.trim()
    const password = (formData.get('password') as string)?.trim()
    const fullName = (formData.get('full_name') as string)?.trim()
    const role = formData.get('role') as Role

    if (!email || !password || !fullName || !role) {
      return { ok: false, error: 'Todos los campos son obligatorios.' }
    }

    if (!allowedRoles.includes(role)) {
      return { ok: false, error: 'No tienes permiso para asignar ese rol.' }
    }

    const admin = getAdminClient()

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

    await admin
      .from('profiles')
      .update({
        full_name: fullName,
        role,
        parent_id: currentAuthUser.id,
      })
      .eq('id', newUser.user.id)

    return { ok: true }
  } catch (err) {
    // Re-lanzar redirects de Next.js (son excepciones internamente)
    if (isRedirectError(err)) throw err
    console.error('[createUser] Error inesperado:', err)
    return { ok: false, error: 'Error inesperado. Revisa los logs del servidor.' }
  }
}
