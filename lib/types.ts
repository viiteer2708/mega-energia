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
  wallet_family: number
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

// ── Contratos ────────────────────────────────────────────────────────────────

export type ContractEstado =
  | 'borrador'
  | 'pendiente_validacion'
  | 'pendiente_aceptacion'
  | 'tramitado'
  | 'no_tramitado'
  | 'futura_activacion'
  | 'pendiente_instalacion'
  | 'pendiente_renovar'
  | 'ok'
  | 'incidencia'
  | 'devuelto'
  | 'ko'
  | 'baja'
  | 'aviso_baja'

export type DocTipo = 'factura' | 'dni' | 'cif' | 'escrituras' | 'contrato_firmado' | 'documentacion_completa'
export type DocUploadMode = 'single' | 'separate'
export type PagoStatus = 'pendiente' | 'pagado' | 'anulado'
export type ProductTipo = 'luz_hogar' | 'luz_empresa' | 'gas_hogar' | 'gas_empresa' | 'dual'

export interface Campaign {
  id: number
  name: string
  active: boolean
  created_at: string
}

export interface Product {
  id: number
  name: string
  type: ProductTipo
  active: boolean
  created_at: string
}

export interface Contract {
  // Bloque A
  id: string
  owner_id: string
  operador_id: string | null
  campaign_id: number | null
  product_id: number | null
  su_ref: string | null
  observaciones: string | null
  activo: boolean
  estado: ContractEstado
  fecha_alta: string
  fecha_baja: string | null
  // Bloque B
  cups: string | null
  tarifa: string | null
  potencia_1: number | null
  potencia_2: number | null
  potencia_3: number | null
  potencia_4: number | null
  potencia_5: number | null
  potencia_6: number | null
  media_potencia: number | null
  consumo_anual: number | null
  direccion: string | null
  codigo_postal: string | null
  poblacion: string | null
  provincia: string | null
  datos_manuales: boolean
  // Bloque C
  titular_contrato: string | null
  cif: string | null
  nombre_firmante: string | null
  dni_firmante: string | null
  telefono_1: string | null
  telefono_2: string | null
  email_titular: string | null
  cuenta_bancaria: string | null
  fecha_firma: string | null
  // Bloque D
  fecha_entrega_contrato: string | null
  fecha_cobro_distribuidor: string | null
  // Bloque E.1 (solo ADMIN)
  commission_gnew: number
  decomission_gnew: number
  beneficio: number
  // Documentación
  doc_upload_mode: DocUploadMode | null
  // Devolución
  devolucion_motivo: string | null
  campos_a_corregir: string[] | null
  // Auto-guardado
  draft_data: Record<string, unknown> | null
  // Meta
  created_at: string
  updated_at: string
  // Joins opcionales
  owner_name?: string
  operador_name?: string
  product_name?: string
  product_type?: ProductTipo
}

export interface ContractCommission {
  id: number
  contract_id: string
  user_id: string
  commission_paid: number
  decomission: number
  status_pago: PagoStatus
  fecha_pago: string | null
  created_at: string
  updated_at: string
  // Join opcional
  user_name?: string
}

export interface ContractDocument {
  id: number
  contract_id: string
  tipo_doc: DocTipo
  file_path: string
  file_name: string
  file_size: number
  mime_type: string
  uploaded_by: string
  created_at: string
  // Join opcional
  uploader_name?: string
}

export interface ContractStateLog {
  id: number
  contract_id: string
  from_state: ContractEstado | null
  to_state: ContractEstado
  changed_by: string
  motivo: string | null
  campos_devueltos: string[] | null
  created_at: string
  // Join opcional
  changed_by_name?: string
}

export interface ContractFilters {
  search?: string
  estado?: ContractEstado
  product_type?: ProductTipo
  fecha_desde?: string
  fecha_hasta?: string
  page?: number
}

export interface ContractListResult {
  contracts: Contract[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ContractFormData {
  // Bloque A
  product_id?: number | null
  campaign_id?: number | null
  observaciones?: string
  owner_id?: string
  // Bloque B
  cups?: string
  tarifa?: string
  potencia_1?: number | null
  potencia_2?: number | null
  potencia_3?: number | null
  potencia_4?: number | null
  potencia_5?: number | null
  potencia_6?: number | null
  consumo_anual?: number | null
  direccion?: string
  codigo_postal?: string
  poblacion?: string
  provincia?: string
  datos_manuales?: boolean
  // Bloque C
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

export interface ContractDetailResponse {
  contract: Contract
  commissions: ContractCommission[]
  documents: ContractDocument[]
  state_log: ContractStateLog[]
  editable_fields: string[]
  allowed_transitions: ContractEstado[]
}

/** Orden del selector de estados */
export const CONTRACT_ESTADOS_ORDER: ContractEstado[] = [
  'borrador',
  'pendiente_validacion',
  'pendiente_aceptacion',
  'tramitado',
  'no_tramitado',
  'futura_activacion',
  'pendiente_instalacion',
  'pendiente_renovar',
  'ok',
  'incidencia',
  'devuelto',
  'ko',
  'baja',
  'aviso_baja',
]

export const CONTRACT_STATE_CONFIG: Record<ContractEstado, { label: string; color: string }> = {
  borrador:               { label: 'Borrador',               color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
  pendiente_validacion:   { label: 'Pendiente Validación',   color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  pendiente_aceptacion:   { label: 'Pendiente Aceptación',   color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  tramitado:              { label: 'Tramitado',              color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  no_tramitado:           { label: 'No Tramitado',           color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  futura_activacion:      { label: 'Futura Activación',      color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  pendiente_instalacion:  { label: 'Pendiente Instalación',  color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  pendiente_renovar:      { label: 'Pendiente de Renovar',   color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  ok:                     { label: 'OK',                     color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  incidencia:             { label: 'Incidencia',             color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  devuelto:               { label: 'Devuelto',               color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  ko:                     { label: 'KO',                     color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  baja:                   { label: 'Baja',                   color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  aviso_baja:             { label: 'Aviso Baja',             color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
}

export const PRODUCT_TYPE_LABELS: Record<ProductTipo, string> = {
  luz_hogar: 'Luz Hogar',
  luz_empresa: 'Luz Empresa',
  gas_hogar: 'Gas Hogar',
  gas_empresa: 'Gas Empresa',
  dual: 'Dual',
}

export const DOC_TIPO_LABELS: Record<DocTipo, string> = {
  factura: 'Factura',
  dni: 'DNI',
  cif: 'CIF',
  escrituras: 'Escrituras',
  contrato_firmado: 'Contrato Firmado',
  documentacion_completa: 'Documentación Completa',
}
