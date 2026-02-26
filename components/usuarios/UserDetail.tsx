'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Pencil, ChevronDown, ChevronRight,
  Briefcase, Receipt, Settings2, Network, Save, X, Coins,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { UserProfile, Role, CommissionType } from '@/lib/types'
import { updateUser } from '@/app/(app)/usuarios/actions'
import type { UpdateUserResult, HierarchyNode } from '@/app/(app)/usuarios/actions'

// ── Constantes ────────────────────────────────────────────────────────────────

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-500/20 text-red-400 border-red-500/30',
  BACKOFFICE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  DIRECTOR: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  KAM: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CANAL: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  COMERCIAL: 'bg-primary/20 text-primary border-primary/30',
}

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

// ── FormSection ───────────────────────────────────────────────────────────────

function DetailSection({
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

// ── Campo de solo lectura ─────────────────────────────────────────────────────

function ReadOnlyField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value || '—'}</p>
    </div>
  )
}

// ── Nodo de jerarquía ─────────────────────────────────────────────────────────

function HierarchyNodeCard({
  node,
  isCurrent,
}: {
  node: { id: string; full_name: string; role: string }
  isCurrent?: boolean
}) {
  const content = (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors',
        isCurrent
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card hover:bg-accent/50'
      )}
    >
      <span className={cn('text-sm font-medium', isCurrent ? 'text-primary' : 'text-foreground')}>
        {node.full_name}
      </span>
      <Badge
        variant="outline"
        className={cn('px-1.5 py-0 text-[10px] font-semibold', roleColors[node.role])}
      >
        {node.role}
      </Badge>
    </div>
  )

  if (isCurrent) return content

  return (
    <Link href={`/usuarios/${node.id}`} className="block">
      {content}
    </Link>
  )
}

