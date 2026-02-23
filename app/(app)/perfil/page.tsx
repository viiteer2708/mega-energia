import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ProfileForm } from './ProfileForm'

export default async function PerfilPage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('gne-session')?.value

  if (!raw) {
    redirect('/login')
  }

  const session = JSON.parse(raw) as { email: string; name: string; role: string }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona tu información personal
        </p>
      </div>

      <ProfileForm
        name={session.name}
        email={session.email}
        role={session.role}
      />
    </div>
  )
}
