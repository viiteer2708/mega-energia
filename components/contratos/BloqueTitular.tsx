'use client'

import { useState } from 'react'
import { User, ChevronDown, ChevronRight } from 'lucide-react'
import {
  isValidDNI, getDNIExpectedLetter, isValidCIF,
  isValidIBAN, isValidPhone, isValidEmail,
} from '@/lib/validations/validators'
import type { Role } from '@/lib/types'
import { isFieldVisible } from '@/lib/contract-permissions'

const inputClass =
  'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

interface BloqueTitularProps {
  disabled?: boolean
  role: Role
  isCreator: boolean
  defaultValues?: {
    titular_contrato?: string
    cif?: string
    nombre_firmante?: string
    dni_firmante?: string
    telefono_1?: string
    telefono_2?: string
    email_titular?: string
    cuenta_bancaria?: string
    fecha_firma?: string
  }
  editableFields?: string[]
}

export function BloqueTitular({ disabled, role, isCreator, defaultValues, editableFields }: BloqueTitularProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEditable = (field: string) => {
    if (disabled) return false
    if (editableFields) return editableFields.includes(field)
    return true
  }

  const validate = (field: string, value: string) => {
    const newErrors = { ...errors }
    delete newErrors[field]

    if (!value.trim()) {
      setErrors(newErrors)
      return
    }

    switch (field) {
      case 'dni_firmante': {
        if (!isValidDNI(value)) {
          const match = value.toUpperCase().match(/^(\d{8})/)
          if (match) {
            const expected = getDNIExpectedLetter(parseInt(match[1], 10))
            newErrors[field] = `La letra del DNI no corresponde. Debería ser ${expected}.`
          } else {
            newErrors[field] = 'Formato de DNI incorrecto. Ejemplo: 12345678Z'
          }
        }
        break
      }
      case 'cif': {
        if (!isValidCIF(value)) {
          newErrors[field] = 'El dígito de control del CIF no es correcto.'
        }
        break
      }
      case 'cuenta_bancaria': {
        if (!isValidIBAN(value)) {
          newErrors[field] = 'El IBAN no es válido. Verifica ES + 22 dígitos.'
        }
        break
      }
      case 'telefono_1':
      case 'telefono_2': {
        if (!isValidPhone(value)) {
          newErrors[field] = 'Introduce un número español de 9 dígitos.'
        }
        break
      }
      case 'email_titular': {
        if (!isValidEmail(value)) {
          newErrors[field] = 'Introduce un email válido.'
        }
        break
      }
    }

    setErrors(newErrors)
  }

  return (
    <FormSection title="Datos del Titular" icon={User}>
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Titular */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Titular del contrato *
          </label>
          <input
            type="text"
            name="titular_contrato"
            defaultValue={defaultValues?.titular_contrato ?? ''}
            disabled={!isEditable('titular_contrato')}
            placeholder="Nombre o razón social"
            className={inputClass}
          />
        </div>

        {/* CIF */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">CIF</label>
          <input
            type="text"
            name="cif"
            defaultValue={defaultValues?.cif ?? ''}
            disabled={!isEditable('cif')}
            placeholder="B12345678"
            className={inputClass}
            onBlur={(e) => validate('cif', e.target.value)}
          />
          {errors.cif && <p className="mt-1 text-xs text-red-400">{errors.cif}</p>}
        </div>

        {/* Nombre firmante */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Nombre del firmante *
          </label>
          <input
            type="text"
            name="nombre_firmante"
            defaultValue={defaultValues?.nombre_firmante ?? ''}
            disabled={!isEditable('nombre_firmante')}
            placeholder="Nombre y apellidos"
            className={inputClass}
          />
        </div>

        {/* DNI firmante */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            DNI del firmante *
          </label>
          <input
            type="text"
            name="dni_firmante"
            defaultValue={defaultValues?.dni_firmante ?? ''}
            disabled={!isEditable('dni_firmante')}
            placeholder="12345678Z"
            maxLength={9}
            className={inputClass}
            onBlur={(e) => validate('dni_firmante', e.target.value)}
          />
          {errors.dni_firmante && <p className="mt-1 text-xs text-red-400">{errors.dni_firmante}</p>}
        </div>

        {/* Teléfono 1 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Teléfono 1 *
          </label>
          <input
            type="tel"
            name="telefono_1"
            defaultValue={defaultValues?.telefono_1 ?? ''}
            disabled={!isEditable('telefono_1')}
            placeholder="612345678"
            maxLength={9}
            className={inputClass}
            onBlur={(e) => validate('telefono_1', e.target.value)}
          />
          {errors.telefono_1 && <p className="mt-1 text-xs text-red-400">{errors.telefono_1}</p>}
        </div>

        {/* Teléfono 2 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Teléfono 2
          </label>
          <input
            type="tel"
            name="telefono_2"
            defaultValue={defaultValues?.telefono_2 ?? ''}
            disabled={!isEditable('telefono_2')}
            placeholder="Opcional"
            maxLength={9}
            className={inputClass}
            onBlur={(e) => validate('telefono_2', e.target.value)}
          />
          {errors.telefono_2 && <p className="mt-1 text-xs text-red-400">{errors.telefono_2}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Email del titular *
          </label>
          <input
            type="email"
            name="email_titular"
            defaultValue={defaultValues?.email_titular ?? ''}
            disabled={!isEditable('email_titular')}
            placeholder="email@ejemplo.com"
            className={inputClass}
            onBlur={(e) => validate('email_titular', e.target.value)}
          />
          {errors.email_titular && <p className="mt-1 text-xs text-red-400">{errors.email_titular}</p>}
        </div>

        {/* Cuenta bancaria — solo visible para ADMIN, BO y creador */}
        {isFieldVisible('cuenta_bancaria', role, isCreator) && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Cuenta bancaria (IBAN)
            </label>
            <input
              type="text"
              name="cuenta_bancaria"
              defaultValue={defaultValues?.cuenta_bancaria ?? ''}
              disabled={!isEditable('cuenta_bancaria')}
              placeholder="ES12 1234 5678 9012 3456 7890"
              className={inputClass}
              onBlur={(e) => validate('cuenta_bancaria', e.target.value)}
            />
            {errors.cuenta_bancaria && <p className="mt-1 text-xs text-red-400">{errors.cuenta_bancaria}</p>}
          </div>
        )}

        {/* Fecha firma */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Fecha de firma
          </label>
          <input
            type="date"
            name="fecha_firma"
            defaultValue={defaultValues?.fecha_firma ?? ''}
            disabled={!isEditable('fecha_firma')}
            className={inputClass}
          />
        </div>
      </div>
    </FormSection>
  )
}

// ── FormSection local ────────────────────────────────────────────────────────
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
