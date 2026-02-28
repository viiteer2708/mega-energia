export type Role = 'ADMIN' | 'BACKOFFICE' | 'DIRECTOR' | 'KAM' | 'CANAL' | 'COMERCIAL'
export type CommissionType = 'partner' | 'master' | 'distribuidor' | 'otro'
export type CommissionModel = 'table' | 'formula'
export type PricingType = 'indexado' | 'fijo'
export type PotenciaCalcMethod = 'sum_periods' | 'average'
export type OverrideType = 'percentage' | 'fixed'
export type FeeType = 'energia' | 'potencia'

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
  commission_pct?: number | null
  commission_tier_id?: number | null
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

export interface MaximetroMensual {
  mes: string
  p1: number
  p2: number
  p3: number
  p4: number
  p5: number
  p6: number
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
  potencia_max_bie?: number | null // kW — Potencia máxima BIE (del SIPS raw)
  // Consumo
  consumo_anual_kwh: number
  consumo_mensual: ConsumoMensual[]
  maximetros: MaximetroMensual[]
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
  BACKOFFICE: ['BACKOFFICE', 'DIRECTOR', 'KAM', 'CANAL', 'COMERCIAL'],
  DIRECTOR: ['KAM', 'CANAL', 'COMERCIAL'],
  KAM: ['CANAL', 'COMERCIAL'],
  CANAL: ['COMERCIAL'],
  COMERCIAL: ['COMERCIAL'],
}

/** Roles que pueden acceder a la sección de gestión de usuarios */
export const ROLES_CAN_MANAGE_USERS: Role[] = ['ADMIN', 'BACKOFFICE', 'DIRECTOR', 'KAM', 'CANAL', 'COMERCIAL']

/** Roles que pueden acceder a la sección de comisionado */
export const ROLES_CAN_VIEW_COMMISSIONS: Role[] = ['ADMIN', 'BACKOFFICE']

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
  commission_pct?: number | null
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
export type PagoStatus = 'pendiente' | 'pagado' | 'anulado' | 'retenido'
export type CommissionGnewStatus = 'no_calculada' | 'cargada_excel' | 'calculada_formula' | 'bloqueada'
export type ProductTipo = 'luz_hogar' | 'luz_empresa' | 'gas_hogar' | 'gas_empresa' | 'dual'

export interface Campaign {
  id: number
  name: string
  active: boolean
  created_at: string
}

export interface Comercializadora {
  id: number
  name: string
  active: boolean
  created_at: string
}

