import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { ROLES_CAN_VIEW_COMMISSIONS } from '@/lib/types'
import {
  getCommissionLines,
  getFormulaConfigs,
  getUploadHistory,
  getCampaigns,
  getProducts,
  getRateTables,
  getRateTableUploadHistory,
} from './actions'
import { CommissionDashboard } from '@/components/comisionado/CommissionDashboard'

export default async function ComisionadoPage() {
  const user = await getSession()

  if (!user) redirect('/login')
  if (!ROLES_CAN_VIEW_COMMISSIONS.includes(user.role)) redirect('/dashboard')

  const isAdmin = user.role === 'ADMIN'

  // Fetch paralelo — configs/uploads/campaigns/products/rateTables solo para ADMIN
  const [linesResult, configs, uploads, campaigns, products, rateTables, rateTableUploads] = await Promise.all([
    getCommissionLines(),
    isAdmin ? getFormulaConfigs() : Promise.resolve([]),
    isAdmin ? getUploadHistory() : Promise.resolve([]),
    isAdmin ? getCampaigns() : Promise.resolve([]),
    isAdmin ? getProducts() : Promise.resolve([]),
    isAdmin ? getRateTables() : Promise.resolve([]),
    isAdmin ? getRateTableUploadHistory() : Promise.resolve([]),
  ])

  return (
    <CommissionDashboard
      currentUser={user}
      initialLines={linesResult}
      configs={configs}
      uploads={uploads}
      campaigns={campaigns}
      products={products}
      rateTables={rateTables}
      rateTableUploads={rateTableUploads}
      isAdmin={isAdmin}
    />
  )
}
