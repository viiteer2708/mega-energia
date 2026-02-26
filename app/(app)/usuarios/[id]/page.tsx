import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getUserById } from '../actions'
import { UserDetail } from '@/components/usuarios/UserDetail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params
  const currentUser = await getSession()

  if (!currentUser) redirect('/login')

  const data = await getUserById(id)
  if (!data) notFound()

  const canEdit = currentUser.role === 'ADMIN' || currentUser.role === 'BACKOFFICE'
  const isAdmin = currentUser.role === 'ADMIN'

  return (
    <UserDetail
      profile={data.profile}
      parentChain={data.parentChain}
      subordinates={data.subordinates}
      canEdit={canEdit}
      isAdmin={isAdmin}
    />
  )
}
