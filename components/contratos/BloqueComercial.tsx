'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Product, UserProfile } from '@/lib/types'

const selectClass =
  'flex h-8 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

interface BloqueComercialProps {
  products: Product[]
  user: UserProfile
  disabled?: boolean
  productId: number | null
  observaciones: string
  onProductChange: (id: number | null) => void
  onObservacionesChange: (v: string) => void
}

export function BloqueComercial({ products, user, disabled, productId, observaciones, onProductChange, onObservacionesChange }: BloqueComercialProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-card/50 mb-4">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2">
        <span className="text-xs text-muted-foreground">Comercial:</span>
        <span className="text-xs font-medium text-foreground">{user.full_name}</span>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Producto:</span>
          <select value={productId ?? ''} onChange={(e) => onProductChange(e.target.value ? Number(e.target.value) : null)}
            disabled={disabled} className={selectClass}>
            <option value="">Sin producto</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <button type="button" onClick={() => setExpanded(!expanded)}
          className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground sm:hidden">
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Más
        </button>
      </div>

      {/* Expanded on mobile */}
      <div className={cn('border-t border-border px-4 py-2 space-y-2',
        expanded ? 'block sm:hidden' : 'hidden')}>
        <div>
          <label className="text-xs text-muted-foreground">Producto</label>
          <select value={productId ?? ''} onChange={(e) => onProductChange(e.target.value ? Number(e.target.value) : null)}
            disabled={disabled} className={`${selectClass} w-full`}>
            <option value="">Sin producto</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Observaciones</label>
          <input type="text" value={observaciones} onChange={(e) => onObservacionesChange(e.target.value)}
            disabled={disabled} placeholder="Notas..." className={`${selectClass} w-full`} />
        </div>
      </div>
    </div>
  )
}
