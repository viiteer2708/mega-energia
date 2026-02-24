'use client'

import { Briefcase } from 'lucide-react'
import type { Product, UserProfile } from '@/lib/types'

const inputClass =
  'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
const selectClass = inputClass

interface BloqueComercialProps {
  products: Product[]
  user: UserProfile
  disabled?: boolean
  defaultValues?: {
    product_id?: number | null
    observaciones?: string
  }
}

export function BloqueComercial({ products, user, disabled, defaultValues }: BloqueComercialProps) {
  return (
    <FormSection title="Datos Comerciales" icon={Briefcase}>
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Owner (read-only) */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Creador
          </label>
          <input
            type="text"
            value={user.full_name}
            readOnly
            className={`${inputClass} opacity-60`}
          />
          <input type="hidden" name="owner_id" value={user.id} />
        </div>

        {/* Producto */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Producto
          </label>
          <select
            name="product_id"
            defaultValue={defaultValues?.product_id ?? ''}
            disabled={disabled}
            className={selectClass}
          >
            <option value="">Seleccionar producto...</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Observaciones */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Observaciones
        </label>
        <textarea
          name="observaciones"
          defaultValue={defaultValues?.observaciones ?? ''}
          disabled={disabled}
          rows={3}
          placeholder="Notas adicionales sobre el contrato..."
          className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
      </div>
    </FormSection>
  )
}

// Sección colapsable reutilizable
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

function FormSection({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent/50 transition-colors"
      >
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <span className="flex-1 text-left">{title}</span>
        {open
          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
        }
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}
