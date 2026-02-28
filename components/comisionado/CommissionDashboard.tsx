'use client'

import { useState } from 'react'
import { Coins, Building2, Users2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CommissionLines } from '@/components/comisionado/CommissionLines'
import { EnergyCompanyManager } from '@/components/comisionado/EnergyCompanyManager'
import { CommissionTiersPanel } from '@/components/comisionado/CommissionTiersPanel'
import type {
  UserProfile, CommissionLineListResult,
  EnergyCompany, EnergyProduct, CommissionTier,
} from '@/lib/types'

type Tab = 'lineas' | 'comercializadoras' | 'comisionados'

interface CommissionDashboardProps {
  currentUser: UserProfile
  initialLines: CommissionLineListResult
  energyCompanies: EnergyCompany[]
  energyProducts: EnergyProduct[]
  commissionTiers: CommissionTier[]
  isAdmin: boolean
}

export function CommissionDashboard({
  currentUser,
  initialLines,
  energyCompanies,
  energyProducts,
  commissionTiers,
  isAdmin,
}: CommissionDashboardProps) {
  const [tab, setTab] = useState<Tab>('lineas')

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Coins className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Comisionado</h1>
          <p className="text-sm text-muted-foreground">
            Motor de comisiones — comercializadoras, fórmulas, tablas y pagos
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-card/50 p-1 w-fit">
        <button
          onClick={() => setTab('lineas')}
          className={cn(
            'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
            tab === 'lineas'
              ? 'bg-primary/15 text-primary border border-primary/20'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Coins className="h-4 w-4" />
          Líneas
        </button>
        {isAdmin && (
          <>
            <button
              onClick={() => setTab('comercializadoras')}
              className={cn(
                'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
                tab === 'comercializadoras'
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Building2 className="h-4 w-4" />
              Comercializadoras
            </button>
            <button
              onClick={() => setTab('comisionados')}
              className={cn(
                'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
                tab === 'comisionados'
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Users2 className="h-4 w-4" />
              Comisionados
            </button>
          </>
        )}
      </div>

      {/* Content */}
      {tab === 'lineas' ? (
        <CommissionLines initialData={initialLines} isAdmin={isAdmin} />
      ) : tab === 'comercializadoras' ? (
        <EnergyCompanyManager
          companies={energyCompanies}
          products={energyProducts}
        />
      ) : (
        <CommissionTiersPanel tiers={commissionTiers} />
      )}
    </div>
  )
}
