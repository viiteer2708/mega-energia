import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { ROLES_CAN_VIEW_COMMISSIONS } from '@/lib/types'
import {
  getCommissionLines,
  getEnergyCompanies,
  getEnergyProducts,
  getCommissionTiers,
} from './actions'
import { CommissionDashboard } from '@/components/comisionado/CommissionDashboard'

export default async function ComisionadoPage() {
  const user = await getSession()

  if (!user) redirect('/login')
  if (!ROLES_CAN_VIEW_COMMISSIONS.includes(user.role)) redirect('/dashboard')

  const isAdmin = user.role === 'ADMIN'

  const [
    linesResult,
    energyCompanies,
    energyProducts,
    commissionTiers,
  ] = await Promise.all([
    getCommissionLines(),
    isAdmin ? getEnergyCompanies() : Promise.resolve([]),
    isAdmin ? getEnergyProducts() : Promise.resolve([]),
    isAdmin ? getCommissionTiers() : Promise.resolve([]),
  ])

  return (
    <CommissionDashboard
      currentUser={user}
      initialLines={linesResult}
      energyCompanies={energyCompanies}
      energyProducts={energyProducts}
      commissionTiers={commissionTiers}
      isAdmin={isAdmin}
    />
  )
}
