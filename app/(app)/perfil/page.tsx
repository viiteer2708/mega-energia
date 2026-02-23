import { redirect } from 'next/navigation'
import { ProfileForm } from './ProfileForm'
import { getSession } from '@/lib/session'

export default async function PerfilPage() {
  const user = await getSession()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona tu información personal
        </p>
      </div>

      <ProfileForm
        name={user.full_name}
        email={user.email}
        role={user.role}
      />
    </div>
  )
}
