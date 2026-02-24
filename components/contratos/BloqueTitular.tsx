'use client'

import { useState, forwardRef, useImperativeHandle } from 'react'
import {
  isValidDNI, getDNIExpectedLetter, isValidCIF,
  isValidIBAN, isValidPhone, isValidEmail,
} from '@/lib/validations/validators'
import type { Role } from '@/lib/types'
import { isFieldVisible } from '@/lib/contract-permissions'

const inputClass =
  'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export interface TitularData {
  titular_contrato: string
  es_empresa: boolean
  cif: string
  nombre_firmante: string
  dni_firmante: string
  telefono_1: string
  telefono_2: string
  email_titular: string
  cuenta_bancaria: string
  fecha_firma: string
}

export interface BloqueTitularRef {
  validate: () => boolean
  getData: () => TitularData
}

interface BloqueTitularProps {
  disabled?: boolean
  role: Role
  isCreator: boolean
  data: TitularData
  onChange: (data: TitularData) => void
  editableFields?: string[]
}

export const BloqueTitular = forwardRef<BloqueTitularRef, BloqueTitularProps>(
  function BloqueTitular({ disabled, role, isCreator, data, onChange, editableFields }, ref) {
    const [errors, setErrors] = useState<Record<string, string>>({})

    const isEditable = (field: string) => {
      if (disabled) return false
      if (editableFields) return editableFields.includes(field)
      return true
    }

    const update = (field: keyof TitularData, value: string | boolean) => {
      onChange({ ...data, [field]: value })
    }

    const validateField = (field: string, value: string) => {
      const newErrors = { ...errors }
      delete newErrors[field]
      if (!value.trim()) { setErrors(newErrors); return }

      switch (field) {
        case 'dni_firmante': {
          if (!isValidDNI(value)) {
            const match = value.toUpperCase().match(/^(\d{8})/)
            newErrors[field] = match
              ? `La letra del DNI no corresponde. Debería ser ${getDNIExpectedLetter(parseInt(match[1], 10))}.`
              : 'Formato de DNI incorrecto. Ejemplo: 12345678Z'
          }
          break
        }
        case 'cif':
          if (!isValidCIF(value)) newErrors[field] = 'El dígito de control del CIF no es correcto.'
          break
        case 'cuenta_bancaria':
          if (!isValidIBAN(value)) newErrors[field] = 'El IBAN no es válido. Verifica ES + 22 dígitos.'
          break
        case 'telefono_1':
        case 'telefono_2':
          if (!isValidPhone(value)) newErrors[field] = 'Introduce un número español de 9 dígitos.'
          break
        case 'email_titular':
          if (!isValidEmail(value)) newErrors[field] = 'Introduce un email válido.'
          break
      }
      setErrors(newErrors)
    }

    useImperativeHandle(ref, () => ({
      validate: () => {
        const errs: Record<string, string> = {}
        if (!data.titular_contrato.trim()) errs.titular_contrato = 'Obligatorio'
        if (!data.nombre_firmante.trim()) errs.nombre_firmante = 'Obligatorio'
        if (!data.dni_firmante.trim()) errs.dni_firmante = 'Obligatorio'
        else if (!isValidDNI(data.dni_firmante)) errs.dni_firmante = 'DNI no válido'
        if (!data.telefono_1.trim()) errs.telefono_1 = 'Obligatorio'
        else if (!isValidPhone(data.telefono_1)) errs.telefono_1 = 'Teléfono no válido'
        if (!data.email_titular.trim()) errs.email_titular = 'Obligatorio'
        else if (!isValidEmail(data.email_titular)) errs.email_titular = 'Email no válido'
        if (data.es_empresa && data.cif.trim() && !isValidCIF(data.cif)) errs.cif = 'CIF no válido'
        if (data.cuenta_bancaria.trim() && !isValidIBAN(data.cuenta_bancaria)) errs.cuenta_bancaria = 'IBAN no válido'
        setErrors(errs)
        return Object.keys(errs).length === 0
      },
      getData: () => data,
    }))

    const fieldWithError = (field: string) =>
      errors[field] ? `${inputClass} border-red-500 animate-[shake_0.2s_ease-in-out]` : inputClass

    return (
      <div className="space-y-4">
        {/* Titular */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Titular del contrato *</label>
          <input type="text" value={data.titular_contrato} onChange={(e) => update('titular_contrato', e.target.value)}
            disabled={!isEditable('titular_contrato')} placeholder="Nombre o razón social" className={fieldWithError('titular_contrato')} />
          {errors.titular_contrato && <p className="mt-1 text-xs text-red-400">{errors.titular_contrato}</p>}
        </div>

        {/* Toggle empresa */}
        <label className="flex items-center gap-2 cursor-pointer">
          <div className={`relative h-5 w-9 rounded-full transition-colors ${data.es_empresa ? 'bg-primary' : 'bg-border'}`}
            onClick={() => update('es_empresa', !data.es_empresa)}>
            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${data.es_empresa ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-foreground">Es empresa</span>
        </label>

        {/* CIF — solo si es empresa */}
        {data.es_empresa && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">CIF</label>
            <input type="text" value={data.cif} onChange={(e) => update('cif', e.target.value.toUpperCase())}
              disabled={!isEditable('cif')} placeholder="B12345678" className={fieldWithError('cif')}
              onBlur={(e) => validateField('cif', e.target.value)} />
            {errors.cif && <p className="mt-1 text-xs text-red-400">{errors.cif}</p>}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre del firmante *</label>
            <input type="text" value={data.nombre_firmante} onChange={(e) => update('nombre_firmante', e.target.value)}
              disabled={!isEditable('nombre_firmante')} placeholder="Nombre y apellidos" className={fieldWithError('nombre_firmante')} />
            {errors.nombre_firmante && <p className="mt-1 text-xs text-red-400">{errors.nombre_firmante}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">DNI del firmante *</label>
            <input type="text" value={data.dni_firmante} onChange={(e) => update('dni_firmante', e.target.value.toUpperCase())}
              disabled={!isEditable('dni_firmante')} placeholder="12345678Z" maxLength={9}
              className={fieldWithError('dni_firmante')} onBlur={(e) => validateField('dni_firmante', e.target.value)} />
            {errors.dni_firmante && <p className="mt-1 text-xs text-red-400">{errors.dni_firmante}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Teléfono 1 *</label>
            <input type="tel" inputMode="numeric" value={data.telefono_1} onChange={(e) => update('telefono_1', e.target.value)}
              disabled={!isEditable('telefono_1')} placeholder="612345678" maxLength={9}
              className={fieldWithError('telefono_1')} onBlur={(e) => validateField('telefono_1', e.target.value)} />
            {errors.telefono_1 && <p className="mt-1 text-xs text-red-400">{errors.telefono_1}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Teléfono 2</label>
            <input type="tel" inputMode="numeric" value={data.telefono_2} onChange={(e) => update('telefono_2', e.target.value)}
              disabled={!isEditable('telefono_2')} placeholder="Opcional" maxLength={9}
              className={inputClass} onBlur={(e) => validateField('telefono_2', e.target.value)} />
            {errors.telefono_2 && <p className="mt-1 text-xs text-red-400">{errors.telefono_2}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email del titular *</label>
            <input type="email" value={data.email_titular} onChange={(e) => update('email_titular', e.target.value)}
              disabled={!isEditable('email_titular')} placeholder="email@ejemplo.com"
              className={fieldWithError('email_titular')} onBlur={(e) => validateField('email_titular', e.target.value)} />
            {errors.email_titular && <p className="mt-1 text-xs text-red-400">{errors.email_titular}</p>}
          </div>

          {isFieldVisible('cuenta_bancaria', role, isCreator) && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Cuenta bancaria (IBAN)</label>
              <input type="text" inputMode="numeric" value={data.cuenta_bancaria}
                onChange={(e) => update('cuenta_bancaria', e.target.value.toUpperCase())}
                disabled={!isEditable('cuenta_bancaria')} placeholder="ES12 1234 5678 9012 3456 7890"
                className={fieldWithError('cuenta_bancaria')} onBlur={(e) => validateField('cuenta_bancaria', e.target.value)} />
              {errors.cuenta_bancaria && <p className="mt-1 text-xs text-red-400">{errors.cuenta_bancaria}</p>}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Fecha de firma</label>
            <input type="date" value={data.fecha_firma} onChange={(e) => update('fecha_firma', e.target.value)}
              disabled={!isEditable('fecha_firma')} className={inputClass} />
          </div>
        </div>
      </div>
    )
  }
)
