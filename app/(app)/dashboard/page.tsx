import { redirect } from 'next/navigation'
import {
  FileText,
  Zap,
  Euro,
  Flame,
  Wallet,
  Users,
} from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { KPICard } from '@/components/dashboard/KPICard'
import { VentasChart } from '@/components/dashboard/VentasChart'
import { ContratosChart } from '@/components/dashboard/ContratosChart'
import { RankingCard } from '@/components/dashboard/RankingCard'
import { RecentContracts } from '@/components/dashboard/RecentContracts'
import {
  mockKPIs,
  mockVentasMensuales,
  mockContratosPorTipo,
  mockRanking,
} from '@/lib/mock-data'
import { getRecentContracts } from '@/app/(app)/contratos/actions'
import { filterRankingByRole } from '@/lib/ranking-filter'
import { getSession } from '@/lib/session'

// Mapeo temporal UUID Supabase → mock ID hasta Fase 2 (contratos en Supabase)
const uuidToMockId: Record<string, string> = {
  '7265a7d9-638c-4137-850d-bdacb244927a': 'admin-01',
  '8c3ebc70-596a-4d76-95eb-8e09badff93e': 'dir-01',
  '7e8cd835-561b-4a39-9f18-1d8d3e79a847': 'kam-01',
  'da027fcc-5a61-4729-a1b9-03fd737f8cde': 'canal-01',
  '5a7b4253-3f08-4061-a94c-cadef4006fa8': 'com-01',
}

export default async function DashboardPage() {
  const user = await getSession()

  if (!user) {
    redirect('/login')
  }

  const mockUserId = uuidToMockId[user.id] ?? user.id
  const kpis = mockKPIs
  const filteredRanking = filterRankingByRole(mockRanking, mockUserId, user.role)
  const recentContracts = await getRecentContracts()
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().toLocaleDateString('es-ES', { month: 'long' })
  const currentMonthCap = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1)

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header con nombre HUD/wireframe */}
      <DashboardHeader userName={user.full_name} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title={`Contratos Ok ${currentMonthCap}`}
          value={kpis.contratos_mes.toString()}
          variacion={kpis.contratos_variacion}
          icon={FileText}
          accentColor="teal"
        />
        <KPICard
          title="Consumo luz"
          value={`${kpis.consumo_total_luz.toLocaleString('es-ES')} kWh`}
          icon={Zap}
          accentColor="blue"
          subtitle={`enero - diciembre ${currentYear}`}
        />
        <KPICard
          title="Consumo gas"
          value={`${kpis.consumo_total_gas.toLocaleString('es-ES')} kWh`}
          icon={Flame}
          accentColor="orange"
          subtitle={`enero - diciembre ${currentYear}`}
        />
        <KPICard
          title={`Facturación ${currentMonthCap}`}
          value={`${kpis.facturacion.toLocaleString('es-ES')} €`}
          variacion={12.3}
          icon={Euro}
          accentColor="green"
          subtitle="ingresos del mes"
        />
        <KPICard
          title="Wallet Propio"
          value={`${kpis.wallet.toLocaleString('es-ES')} €`}
          icon={Wallet}
          accentColor="purple"
          subtitle="enero - diciembre 2026"
        />
        <KPICard
          title="Wallet Family"
          value={`${kpis.wallet_family.toLocaleString('es-ES')} €`}
          icon={Users}
          accentColor="red"
          subtitle="enero - diciembre 2026"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <VentasChart data={mockVentasMensuales} />
        <ContratosChart data={mockContratosPorTipo} />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RankingCard
          data={filteredRanking}
          currentUserName={user.full_name}
        />
        <RecentContracts contracts={recentContracts} />
      </div>
    </div>
  )
}
