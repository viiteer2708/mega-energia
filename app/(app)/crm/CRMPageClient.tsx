'use client'

import { useState } from 'react'
import { Users, Columns, FileText } from 'lucide-react'
import { CRMStatsCards } from '@/components/crm/CRMStatsCards'
import { ClienteList } from '@/components/crm/ClienteList'
import { PipelineKanban } from '@/components/crm/PipelineKanban'
import { ContratosList } from '@/components/contratos/ContratosList'
import { mockCRMStats, mockClientes, mockOportunidades } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import type { ContractListResult, UserProfile } from '@/lib/types'

type Tab = 'clientes' | 'pipeline' | 'contratos'

interface CRMPageClientProps {
  user: UserProfile
  defaultTab: Tab | string
  contractData: ContractListResult
  devueltoCount: number
}

export function CRMPageClient({ user, defaultTab, contractData, devueltoCount }: CRMPageClientProps) {
  const [tab, setTab] = useState<Tab>(
    defaultTab === 'contratos' ? 'contratos' : defaultTab === 'pipeline' ? 'pipeline' : 'clientes'
  )

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">CRM</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de clientes y pipeline comercial
          </p>
        </div>
      </div>

      {/* Stats */}
      <CRMStatsCards stats={mockCRMStats} />

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-card/50 p-1 w-fit">
        <button
          onClick={() => setTab('clientes')}
          className={cn(
            'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
            tab === 'clientes'
              ? 'bg-primary/15 text-primary border border-primary/20'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Users className="h-4 w-4" />
          Clientes
        </button>
        <button
          onClick={() => setTab('pipeline')}
          className={cn(
            'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
            tab === 'pipeline'
              ? 'bg-primary/15 text-primary border border-primary/20'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Columns className="h-4 w-4" />
          Pipeline
        </button>
        <button
          onClick={() => setTab('contratos')}
          className={cn(
            'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
            tab === 'contratos'
              ? 'bg-primary/15 text-primary border border-primary/20'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <FileText className="h-4 w-4" />
          Contratos
        </button>
      </div>

      {/* Content */}
      {tab === 'clientes' ? (
        <ClienteList clientes={mockClientes} />
      ) : tab === 'pipeline' ? (
        <PipelineKanban oportunidades={mockOportunidades} />
      ) : (
        <ContratosList data={contractData} user={user} devueltoCount={devueltoCount} />
      )}
    </div>
  )
}
