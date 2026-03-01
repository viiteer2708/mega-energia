'use client'

import { useState } from 'react'
import { CompanySidebar } from './CompanySidebar'
import { EnergyCompanyDetail } from './EnergyCompanyDetail'
import { Building2 } from 'lucide-react'
import type { EnergyCompany, EnergyProduct } from '@/lib/types'

interface CompanyMasterDetailProps {
  companies: EnergyCompany[]
  products: EnergyProduct[]
}

export function CompanyMasterDetail({ companies, products }: CompanyMasterDetailProps) {
  const [selectedId, setSelectedId] = useState<number | null>(
    companies.length > 0 ? companies[0].id : null
  )

  const selectedCompany = companies.find(c => c.id === selectedId)
  const companyProducts = selectedCompany
    ? products.filter(p => p.company_id === selectedCompany.id)
    : []

  return (
    <div className="flex rounded-lg border border-border overflow-hidden bg-card min-h-[500px]">
      {/* Sidebar */}
      <div className="w-[250px] shrink-0">
        <CompanySidebar
          companies={companies}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto">
        {selectedCompany ? (
          <EnergyCompanyDetail
            company={selectedCompany}
            products={companyProducts}
            allCompanies={companies}
            allProducts={products}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Building2 className="h-12 w-12 opacity-20" />
            <p className="text-sm">Selecciona una comercializadora</p>
          </div>
        )}
      </div>
    </div>
  )
}