function HierarchyConnector() {
  return (
    <div className="flex justify-center">
      <div className="h-5 w-px bg-border" />
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface UserDetailProps {
  profile: UserProfile
  parentChain: HierarchyNode[]
  subordinates: HierarchyNode[]
  canEdit: boolean
  isAdmin: boolean
}

// ── Componente principal ──────────────────────────────────────────────────────

export function UserDetail({ profile, parentChain, subordinates, canEdit, isAdmin }: UserDetailProps) {
  const [editing, setEditing] = useState(false)
  const [state, formAction, isPending] = useActionState<UpdateUserResult | null, FormData>(
    updateUser,
    null
  )

  const initials = profile.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // Cancelar edición cuando se guarda con éxito
  if (state?.ok && editing) {
    setEditing(false)
  }

  return (
    <div className="space-y-6">
      {/* Botón volver */}
      <Link
        href="/usuarios"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al equipo
      </Link>

      {/* Cabecera */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 border-2 border-border">
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{profile.full_name}</h1>
            <Badge
              variant="outline"
              className={cn('px-2 py-0.5 text-xs font-semibold', roleColors[profile.role])}
            >
              {roleLabels[profile.role]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
          {profile.alias && (
            <p className="text-xs text-muted-foreground">Alias: {profile.alias}</p>
          )}
        </div>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors shrink-0"
          >
            <Pencil className="h-4 w-4" />
            Editar
          </button>
        )}
      </div>

      {/* Mensajes de estado */}
      {state?.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {state.error}
        </div>
      )}
      {state?.ok && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
          Datos actualizados correctamente.
        </div>
      )}

      {/* Jerarquía */}
      <DetailSection title="Jerarquía" icon={Network}>
        <div className="flex flex-col items-center py-2">
          {parentChain.map((node, i) => (
            <div key={node.id} className="flex flex-col items-center">
              {i > 0 && <HierarchyConnector />}
              <HierarchyNodeCard node={node} />
            </div>
          ))}
          {parentChain.length > 0 && <HierarchyConnector />}
          <HierarchyNodeCard
            node={{ id: profile.id, full_name: profile.full_name, role: profile.role }}
            isCurrent
          />
          {subordinates.map(node => (
            <div key={node.id} className="flex flex-col items-center">
              <HierarchyConnector />
              <HierarchyNodeCard node={node} />
            </div>
          ))}
          {parentChain.length === 0 && subordinates.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">Sin estructura jerárquica asignada</p>
          )}
        </div>
      </DetailSection>

      {/* Contenido: lectura o edición */}
      {editing ? (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="user_id" value={profile.id} />

          {/* Datos comerciales */}
          <DetailSection title="Datos comerciales" icon={Briefcase}>
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
                  defaultValue={profile.full_name}
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
                  defaultValue={profile.alias ?? ''}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="commercial_nif" className="text-sm font-medium text-foreground">NIF / CIF</label>
                <input
                  id="commercial_nif"
                  name="commercial_nif"
                  type="text"
                  defaultValue={profile.commercial_nif ?? ''}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="commercial_address" className="text-sm font-medium text-foreground">Dirección</label>
                <input
                  id="commercial_address"
                  name="commercial_address"
                  type="text"
                  defaultValue={profile.commercial_address ?? ''}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="commercial_postal_code" className="text-sm font-medium text-foreground">Código Postal</label>
                <input
                  id="commercial_postal_code"
                  name="commercial_postal_code"
                  type="text"
                  defaultValue={profile.commercial_postal_code ?? ''}
                  className={inputClass}
                />
              </div>
            </div>
          </DetailSection>

          {/* Facturación */}
          <DetailSection title="Datos de facturación" icon={Receipt} defaultOpen={false}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="billing_name" className="text-sm font-medium text-foreground">Nombre / Razón social</label>
                <input id="billing_name" name="billing_name" type="text" defaultValue={profile.billing_name ?? ''} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="billing_nif" className="text-sm font-medium text-foreground">NIF / CIF</label>
                <input id="billing_nif" name="billing_nif" type="text" defaultValue={profile.billing_nif ?? ''} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="billing_address" className="text-sm font-medium text-foreground">Dirección</label>
                <input id="billing_address" name="billing_address" type="text" defaultValue={profile.billing_address ?? ''} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="billing_postal_code" className="text-sm font-medium text-foreground">Código Postal</label>
                <input id="billing_postal_code" name="billing_postal_code" type="text" defaultValue={profile.billing_postal_code ?? ''} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="billing_city" className="text-sm font-medium text-foreground">Población</label>
                <input id="billing_city" name="billing_city" type="text" defaultValue={profile.billing_city ?? ''} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="billing_iban" className="text-sm font-medium text-foreground">IBAN</label>
                <input id="billing_iban" name="billing_iban" type="text" defaultValue={profile.billing_iban ?? ''} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="billing_retention_pct" className="text-sm font-medium text-foreground">% Retención</label>
                <input id="billing_retention_pct" name="billing_retention_pct" type="number" step="0.01" defaultValue={profile.billing_retention_pct ?? 0} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="billing_vat_pct" className="text-sm font-medium text-foreground">IVA (%)</label>
                <input id="billing_vat_pct" name="billing_vat_pct" type="number" step="0.01" defaultValue={profile.billing_vat_pct ?? 21} className={inputClass} />
              </div>
            </div>
          </DetailSection>

          {/* Configuración comercial */}
          <DetailSection title="Configuración comercial" icon={Settings2}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Rol</label>
                <p className="flex h-9 items-center text-sm text-muted-foreground">{roleLabels[profile.role]}</p>
              </div>
            </div>
          </DetailSection>

          {/* Comisionado — solo ADMIN */}
          {isAdmin && (
            <DetailSection title="Comisionado" icon={Coins} defaultOpen={false}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="commission_type" className="text-sm font-medium text-foreground">Tipo de comisionado</label>
                  <select id="commission_type" name="commission_type" defaultValue={profile.commission_type ?? 'otro'} className={selectClass}>
                    {(Object.entries(commissionLabels) as [CommissionType, string][]).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="wallet_personal" className="text-sm font-medium text-foreground">Wallet Personal (€/MWh)</label>
                  <input id="wallet_personal" name="wallet_personal" type="number" step="0.0001" defaultValue={profile.wallet_personal ?? 0.5} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="wallet_family" className="text-sm font-medium text-foreground">Wallet Family (€/MWh)</label>
                  <input id="wallet_family" name="wallet_family" type="number" step="0.0001" defaultValue={profile.wallet_family ?? 0.5} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="commission_pct" className="text-sm font-medium text-foreground">% Comisión</label>
                  <input id="commission_pct" name="commission_pct" type="number" min={0} max={100} step={1} defaultValue={profile.commission_pct ?? ''} placeholder="0 - 100" className={inputClass} />
                </div>
              </div>
            </DetailSection>
          )}

          {/* Botones */}
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {/* Datos comerciales - lectura */}
          <DetailSection title="Datos comerciales" icon={Briefcase}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ReadOnlyField label="Nombre completo" value={profile.full_name} />
              <ReadOnlyField label="Alias" value={profile.alias} />
              <ReadOnlyField label="NIF / CIF" value={profile.commercial_nif} />
              <ReadOnlyField label="Dirección" value={profile.commercial_address} />
              <ReadOnlyField label="Código Postal" value={profile.commercial_postal_code} />
            </div>
          </DetailSection>

          {/* Facturación - lectura */}
          <DetailSection title="Datos de facturación" icon={Receipt} defaultOpen={false}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ReadOnlyField label="Nombre / Razón social" value={profile.billing_name} />
              <ReadOnlyField label="NIF / CIF" value={profile.billing_nif} />
              <ReadOnlyField label="Dirección" value={profile.billing_address} />
              <ReadOnlyField label="Código Postal" value={profile.billing_postal_code} />
              <ReadOnlyField label="Población" value={profile.billing_city} />
              <ReadOnlyField label="IBAN" value={profile.billing_iban} />
              <ReadOnlyField label="% Retención" value={profile.billing_retention_pct} />
              <ReadOnlyField label="IVA (%)" value={profile.billing_vat_pct} />
            </div>
          </DetailSection>

          {/* Configuración comercial - lectura */}
          <DetailSection title="Configuración comercial" icon={Settings2}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ReadOnlyField label="Rol" value={roleLabels[profile.role]} />
            </div>
          </DetailSection>

          {/* Comisionado - lectura — solo ADMIN */}
          {isAdmin && (
            <DetailSection title="Comisionado" icon={Coins} defaultOpen={false}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ReadOnlyField label="Tipo de comisionado" value={profile.commission_type ? commissionLabels[profile.commission_type] : undefined} />
                <ReadOnlyField label="Wallet Personal (€/MWh)" value={profile.wallet_personal} />
                <ReadOnlyField label="Wallet Family (€/MWh)" value={profile.wallet_family} />
                <ReadOnlyField label="% Comisión" value={profile.commission_pct} />
              </div>
            </DetailSection>
          )}
        </div>
      )}
    </div>
  )
}
