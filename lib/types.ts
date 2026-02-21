export type Role = 'ADMIN' | 'SUPERVISOR' | 'COMERCIAL'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: Role
  avatar_url?: string
  wolfcrm_id?: string
}

export interface KPIData {
  contratos_mes: number
  contratos_variacion: number
  potencia_total: number
  facturacion: number
  tasa_conversion: number
  ranking: number
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
  posicion: number
  nombre: string
  contratos: number
  facturacion: number
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
  // Análisis MEGA
  ahorro_estimado_anual: number
  tarifa_mega_recomendada: string
  precios_mega: PrecioPeriodo[]
}

export interface CUPSBusquedaReciente {
  cups: string
  titular: string
  tipo: CUPSTipo
  fecha: string
}

// ── Emails ──────────────────────────────────────────────────────────────────

export type EmailTipo =
  | 'propuesta'
  | 'seguimiento'
  | 'bienvenida'
  | 'renovacion'
  | 'informativo'
  | 'promocion'

export type EmailEstado = 'enviado' | 'abierto' | 'respondido' | 'rebotado'

export interface EmailDestinatario {
  nombre: string
  email: string
  empresa?: string
}

export interface Comunicado {
  id: string
  asunto: string
  tipo: EmailTipo
  estado: EmailEstado
  destinatarios: EmailDestinatario[]
  fecha_envio: string
  fecha_apertura?: string
  cuerpo: string
  adjuntos?: string[]
}

export interface EmailStats {
  total_enviados: number
  tasa_apertura: number
  tasa_respuesta: number
  rebotados: number
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
  es_mega: boolean
  destacado?: boolean
}

export interface ComparadorInputData {
  tipo: TipoSuministroComp
  consumo_anual_kwh: number
  consumo_p1_pct: number   // % consumo en P1
  consumo_p2_pct: number   // % consumo en P2
  consumo_p3_pct: number   // % consumo en P3
  potencia_kw: number
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
  contratos_mega: number
  ahorro_estimado?: number
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
  clientes_activos: number
  prospectos: number
  oportunidades_abiertas: number
  valor_pipeline: number
  conversiones_mes: number
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
