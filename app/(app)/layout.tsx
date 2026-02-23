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
  const raw = cookieStore.get('gne-session')?.value

  // Fallback — middleware ya redirige si no hay sesión
  const session = raw
    ? (JSON.parse(raw) as { id: string; email: string; name: string; role: string })
    : { id: 'com-01', email: 'comercial@gruponewenergy.es', name: 'Comercial', role: 'COMERCIAL' }

  const user: UserProfile = {
    id: session.id,
    email: session.email,
    full_name: session.name,
    role: session.role as Role,
  }

  return <AppShell user={user}>{children}</AppShell>
}
