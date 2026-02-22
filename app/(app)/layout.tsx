import { cookies } from 'next/headers'
import { AppShell } from '@/components/layout/AppShell'
import type { UserProfile } from '@/lib/types'
import type { Role } from '@/lib/types'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const raw = cookieStore.get('mega-session')?.value

  // Fallback — middleware ya redirige si no hay sesión
  const session = raw
    ? (JSON.parse(raw) as { email: string; name: string; role: string })
    : { email: 'comercial@megaenergia.es', name: 'Comercial', role: 'COMERCIAL' }

  const user: UserProfile = {
    id: Buffer.from(session.email).toString('base64url'),
    email: session.email,
    full_name: session.name,
    role: session.role as Role,
  }

  return <AppShell user={user}>{children}</AppShell>
}
