import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { ROLES_CAN_MANAGE_USERS } from '@/lib/types'
import { getUsers } from './actions'
import { UserManagement } from '@/components/usuarios/UserManagement'

export default async function UsuariosPage() {
  const user = await getSession()

  if (!user) redirect('/login')
  if (!ROLES_CAN_MANAGE_USERS.includes(user.role)) redirect('/dashboard')

  const users = await getUsers()

  return (
    <UserManagement
      currentUser={user}
      users={users}
    />
  )
}
