import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getContracts, getDevueltoCount } from './actions'
import { ContratosList } from '@/components/contratos/ContratosList'
import type { ContractEstado } from '@/lib/types'

interface Props {
  searchParams: Promise<{
    search?: string
    estado?: string
    page?: string
  }>
}

export default async function ContratosPage({ searchParams }: Props) {
  const user = await getSession()
  if (!user) redirect('/login')

  const params = await searchParams

  const filters = {
    search: params.search,
    estado: params.estado as ContractEstado | undefined,
    page: params.page ? Number(params.page) : 1,
  }

  const [data, devueltoCount] = await Promise.all([
    getContracts(filters),
    getDevueltoCount(),
  ])

  return (
    <ContratosList
      data={data}
      user={user}
      devueltoCount={devueltoCount}
    />
  )
}
