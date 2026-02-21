import {
  FileText,
  Zap,
  Euro,
  TrendingUp,
  Award,
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

// Mock user — se reemplazará con datos reales de Supabase
const mockUser = {
  full_name: 'Carlos García',
  role: 'COMERCIAL' as const,
}

export default function DashboardPage() {
  const kpis = mockKPIs

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header con nombre 3D */}
      <DashboardHeader
        userName={mockUser.full_name.split(' ')[0]}
        subtitle={`Panel comercial · Febrero 2026`}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KPICard
          title="Contratos este mes"
          value={kpis.contratos_mes.toString()}
          variacion={kpis.contratos_variacion}
          icon={FileText}
          accentColor="orange"
          subtitle="contratos firmados"
        />
        <KPICard
          title="Potencia contratada"
          value={`${kpis.potencia_total.toLocaleString('es-ES')} kW`}
          icon={Zap}
          accentColor="blue"
          subtitle="potencia total"
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
          title="Tasa de conversión"
          value={`${kpis.tasa_conversion}%`}
          variacion={2.1}
          icon={TrendingUp}
          accentColor="purple"
          subtitle="de leads a contratos"
        />
        <KPICard
          title="Ranking en la red"
          value={`#${kpis.ranking}`}
          icon={Award}
          accentColor="orange"
          subtitle="de 18 comerciales"
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
          currentUserName={mockUser.full_name}
        />
        <ActivityFeed actividades={mockActividades} />
      </div>
    </div>
  )
}
