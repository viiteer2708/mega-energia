import { createClient } from '@/lib/supabase/server'
import type { UserProfile, Role } from '@/lib/types'

/**
 * Obtiene la sesión del usuario actual validando el JWT
 * y consultando el perfil completo desde Supabase.
 */
export async function getSession(): Promise<UserProfile | null> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, parent_id, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    id: user.id,
    email: user.email ?? '',
    full_name: profile.full_name,
    role: profile.role as Role,
    parent_id: profile.parent_id,
    avatar_url: profile.avatar_url ?? undefined,
  }
}