export interface Product {
  id: number
  name: string
  type: ProductTipo
  comercializadora_id: number | null
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
  status_commission_gnew: CommissionGnewStatus
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
  // Comisiones v2
  energy_company_id: number | null
  energy_product_id: number | null
  selected_fee_energia: number | null
  selected_fee_potencia: number | null
  gross_commission: number | null
  gnew_margin: number | null
  payout_partner_base: number | null
  // Bloque E.1 (solo ADMIN)
  commission_gnew: number
  decomission_gnew: number
  beneficio: number
  // Documentación
  doc_upload_mode: DocUploadMode | null
  // Devolución
  devolucion_motivo: string | null
  campos_a_corregir: string[] | null
  // Soft-delete
  deleted_at: string | null
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
  notes: string | null
  tier_name: string | null
  rate_applied: number | null
  is_differential: boolean
  differential_from_user_id: string | null
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
  energy_company_id?: number | null
  energy_product_id?: number | null
  selected_fee_energia?: number | null
  selected_fee_potencia?: number | null
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
  visible_fields: string[]
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

// ── Comisionado ──────────────────────────────────────────────────────────────

export const PAGO_STATUS_CONFIG: Record<PagoStatus, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  pagado:    { label: 'Pagado',    color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  anulado:   { label: 'Anulado',   color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  retenido:  { label: 'Retenido',  color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
}

export const COMMISSION_GNEW_STATUS_CONFIG: Record<CommissionGnewStatus, { label: string; color: string }> = {
  no_calculada:      { label: 'No calculada',      color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
  cargada_excel:     { label: 'Cargada Excel',     color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  calculada_formula: { label: 'Calculada Fórmula', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  bloqueada:         { label: 'Bloqueada',         color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
}

export interface CommissionFormulaConfig {
  id: number
  comercializadora_id: number
  product_id: number
  fee_energia: number
  mi: number
  fee_potencia: number
  comision_servicio: number
  version: number
  active: boolean
  created_by: string
  created_at: string
  updated_at: string
  // Joins opcionales
  comercializadora_name?: string
  product_name?: string
  created_by_name?: string
}

export interface CommissionUpload {
  id: number
  file_name: string
  total_rows: number
  updated_rows: number
  error_rows: number
  errors: Array<{ row: number; cups?: string; error: string }> | null
  uploaded_by: string
  created_at: string
  // Join opcional
  uploaded_by_name?: string
}

export interface CommissionCalculation {
  id: number
  contract_id: string
  formula_config_id: number
  consumo_used: number | null
  potencia_used: number | null
  fee_energia_used: number | null
  mi_used: number | null
  fee_potencia_used: number | null
  comision_servicio_used: number | null
  result_amount: number
  calculated_by: string
  created_at: string
}

export interface CommissionLineItem {
  // De contract_commissions
  id: number
  contract_id: string
  user_id: string
  commission_paid: number
  decomission: number
  status_pago: PagoStatus
  fecha_pago: string | null
  notes: string | null
  tier_name: string | null
  rate_applied: number | null
  is_differential: boolean
  created_at: string
  updated_at: string
  // Joins del contrato
  cups: string | null
  titular_contrato: string | null
  su_ref: string | null
  commission_gnew: number
  status_commission_gnew: CommissionGnewStatus
  // Join del usuario
  user_name: string
  user_role: Role
}

export interface CommissionLineFilters {
  search?: string
  status_pago?: PagoStatus
  fecha_desde?: string
  fecha_hasta?: string
  page?: number
}

export interface CommissionLineListResult {
  lines: CommissionLineItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ── Tablas de comisiones por rangos ─────────────────────────────────────────

export type TarifaAcceso =
  | '2.0TD' | '3.0TD'
  | '6.1TD' | '6.2TD' | '6.3TD' | '6.4TD'
  | 'RL.1' | 'RL.2' | 'RL.3' | 'RL.4'

export const TARIFAS_ELECTRICIDAD: TarifaAcceso[] = ['2.0TD', '3.0TD', '6.1TD', '6.2TD', '6.3TD', '6.4TD']
export const TARIFAS_GAS: TarifaAcceso[] = ['RL.1', 'RL.2', 'RL.3', 'RL.4']
export const ALL_TARIFAS: TarifaAcceso[] = [...TARIFAS_ELECTRICIDAD, ...TARIFAS_GAS]

export interface RateTable {
  id: number
  comercializadora_id: number
  comercializadora_name?: string
  version: number
  active: boolean
  notes: string | null
  uploaded_by: string
  created_at: string
  updated_at: string
  // Join opcional
  uploaded_by_name?: string
}

export interface RateTableSheet {
  id: number
  rate_table_id: number
  tarifa: string
}

export interface RateTableOffer {
  id: number
  sheet_id: number
  offer_name: string
  fee: number | null
  sort_order: number
}

export interface RateTableRate {
  id: number
  offer_id: number
  kwh_from: number
  kwh_to: number
  commission: number
}

export interface RateTableUpload {
  id: number
  rate_table_id: number
  file_name: string
  comercializadora_id: number | null
  comercializadora_name?: string
  totals: { sheets: number; offers: number; rates: number } | null
  errors: Array<{ sheet?: string; row?: number; error: string }> | null
  uploaded_by: string
  created_at: string
  // Join opcional
  uploaded_by_name?: string
}

/** Datos parseados de una hoja del Excel (client-side) */
export interface ParsedRateTableOffer {
  offer_name: string
  fee: number | null
  rates: Array<{ kwh_from: number; kwh_to: number; commission: number }>
}

export interface ParsedRateTableSheet {
  tarifa: string
  offers: ParsedRateTableOffer[]
}

export interface ParsedRateTable {
  comercializadora: string
  sheets: ParsedRateTableSheet[]
}

// ── Motor de Comisiones v2 ──────────────────────────────────────────────────

export interface EnergyCompany {
  id: number
  name: string
  commission_model: CommissionModel
  gnew_margin_pct: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface EnergyProduct {
  id: number
  company_id: number
  name: string
  fee_value: number | null
  fee_label: string | null
  active: boolean
  created_at: string
  updated_at: string
  // Joins opcionales
  company_name?: string
}

export interface CommissionRate {
  id: number
  product_id: number
  tariff: string
  consumption_min: number
  consumption_max: number
  gross_amount: number
  created_at: string
  updated_at: string
  // Joins opcionales
  product_name?: string
}

export interface FormulaConfig {
  id: number
  product_id: number
  pricing_type: PricingType
  fee_energia: number | null
  fee_energia_fijo: number | null
  margen_intermediacion: number
  fee_potencia: number | null
  potencia_calc_method: PotenciaCalcMethod
  comision_servicio: number
  factor_potencia: number
  factor_energia: number
  created_at: string
  updated_at: string
  // Joins opcionales
  product_name?: string
}

export interface FormulaFeeOption {
  id: number
  formula_config_id: number
  fee_type: FeeType
  value: number
  label: string | null
  sort_order: number
}

export interface CommissionTier {
  id: number
  name: string
  rate_pct: number | null
  sort_order: number
}

export interface UserCommissionOverride {
  id: number
  user_id: string
  product_id: number | null
  override_type: OverrideType
  override_value: number
  set_by_user_id: string
  created_at: string
  updated_at: string
  // Joins opcionales
  user_name?: string
  product_name?: string
}

export const COMMISSION_TIER_LABELS: Record<string, string> = {
  PARTNER: 'Partner (100%)',
  MASTER: 'Master (95%)',
  DISTRIBUIDOR: 'Distribuidor (85%)',
  EXCLUSIVE: 'Exclusive (110%)',
  VIP: 'VIP (importe fijo)',
}

/** Datos parseados del Excel de comisiones v2 */
export interface ParsedCommissionExcel {
  company_name: string
  commission_model: CommissionModel
  gnew_margin_pct: number
  products: Array<{
    name: string
    fee_value: number | null
    fee_label: string | null
    tariff: string
    rates: Array<{
      consumption_min: number
      consumption_max: number
      gross_amount: number
    }>
  }>
}

// ── Commission Upload v2 ────────────────────────────────────────────────────

export interface CommissionUploadV2 {
  id: number
  company_id: number
  file_name: string
  file_path: string | null
  records_created: number
  records_updated: number
  products_created: number
  summary: {
    tariffs: Record<string, { products: number; rates_created: number; rates_updated: number }>
    total_products: number
    total_rates: number
  } | null
  uploaded_by: string
  created_at: string
  // Joins opcionales
  company_name?: string
  uploaded_by_name?: string
}

export interface CommissionValidationError {
  type: 'overlap' | 'empty_field' | 'negative' | 'min_gt_max' | 'empty_name' | 'invalid_tariff' | 'duplicate_product'
  message: string
  tariff?: string
  product?: string
  row?: number
}

export interface CommissionValidationWarning {
  type: 'empty_sheet' | 'gap_in_ranges' | 'product_no_rates'
  message: string
  tariff?: string
  product?: string
}

export interface CommissionValidationResult {
  valid: boolean
  errors: CommissionValidationError[]
  warnings: CommissionValidationWarning[]
  summary: {
    new_products: string[]
    existing_products: string[]
    rates_by_tariff: Record<string, { new_count: number; update_count: number }>
    total_rates: number
  }
}

export const VALID_TARIFF_SHEETS = [
  '2.0TD', '3.0TD', '6.1TD', '6.2TD', '6.3TD', '6.4TD',
  'RL.1', 'RL.2', 'RL.3', 'RL.4', 'RL.5', 'RL.6',
] as const
