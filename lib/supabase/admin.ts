import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase con service_role para operaciones administrativas.
 * Solo usar en server-side (server actions, route handlers).
 */
export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
