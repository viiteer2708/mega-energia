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
