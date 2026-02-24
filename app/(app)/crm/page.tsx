import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getContracts, getDevueltoCount } from '@/app/(app)/contratos/actions'
import { CRMPageClient } from './CRMPageClient'
import type { ContractEstado } from '@/lib/types'

interface Props {
  searchParams: Promise<{
    tab?: string
    search?: string
    estado?: string
    page?: string
  }>
}

export default async function CRMPage({ searchParams }: Props) {
  const user = await getSession()
  if (!user) redirect('/login')

  const params = await searchParams
  const defaultTab = params.tab === 'contratos' ? 'contratos' : 'clientes'

  const filters = {
    search: params.search,
    estado: params.estado as ContractEstado | undefined,
    page: params.page ? Number(params.page) : 1,
  }

  const [contractData, devueltoCount] = await Promise.all([
    getContracts(filters),
    getDevueltoCount(),
  ])

  return (
    <CRMPageClient
      user={user}
      defaultTab={defaultTab}
      contractData={contractData}
      devueltoCount={devueltoCount}
    />
  )
}
