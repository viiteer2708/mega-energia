import type { ContractEstado, Role } from '@/lib/types'

// Campos del Bloque B (suministro)
const FIELDS_B = [
  'cups', 'tarifa', 'potencia_1', 'potencia_2', 'potencia_3',
  'potencia_4', 'potencia_5', 'potencia_6', 'consumo_anual',
  'direccion', 'codigo_postal', 'poblacion', 'provincia', 'datos_manuales',
]

// Campos del Bloque C (titular)
const FIELDS_C = [
  'titular_contrato', 'cif', 'nombre_firmante', 'dni_firmante',
  'telefono_1', 'telefono_2', 'email_titular', 'cuenta_bancaria', 'fecha_firma',
]

// Campos del Bloque A parcial (editables por creador)
const FIELDS_A_CREATOR = ['product_id', 'observaciones']

// Campos de gestión (solo BO/ADMIN)
const FIELDS_GESTION = [
  'operador_id', 'su_ref', 'campaign_id', 'fecha_entrega_contrato',
  'fecha_cobro_distribuidor', 'activo', 'fecha_baja',
]

// Campos de comisiones (solo ADMIN)
const FIELDS_COMISION = ['commission_gnew', 'decomission_gnew']

/**
 * Devuelve los campos que el usuario puede editar según el estado, rol y si es creador.
 *
 * BORRADOR: creador edita B, C y Documentación completos.
 * PENDIENTE VALIDACIÓN: solo lectura para creador. Solo BO/ADMIN.
 * DEVUELTO: creador solo edita campos marcados en campos_a_corregir + subir docs.
 *           BO/ADMIN editan todo.
 * Otros estados operativos: solo BO/ADMIN campos de gestión. ADMIN comisiones.
 */
export function getEditableFields(
  state: ContractEstado,
  role: Role,
  isCreator: boolean
): string[] {
  const isAdminOrBo = role === 'ADMIN' || role === 'BACKOFFICE'

  switch (state) {
    case 'borrador': {
      const fields: string[] = []
      if (isCreator || isAdminOrBo) {
        fields.push(...FIELDS_A_CREATOR, ...FIELDS_B, ...FIELDS_C)
      }
      if (isAdminOrBo) {
        fields.push(...FIELDS_GESTION)
      }
      if (role === 'ADMIN') {
        fields.push(...FIELDS_COMISION)
      }
      return fields
    }

    case 'pendiente_validacion': {
      // Solo lectura para creador. Solo BO/ADMIN pueden editar.
      if (!isAdminOrBo) return []
      const fields = [...FIELDS_A_CREATOR, ...FIELDS_B, ...FIELDS_C, ...FIELDS_GESTION]
      if (role === 'ADMIN') fields.push(...FIELDS_COMISION)
      return fields
    }

    case 'devuelto': {
      // BO/ADMIN pueden editar todo
      if (isAdminOrBo) {
        const fields = [...FIELDS_A_CREATOR, ...FIELDS_B, ...FIELDS_C, ...FIELDS_GESTION]
        if (role === 'ADMIN') fields.push(...FIELDS_COMISION)
        return fields
      }
      // Creador: solo campos marcados como "a corregir" (se filtran externamente
      // usando campos_devueltos del state_log). Aquí devolvemos todo B+C como pool,
      // y el componente filtra con el array real de campos_a_corregir.
      if (isCreator) {
        return [...FIELDS_B, ...FIELDS_C]
      }
      return []
    }

    case 'tramitado':
    case 'pendiente_aceptacion':
    case 'futura_activacion':
    case 'pendiente_instalacion':
    case 'no_tramitado': {
      if (!isAdminOrBo) return []
      const fields = [...FIELDS_GESTION]
      if (role === 'ADMIN') fields.push(...FIELDS_COMISION)
      return fields
    }

    case 'ok':
    case 'incidencia':
    case 'pendiente_renovar':
    case 'aviso_baja': {
      if (!isAdminOrBo) return []
      const fields = ['fecha_cobro_distribuidor']
      if (role === 'ADMIN') fields.push(...FIELDS_COMISION)
      return fields
    }

    case 'ko':
    case 'baja': {
      // Estados finales: solo ADMIN comisiones
      if (role === 'ADMIN') return [...FIELDS_COMISION]
      return []
    }

    default:
      return []
  }
}

// Campos sensibles que tienen visibilidad restringida
const SENSITIVE_FIELDS: Record<string, (role: Role, isCreator: boolean) => boolean> = {
  cuenta_bancaria: (role, isCreator) =>
    role === 'ADMIN' || role === 'BACKOFFICE' || isCreator,
  commission_gnew: (role) => role === 'ADMIN',
  decomission_gnew: (role) => role === 'ADMIN',
  beneficio: (role) => role === 'ADMIN',
  operador_id: (role) => role === 'ADMIN' || role === 'BACKOFFICE',
  su_ref: (role) => role === 'ADMIN' || role === 'BACKOFFICE',
  fecha_entrega_contrato: (role) => role === 'ADMIN' || role === 'BACKOFFICE',
  fecha_cobro_distribuidor: (role) => role === 'ADMIN' || role === 'BACKOFFICE',
}

/**
 * Indica si un campo es visible para el usuario según su rol y si es creador.
 */
export function isFieldVisible(
  field: string,
  role: Role,
  isCreator: boolean
): boolean {
  const check = SENSITIVE_FIELDS[field]
  if (check) return check(role, isCreator)
  return true
}

// Todos los campos del contrato (para calcular visible_fields)
const ALL_CONTRACT_FIELDS = [
  // Bloque A
  'owner_id', 'operador_id', 'campaign_id', 'product_id', 'su_ref', 'observaciones',
  'activo', 'estado', 'fecha_alta', 'fecha_baja',
  // Bloque B
  ...FIELDS_B,
  // Bloque C
  ...FIELDS_C,
  // Bloque D
  'fecha_entrega_contrato', 'fecha_cobro_distribuidor',
  // Bloque E.1
  'commission_gnew', 'decomission_gnew', 'beneficio',
  // Docs / devolución
  'doc_upload_mode', 'devolucion_motivo', 'campos_a_corregir',
  'draft_data', 'created_at', 'updated_at', 'deleted_at',
]

/**
 * Devuelve la lista de campos visibles para el usuario según su rol y si es creador.
 */
export function getVisibleFields(role: Role, isCreator: boolean): string[] {
  return ALL_CONTRACT_FIELDS.filter(f => isFieldVisible(f, role, isCreator))
}
