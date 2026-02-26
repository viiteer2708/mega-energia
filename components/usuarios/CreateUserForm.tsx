'use client'

import { useActionState, useEffect, useRef, useState, useMemo } from 'react'
import {
  ChevronDown, ChevronRight, KeyRound, Briefcase,
  Receipt, Settings2, Network, FileText, X, Search
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CREATABLE_ROLES } from '@/lib/types'
import type { Role, AssignableUser, CommissionType } from '@/lib/types'
import { createUser } from '@/app/(app)/usuarios/actions'
import type { CreateUserResult } from '@/app/(app)/usuarios/actions'

// ── Constantes ────────────────────────────────────────────────────────────────

const roleLabels: Record<Role, string> = {
  ADMIN: 'Administrador',
  BACKOFFICE: 'Backoffice',
  DIRECTOR: 'Director',
  KAM: 'KAM',
  CANAL: 'Canal',
  COMERCIAL: 'Comercial',
}

const commissionLabels: Record<CommissionType, string> = {
  partner: 'Partner',
  master: 'Master',
  distribuidor: 'Distribuidor',
  otro: 'Otro',
}

const inputClass =
  'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

const selectClass = inputClass

// ── FormSection — sección colapsable ─────────────────────────────────────────

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

// ── ParentSelect — dropdown buscable de superiores ───────────────────────────

