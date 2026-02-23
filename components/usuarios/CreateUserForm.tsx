'use client'

import { useActionState, useEffect, useRef } from 'react'
import { CREATABLE_ROLES } from '@/lib/types'
import type { Role } from '@/lib/types'
import { createUser } from '@/app/(app)/usuarios/actions'
import type { CreateUserResult } from '@/app/(app)/usuarios/actions'

const roleLabels: Record<Role, string> = {
  ADMIN: 'Administrador',
  BACKOFFICE: 'Backoffice',
  DIRECTOR: 'Director',
  KAM: 'KAM',
  CANAL: 'Canal',
  COMERCIAL: 'Comercial',
}

const inputClass =
  'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

interface CreateUserFormProps {
  currentRole: Role
  onCancel: () => void
}

export function CreateUserForm({ currentRole, onCancel }: CreateUserFormProps) {
  const allowedRoles = CREATABLE_ROLES[currentRole]
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, isPending] = useActionState<CreateUserResult | null, FormData>(
    createUser,
    null
  )

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset()
    }
  }, [state])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-xl border border-primary/20 bg-card p-4 space-y-4"
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="full_name" className="text-sm font-medium text-foreground">
            Nombre completo
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
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
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
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Contrasena
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
        <div className="space-y-2">
          <label htmlFor="role" className="text-sm font-medium text-foreground">
            Rol
          </label>
          <select
            id="role"
            name="role"
            required
            className={inputClass}
          >
            <option value="">Seleccionar rol</option>
            {allowedRoles.map(r => (
              <option key={r} value={r}>
                {roleLabels[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
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
