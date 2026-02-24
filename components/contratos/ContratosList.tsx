'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Plus, ChevronLeft, ChevronRight,
  FileText, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  CONTRACT_STATE_CONFIG, CONTRACT_ESTADOS_ORDER, PRODUCT_TYPE_LABELS,
} from '@/lib/types'
import type {
  ContractEstado, ContractListResult, UserProfile,
} from '@/lib/types'

const inputClass =
  'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

const ESTADOS = CONTRACT_ESTADOS_ORDER

interface ContratosListProps {
  data: ContractListResult
  user: UserProfile
  devueltoCount: number
}

export function ContratosList({ data, user, devueltoCount }: ContratosListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [estadoFilter, setEstadoFilter] = useState<ContractEstado | ''>(
    (searchParams.get('estado') as ContractEstado) ?? ''
  )

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (estadoFilter) params.set('estado', estadoFilter)
      params.set('page', '1')
      router.push(`/crm?tab=contratos&${params.toString()}`)
    }, 400)
    return () => clearTimeout(timer)
  }, [search, estadoFilter, router])

  const navigatePage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    router.push(`/crm?tab=contratos&${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
          <p className="text-sm text-muted-foreground">
            {data.total} contrato{data.total !== 1 ? 's' : ''} encontrado{data.total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {devueltoCount > 0 && (
            <Badge
              variant="outline"
              className="bg-orange-500/20 text-orange-400 border-orange-500/30 cursor-pointer"
              onClick={() => setEstadoFilter('devuelto')}
            >
              <AlertCircle className="mr-1 h-3 w-3" />
              {devueltoCount} devuelto{devueltoCount !== 1 ? 's' : ''}
            </Badge>
          )}
          <Link href="/contratos/nuevo">
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo contrato
            </Button>
          </Link>
        </div>
      </div>

      {/* Búsqueda + filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por CUPS, titular o DNI..."
            className={`${inputClass} pl-9`}
          />
        </div>
      </div>

      {/* Chips de estado */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant="outline"
          className={cn(
            'cursor-pointer transition-colors',
            !estadoFilter ? 'bg-primary/20 text-primary border-primary/30' : 'hover:bg-accent'
          )}
          onClick={() => setEstadoFilter('')}
        >
          Todos
        </Badge>
        {ESTADOS.map(estado => {
          const config = CONTRACT_STATE_CONFIG[estado]
          const isActive = estadoFilter === estado
          return (
            <Badge
              key={estado}
              variant="outline"
              className={cn(
                'cursor-pointer transition-colors',
                isActive ? config.color : 'hover:bg-accent'
              )}
              onClick={() => setEstadoFilter(isActive ? '' : estado)}
            >
              {config.label}
            </Badge>
          )
        })}
      </div>

      {/* Tabla */}
      {data.contracts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No hay contratos que mostrar</p>
            <Link href="/contratos/nuevo" className="mt-3">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4" />
                Crear primer contrato
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">Titular</th>
                    <th className="px-4 py-3">CUPS</th>
                    <th className="px-4 py-3">Comercial</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Fecha alta</th>
                  </tr>
                </thead>
                <tbody>
                  {data.contracts.map(contract => {
                    const stateConfig = CONTRACT_STATE_CONFIG[contract.estado]
                    const cupsShort = contract.cups
                      ? `${contract.cups.slice(0, 10)}...${contract.cups.slice(-4)}`
                      : '—'

                    return (
                      <tr
                        key={contract.id}
                        className="border-b border-border/50 hover:bg-accent/30 cursor-pointer transition-colors"
                        onClick={() => router.push(`/contratos/${contract.id}`)}
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {contract.titular_contrato || '(sin titular)'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {cupsShort}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {contract.owner_name || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={stateConfig.color}>
                            {stateConfig.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {contract.product_type
                            ? PRODUCT_TYPE_LABELS[contract.product_type]
                            : '—'
                          }
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {contract.fecha_alta}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paginación */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {data.page} de {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.page <= 1}
              onClick={() => navigatePage(data.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.page >= data.totalPages}
              onClick={() => navigatePage(data.page + 1)}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
