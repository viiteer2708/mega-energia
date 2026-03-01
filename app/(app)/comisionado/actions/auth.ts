import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/types'

export interface ActionResult {
  ok: boolean
  error?: string
}

export async function getAuthProfile() {
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

export function isAdminOrBackoffice(role: Role): boolean {
  return role === 'ADMIN' || role === 'BACKOFFICE'
}
