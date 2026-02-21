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
