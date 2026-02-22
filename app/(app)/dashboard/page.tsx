import { cookies } from 'next/headers'
import {
  FileText,
  Zap,
  Euro,
  Flame,
  Wallet,
} from 'lucide-react'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { KPICard } from '@/components/dashboard/KPICard'
import { VentasChart } from '@/components/dashboard/VentasChart'
import { ContratosChart } from '@/components/dashboard/ContratosChart'
import { RankingCard } from '@/components/dashboard/RankingCard'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import {
  mockKPIs,
  mockVentasMensuales,
  mockContratosPorTipo,
  mockActividades,
  mockRanking,
} from '@/lib/mock-data'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('mega-session')?.value
  const session = raw
    ? (JSON.parse(raw) as { email: string; name: string; role: string })
    : { email: '', name: 'Usuario', role: 'COMERCIAL' }

  const kpis = mockKPIs

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header con nombre HUD/wireframe */}
      <DashboardHeader userName={session.name} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KPICard
          title="Contratos este mes"
          value={kpis.contratos_mes.toString()}
          variacion={kpis.contratos_variacion}
          icon={FileText}
          accentColor="teal"
          subtitle="contratos firmados"
        />
        <KPICard
          title="Consumo total luz"
          value={`${kpis.consumo_total_luz.toLocaleString('es-ES')} kWh`}
          icon={Zap}
          accentColor="blue"
          subtitle="consumo acumulado"
        />
        <KPICard
          title="Consumo total gas"
          value={`${kpis.consumo_total_gas.toLocaleString('es-ES')} kWh`}
          icon={Flame}
          accentColor="orange"
          subtitle="consumo acumulado"
        />
        <KPICard
          title="Facturación generada"
          value={`${kpis.facturacion.toLocaleString('es-ES')} €`}
          variacion={12.3}
          icon={Euro}
          accentColor="green"
          subtitle="ingresos del mes"
        />
        <KPICard
          title="Wallet"
          value={`${kpis.wallet.toLocaleString('es-ES')} €`}
          icon={Wallet}
          accentColor="purple"
          subtitle="(luz + gas) × 0,5"
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
          data={mockRanking}
          currentUserName={session.name}
        />
        <ActivityFeed actividades={mockActividades} />
      </div>
    </div>
  )
}
