'use client'

import { useState } from 'react'
import { Coins, FileSpreadsheet, Calculator } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CommissionLines } from '@/components/comisionado/CommissionLines'
import { ExcelUpload } from '@/components/comisionado/ExcelUpload'
import { FormulaConfig } from '@/components/comisionado/FormulaConfig'
import type {
  UserProfile, CommissionLineListResult,
  CommissionFormulaConfig, CommissionUpload,
  Campaign, Product,
} from '@/lib/types'

type Tab = 'lineas' | 'excel' | 'formulas'

interface CommissionDashboardProps {
  currentUser: UserProfile
  initialLines: CommissionLineListResult
  configs: CommissionFormulaConfig[]
  uploads: CommissionUpload[]
  campaigns: Campaign[]
  products: Product[]
  isAdmin: boolean
}

export function CommissionDashboard({
  currentUser,
  initialLines,
  configs,
  uploads,
  campaigns,
  products,
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
            Gestión de comisiones y pagos a la red comercial
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
              onClick={() => setTab('excel')}
              className={cn(
                'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
                tab === 'excel'
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Subir Excel
            </button>
            <button
              onClick={() => setTab('formulas')}
              className={cn(
                'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
                tab === 'formulas'
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Calculator className="h-4 w-4" />
              Fórmulas
            </button>
          </>
        )}
      </div>

      {/* Content */}
      {tab === 'lineas' ? (
        <CommissionLines initialData={initialLines} isAdmin={isAdmin} />
      ) : tab === 'excel' ? (
        <ExcelUpload uploads={uploads} />
      ) : (
        <FormulaConfig
          configs={configs}
          campaigns={campaigns}
          products={products}
        />
      )}
    </div>
  )
}
