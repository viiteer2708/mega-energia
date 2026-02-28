'use client'

import { useState, useActionState } from 'react'
import { Building2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EnergyCompanyDetail } from './EnergyCompanyDetail'
import { createEnergyCompany } from '@/app/(app)/comisionado/actions'
import type { EnergyCompany, EnergyProduct } from '@/lib/types'

const inputClass =
  'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

const labelClass = 'text-sm font-medium text-foreground'

interface Props {
  companies: EnergyCompany[]
  products: EnergyProduct[]
}

export function EnergyCompanyManager({ companies, products }: Props) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createState, createAction, isCreating] = useActionState(createEnergyCompany, null)

  const getCompanyProducts = (companyId: number) =>
    products.filter(p => p.company_id === companyId)

  const selectedCompany = companies.find(c => c.id === selectedCompanyId)

  // Si hay empresa seleccionada, mostrar detalle
  if (selectedCompany) {
    return (
      <EnergyCompanyDetail
        company={selectedCompany}
        products={getCompanyProducts(selectedCompany.id)}
        allCompanies={companies}
        allProducts={products}
        onBack={() => setSelectedCompanyId(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Comercializadoras de energía
        </h2>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4" />
          Nueva
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nueva comercializadora</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAction} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Nombre</label>
                  <input name="name" required className={inputClass} placeholder="MEGA, KLEEN..." />
                </div>
                <div>
                  <label className={labelClass}>Modelo de comisión</label>
                  <select name="commission_model" className={inputClass}>
                    <option value="table">Tabla</option>
                    <option value="formula">Fórmula</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Margen GNEW (%)</label>
                  <input name="gnew_margin_pct" type="number" step="0.0001" defaultValue="0" className={inputClass} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isCreating}>
                  {isCreating ? 'Creando...' : 'Crear'}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
                  Cancelar
                </Button>
              </div>
              {createState && !createState.ok && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  {createState.error}
                </div>
              )}
              {createState?.ok && (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Comercializadora creada.
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Companies list */}
      {companies.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay comercializadoras configuradas.</p>
      ) : (
        <div className="space-y-2">
          {companies.map(company => {
            const companyProducts = getCompanyProducts(company.id)

            return (
              <button
                key={company.id}
                onClick={() => setSelectedCompanyId(company.id)}
                className="w-full text-left rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:bg-accent/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-semibold text-foreground">{company.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {company.commission_model === 'table' ? 'Tabla' : 'Fórmula'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Margen: {(company.gnew_margin_pct * 100).toFixed(2)}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {companyProducts.length} producto{companyProducts.length !== 1 ? 's' : ''}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${company.active ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30'}`}
                    >
                      {company.active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
