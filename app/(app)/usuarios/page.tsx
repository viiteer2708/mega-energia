import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { ROLES_CAN_MANAGE_USERS } from '@/lib/types'
import { getUsers, getAssignableUsers } from './actions'
import { UserManagement } from '@/components/usuarios/UserManagement'

export default async function UsuariosPage() {
  const user = await getSession()

  if (!user) redirect('/login')
  if (!ROLES_CAN_MANAGE_USERS.includes(user.role)) redirect('/dashboard')

  const [users, assignableUsers] = await Promise.all([
    getUsers(),
    getAssignableUsers(),
  ])

  const isAdmin = user.role === 'ADMIN'

  return (
    <UserManagement
      currentUser={user}
      users={users}
      assignableUsers={assignableUsers}
      isAdmin={isAdmin}
    />
  )
}
