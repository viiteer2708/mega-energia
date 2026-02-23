export type Role = 'ADMIN' | 'BACKOFFICE' | 'DIRECTOR' | 'KAM' | 'CANAL' | 'COMERCIAL'
export type CommissionType = 'partner' | 'master' | 'distribuidor' | 'otro'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: Role
  parent_id?: string | null
  avatar_url?: string
  wolfcrm_id?: string
  // Datos comerciales
  alias?: string
  commercial_nif?: string
  commercial_address?: string
  commercial_postal_code?: string
  // Facturación
  billing_name?: string
  billing_nif?: string
  billing_address?: string
  billing_postal_code?: string
  billing_city?: string
  billing_iban?: string
  billing_retention_pct?: number
  billing_vat_pct?: number
  // Configuración comercial
  commission_type?: CommissionType
  wallet_personal?: number
  wallet_family?: number
}

export interface KPIData {
  contratos_mes: number
  contratos_variacion: number
  consumo_total_luz: number
  facturacion: number
  consumo_total_gas: number
  wallet: number
}

export interface ContratoMensual {
  mes: string
  contratos: number
  facturacion: number
}

export interface ContratoPorTipo {
  tipo: string
  actual: number
  anterior: number
}

export interface Actividad {
  id: string
  tipo: 'contrato' | 'visita' | 'llamada' | 'email'
  descripcion: string
  cliente: string
  fecha: string
  importe?: number
}

export interface ComercialRanking {
  id: string
  posicion: number
  nombre: string
  contratos: number
  facturacion: number
  parent_id?: string
  avatar_url?: string
}

// ── CUPS ─────────────────────────────────────────────────────────────────────

export type CUPSTipo = 'electricidad' | 'gas'
export type CUPSEstado = 'activo' | 'inactivo' | 'baja'
export type TipoContador = 'telegestionado' | 'analógico'
export type PeriodoTarifa = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6'

export interface ConsumoMensual {
  mes: string
  kwh: number
}

export interface PrecioPeriodo {
  periodo: PeriodoTarifa
  precio: number // €/kWh
}

export interface PotenciaPeriodo {
  periodo: PeriodoTarifa
  potencia: number // kW
}

export interface PuntoSuministro {
  cups: string
  tipo: CUPSTipo
  estado: CUPSEstado
  // Titular
  titular: string
  nif?: string
  // Dirección
  direccion: string
  municipio: string
  provincia: string
  cp: string
  // Contrato actual
  comercializadora: string
  tarifa: string
  contador: TipoContador
  potencias: PotenciaPeriodo[]
  // Consumo
  consumo_anual_kwh: number
  consumo_mensual: ConsumoMensual[]
  ultima_lectura: string
  // Análisis GNE
  ahorro_estimado_anual: number
  tarifa_gne_recomendada: string
  precios_gne: PrecioPeriodo[]
}

export interface CUPSBusquedaReciente {
  cups: string
  titular: string
  tipo: CUPSTipo
  fecha: string
}

// ── Comparador ────────────────────────────────────────────────────────────────────────────

export type TipoSuministroComp = 'electricidad' | 'gas' | 'dual'
export type PeriodoComp = '2.0TD' | '3.0TD' | 'RL.1' | 'RL.2' | 'RL.3'

export interface TarifaCompetidor {
  id: string
  comercializadora: string
  nombre_tarifa: string
  tipo: 'electricidad' | 'gas'
  precio_p1: number      // €/kWh P1
  precio_p2?: number     // €/kWh P2
  precio_p3?: number     // €/kWh P3
  potencia_anual: number // €/kW·año
  cuota_fija: number     // €/mes
  es_gne: boolean
  destacado?: boolean
}

export interface ComparadorInputData {
  tipo: TipoSuministroComp
  consumo_anual_kwh: number
  consumo_p1_pct: number   // % consumo en P1
  consumo_p2_pct: number   // % consumo en P2
  consumo_p3_pct: number   // % consumo en P3
  potencias: { periodo: string; potencia: number }[]
  tarifa_actual: string
  precio_actual_kwh: number // precio medio actual €/kWh
}

export interface ResultadoTarifa {
  tarifa: TarifaCompetidor
  coste_energia_anual: number
  coste_potencia_anual: number
  coste_fijo_anual: number
  coste_total_anual: number
  ahorro_vs_actual: number
}

// ── Materiales ────────────────────────────────────────────────────────────────

