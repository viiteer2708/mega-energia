'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { CREATABLE_ROLES } from '@/lib/types'
import type { Role, UserListItem } from '@/lib/types'

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

export async function createUser(formData: FormData) {
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
    redirect('/usuarios?error=campos_requeridos')
  }

  if (!allowedRoles.includes(role)) {
    redirect('/usuarios?error=rol_no_permitido')
  }

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (createError || !newUser.user) {
    redirect('/usuarios?error=creacion_fallida')
  }

  await adminClient
    .from('profiles')
    .update({
      full_name: fullName,
      role,
      parent_id: currentAuthUser.id,
    })
    .eq('id', newUser.user.id)

  redirect('/usuarios?ok=1')
}