function ParentSelect({
  users,
  value,
  onChange,
}: {
  users: AssignableUser[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const buildChain = (userId: string): string => {
    const parts: string[] = []
    let current = users.find(u => u.id === userId)
    while (current) {
      parts.push(`${current.full_name} (${current.role})`)
      current = current.parent_id ? users.find(u => u.id === current!.parent_id) : undefined
    }
    return parts.join(' → ')
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter(u =>
      u.full_name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
    )
  }, [users, search])

  const selectedUser = users.find(u => u.id === value)
  const displayText = selectedUser
    ? `${selectedUser.full_name} (${selectedUser.role})`
    : 'Seleccionar superior'

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name="parent_id" value={value} />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(inputClass, 'text-left truncate cursor-pointer')}
      >
        {displayText}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-80 overflow-auto rounded-md border border-border bg-popover shadow-lg">
          <div className="sticky top-0 bg-popover p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className={cn(inputClass, 'pl-7 h-8')}
                autoFocus
              />
            </div>
          </div>
          {filtered.map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() => { onChange(u.id); setOpen(false); setSearch('') }}
              className={cn(
                'w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors',
                u.id === value && 'bg-primary/10 text-primary'
              )}
            >
              <div className="font-medium">{u.full_name} ({u.role})</div>
              <div className="text-xs text-muted-foreground truncate">
                {buildChain(u.id)}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── SubordinateSelect — multi-select buscable con badges ─────────────────────

function SubordinateSelect({
  users,
  selectedIds,
  onChange,
}: {
  users: AssignableUser[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users
      .filter(u => !selectedIds.includes(u.id))
      .filter(u => u.full_name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q))
  }, [users, selectedIds, search])

  const selectedUsers = users.filter(u => selectedIds.includes(u.id))

  const remove = (id: string) => onChange(selectedIds.filter(x => x !== id))
  const add = (id: string) => onChange([...selectedIds, id])

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name="subordinate_ids" value={selectedIds.join(',')} />

      {/* Badges de seleccionados */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedUsers.map(u => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {u.full_name} ({u.role})
              <button
                type="button"
                onClick={() => remove(u.id)}
                className="hover:text-red-400 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(inputClass, 'text-left text-muted-foreground cursor-pointer')}
      >
        Buscar y añadir usuarios...
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-80 overflow-auto rounded-md border border-border bg-popover shadow-lg">
          <div className="sticky top-0 bg-popover p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className={cn(inputClass, 'pl-7 h-8')}
                autoFocus
              />
            </div>
          </div>
          {filtered.map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() => { add(u.id); setSearch('') }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
            >
              {u.full_name} ({u.role})
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── CreateUserForm ───────────────────────────────────────────────────────────

interface CreateUserFormProps {
  currentRole: Role
  currentUserId: string
  assignableUsers: AssignableUser[]
  onCancel: () => void
}

export function CreateUserForm({
  currentRole,
  currentUserId,
  assignableUsers,
  onCancel,
}: CreateUserFormProps) {
  const allowedRoles = CREATABLE_ROLES[currentRole]
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, isPending] = useActionState<CreateUserResult | null, FormData>(
    createUser,
    null
  )

  // Estado local para campos que necesitan interactividad
  const [alias, setAlias] = useState('')
  const [parentId, setParentId] = useState(currentUserId)
  const [subordinateIds, setSubordinateIds] = useState<string[]>([])

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset()
      setAlias('')
      setParentId(currentUserId)
      setSubordinateIds([])
    }
  }, [state, currentUserId])

  const currentYear = new Date().getFullYear()
  const invoicePreview = alias
    ? `GNEW-${alias.toUpperCase()}-${currentYear}-001`
    : 'GNEW-???-' + currentYear + '-001'

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-xl border border-primary/20 bg-card p-4 space-y-3"
    >
      <h3 className="text-sm font-semibold text-foreground">Crear nuevo usuario</h3>

      {state?.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {state.error}
        </div>
      )}

      {state?.ok && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
          Usuario creado correctamente.
        </div>
      )}

      {/* Sección 1: Datos de acceso web */}
      <FormSection title="Datos de acceso web" icon={KeyRound}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="usuario@empresa.es"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password <span className="text-red-400">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Min. 6 caracteres"
              className={inputClass}
            />
          </div>
        </div>
      </FormSection>

      {/* Sección 2: Datos comerciales */}
      <FormSection title="Datos comerciales" icon={Briefcase}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="full_name" className="text-sm font-medium text-foreground">
              Nombre completo <span className="text-red-400">*</span>
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              placeholder="Nombre y apellidos"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="alias" className="text-sm font-medium text-foreground">
              Alias <span className="text-red-400">*</span>
            </label>
            <input
              id="alias"
              name="alias"
              type="text"
              required
              placeholder="Prefijo para factura"
              value={alias}
              onChange={e => setAlias(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="commercial_nif" className="text-sm font-medium text-foreground">
              NIF / CIF
            </label>
            <input
              id="commercial_nif"
              name="commercial_nif"
              type="text"
              placeholder="12345678A"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="commercial_address" className="text-sm font-medium text-foreground">
              Dirección
            </label>
            <input
              id="commercial_address"
              name="commercial_address"
              type="text"
              placeholder="Calle, número..."
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="commercial_postal_code" className="text-sm font-medium text-foreground">
              Código Postal
            </label>
            <input
              id="commercial_postal_code"
              name="commercial_postal_code"
              type="text"
              placeholder="28001"
              className={inputClass}
            />
          </div>
        </div>
      </FormSection>

      {/* Sección 3: Datos de facturación (colapsada) */}
      <FormSection title="Datos de facturación" icon={Receipt} defaultOpen={false}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="billing_name" className="text-sm font-medium text-foreground">
              Nombre / Razón social
            </label>
            <input
              id="billing_name"
              name="billing_name"
              type="text"
              placeholder="Razón social"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="billing_nif" className="text-sm font-medium text-foreground">
              NIF / CIF
            </label>
            <input
              id="billing_nif"
              name="billing_nif"
              type="text"
              placeholder="B12345678"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="billing_address" className="text-sm font-medium text-foreground">
              Dirección
            </label>
            <input
              id="billing_address"
              name="billing_address"
              type="text"
              placeholder="Dirección de facturación"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="billing_postal_code" className="text-sm font-medium text-foreground">
              Código Postal
            </label>
            <input
              id="billing_postal_code"
              name="billing_postal_code"
              type="text"
              placeholder="28001"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="billing_city" className="text-sm font-medium text-foreground">
              Población
            </label>
            <input
              id="billing_city"
              name="billing_city"
              type="text"
              placeholder="Madrid"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="billing_iban" className="text-sm font-medium text-foreground">
              Cuenta bancaria IBAN
            </label>
            <input
              id="billing_iban"
              name="billing_iban"
              type="text"
              placeholder="ES00 0000 0000 00 0000000000"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="billing_retention_pct" className="text-sm font-medium text-foreground">
              % Retención
            </label>
            <input
              id="billing_retention_pct"
              name="billing_retention_pct"
              type="number"
              step="0.01"
              defaultValue={0}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="billing_vat_pct" className="text-sm font-medium text-foreground">
              IVA (%)
            </label>
            <input
              id="billing_vat_pct"
              name="billing_vat_pct"
              type="number"
              step="0.01"
              defaultValue={21}
              className={inputClass}
            />
          </div>
        </div>
      </FormSection>

      {/* Sección 4: Configuración comercial */}
      <FormSection title="Configuración comercial" icon={Settings2}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="role" className="text-sm font-medium text-foreground">
              Rol <span className="text-red-400">*</span>
            </label>
            <select id="role" name="role" required className={selectClass}>
              <option value="">Seleccionar rol</option>
              {allowedRoles.map(r => (
                <option key={r} value={r}>{roleLabels[r]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="commission_type" className="text-sm font-medium text-foreground">
              Comisionado
            </label>
            <select id="commission_type" name="commission_type" defaultValue="otro" className={selectClass}>
              {(Object.entries(commissionLabels) as [CommissionType, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="wallet_personal" className="text-sm font-medium text-foreground">
              Wallet Personal (€/MWh)
            </label>
            <input
              id="wallet_personal"
              name="wallet_personal"
              type="number"
              step="0.0001"
              defaultValue={0.5}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="wallet_family" className="text-sm font-medium text-foreground">
              Wallet Family (€/MWh)
            </label>
            <input
              id="wallet_family"
              name="wallet_family"
              type="number"
              step="0.0001"
              defaultValue={0.5}
              className={inputClass}
            />
          </div>
          {(currentRole === 'CANAL' || currentRole === 'COMERCIAL') && (
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="commission_pct" className="text-sm font-medium text-foreground">
                % Comisión del subordinado
              </label>
              <input
                id="commission_pct"
                name="commission_pct"
                type="number"
                min={0}
                max={100}
                step={1}
                placeholder="0 - 100"
                className={inputClass}
              />
              <p className="text-xs text-muted-foreground">
                Porcentaje de tu comisión que recibirá este usuario (0-100%)
              </p>
            </div>
          )}
        </div>
      </FormSection>

      {/* Sección 5: Estructura jerárquica */}
      <FormSection title="Estructura jerárquica" icon={Network}>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Superior directo
            </label>
            <ParentSelect
              users={assignableUsers}
              value={parentId}
              onChange={setParentId}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Mis amigos / Estructura asignada
            </label>
            <SubordinateSelect
              users={assignableUsers}
              selectedIds={subordinateIds}
              onChange={setSubordinateIds}
            />
          </div>
        </div>
      </FormSection>

      {/* Sección 6: Contador de factura (solo lectura) */}
      <FormSection title="Contador de factura" icon={FileText} defaultOpen={false}>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Preview:</span>
            <code className="rounded-md border border-border bg-muted/50 px-2 py-1 text-sm font-mono text-foreground">
              {invoicePreview}
            </code>
          </div>
          <p className="text-xs text-muted-foreground">
            El contador se generará automáticamente al crear el usuario. El número se incrementa con cada factura emitida.
          </p>
        </div>
      </FormSection>

      {/* Botones */}
      <div className="flex gap-2 justify-end pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Creando...' : 'Crear usuario'}
        </button>
      </div>
    </form>
  )
}