export type MaterialCategoria =
  | 'tarifas'
  | 'contratos'
  | 'presentaciones'
  | 'formularios'
  | 'marketing'
  | 'normativa'

export type MaterialFormato = 'PDF' | 'DOCX' | 'PPTX' | 'XLSX' | 'IMG'

export interface Material {
  id: string
  titulo: string
  descripcion: string
  categoria: MaterialCategoria
  formato: MaterialFormato
  tamaño: string        // "2.4 MB"
  fecha_actualizacion: string
  descargas: number
  destacado?: boolean
  nuevo?: boolean
}


// ── CRM ───────────────────────────────────────────────────────────────────────

export type ClienteEstado = 'activo' | 'prospecto' | 'inactivo' | 'baja'
export type ClienteTipo = 'hogar' | 'empresa' | 'autonomo'
export type OportunidadEtapa =
  | 'prospecto'
  | 'contactado'
  | 'propuesta'
  | 'negociacion'
  | 'ganado'
  | 'perdido'
export type OportunidadPrioridad = 'alta' | 'media' | 'baja'

export interface Cliente {
  id: string
  nombre: string
  empresa?: string
  nif?: string
  email: string
  telefono: string
  tipo: ClienteTipo
  estado: ClienteEstado
  comercializadora_actual?: string
  cups_count: number
  contratos_gne: number
  comision?: number
  fecha_alta?: string
  ultima_actividad: string
  etiquetas?: string[]
}

export interface Oportunidad {
  id: string
  cliente_nombre: string
  cliente_empresa?: string
  tipo_producto: 'luz_hogar' | 'luz_empresa' | 'gas_hogar' | 'gas_empresa' | 'dual'
  etapa: OportunidadEtapa
  prioridad: OportunidadPrioridad
  valor_estimado: number
  fecha_creacion: string
  fecha_seguimiento?: string
  notas?: string
}

export interface CRMStats {
  total_clientes: number
  incidencias: number
  comisionado: number
  volumen_mwh: number
}

// ── Tutoriales ────────────────────────────────────────────────────────────────

export type TutorialCategoria =
  | 'ventas'
  | 'tecnico'
  | 'herramientas'
  | 'normativa'
  | 'producto'

export type TutorialFormato = 'video' | 'articulo' | 'webinar'
export type TutorialNivel = 'básico' | 'intermedio' | 'avanzado'

export interface Tutorial {
  id: string
  titulo: string
  descripcion: string
  categoria: TutorialCategoria
  formato: TutorialFormato
  nivel: TutorialNivel
  duracion_min: number
  fecha_publicacion: string
  autor: string
  vistas: number
  destacado?: boolean
  nuevo?: boolean
  tags: string[]
}

// ── Gestión de usuarios ──────────────────────────────────────────────────────

/** Roles que cada rol puede crear */
export const CREATABLE_ROLES: Record<Role, Role[]> = {
  ADMIN: ['BACKOFFICE', 'DIRECTOR', 'KAM', 'CANAL', 'COMERCIAL'],
  BACKOFFICE: [],
  DIRECTOR: ['KAM', 'CANAL', 'COMERCIAL'],
  KAM: ['CANAL', 'COMERCIAL'],
  CANAL: ['COMERCIAL'],
  COMERCIAL: [],
}

/** Roles que pueden acceder a la sección de gestión de usuarios */
export const ROLES_CAN_MANAGE_USERS: Role[] = ['ADMIN', 'BACKOFFICE', 'DIRECTOR', 'KAM', 'CANAL']

export interface CreateUserPayload {
  email: string
  password: string
  full_name: string
  alias: string
  role: Role
  // Datos comerciales (opcionales)
  commercial_nif?: string
  commercial_address?: string
  commercial_postal_code?: string
  // Facturación (opcionales)
  billing_name?: string
  billing_nif?: string
  billing_address?: string
  billing_postal_code?: string
  billing_city?: string
  billing_iban?: string
  billing_retention_pct?: number
  billing_vat_pct?: number
  // Configuración comercial
  commission_type?: CommissionType
  wallet_personal?: number
  wallet_family?: number
  // Estructura jerárquica
  parent_id?: string
  subordinate_ids?: string[]
}

export interface UserListItem {
  id: string
  email: string
  full_name: string
  role: Role
  alias?: string
  commission_type?: CommissionType
  created_at: string
}

export interface AssignableUser {
  id: string
  full_name: string
  role: Role
  parent_id: string | null
}
