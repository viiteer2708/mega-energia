import type {
  KPIData,
  ContratoMensual,
  ContratoPorTipo,
  Actividad,
  ComercialRanking,
} from '@/lib/types'

export const mockKPIs: KPIData = {
  contratos_mes: 23,
  contratos_variacion: 15.4,
  potencia_total: 847.5,
  facturacion: 48320,
  tasa_conversion: 34.7,
  ranking: 3,
}

export const mockVentasMensuales: ContratoMensual[] = [
  { mes: 'Sep', contratos: 14, facturacion: 31200 },
  { mes: 'Oct', contratos: 18, facturacion: 38900 },
  { mes: 'Nov', contratos: 16, facturacion: 35100 },
  { mes: 'Dic', contratos: 12, facturacion: 28400 },
  { mes: 'Ene', contratos: 20, facturacion: 43500 },
  { mes: 'Feb', contratos: 23, facturacion: 48320 },
]

export const mockContratosPorTipo: ContratoPorTipo[] = [
  { tipo: 'Luz Hogar', actual: 9, anterior: 8 },
  { tipo: 'Luz Empresa', actual: 6, anterior: 4 },
  { tipo: 'Gas Hogar', actual: 5, anterior: 6 },
  { tipo: 'Gas Empresa', actual: 2, anterior: 1 },
  { tipo: 'Dual', actual: 1, anterior: 1 },
]

export const mockActividades: Actividad[] = [
  {
    id: '1',
    tipo: 'contrato',
    descripcion: 'Contrato firmado',
    cliente: 'Restaurante El Rincón, S.L.',
    fecha: '2026-02-21T10:30:00',
    importe: 3200,
  },
  {
    id: '2',
    tipo: 'visita',
    descripcion: 'Visita comercial realizada',
    cliente: 'Familia Martínez López',
    fecha: '2026-02-21T09:00:00',
  },
  {
    id: '3',
    tipo: 'contrato',
    descripcion: 'Contrato firmado',
    cliente: 'Talleres Hernández, S.A.',
    fecha: '2026-02-20T16:45:00',
    importe: 5800,
  },
  {
    id: '4',
    tipo: 'llamada',
    descripcion: 'Llamada de seguimiento',
    cliente: 'Peluquería Style & Cut',
    fecha: '2026-02-20T11:20:00',
  },
  {
    id: '5',
    tipo: 'email',
    descripcion: 'Propuesta enviada',
    cliente: 'Academia de Idiomas Berlín',
    fecha: '2026-02-19T14:00:00',
  },
  {
    id: '6',
    tipo: 'contrato',
    descripcion: 'Contrato firmado',
    cliente: 'García e Hijos Ferretería',
    fecha: '2026-02-19T10:15:00',
    importe: 2100,
  },
]

export const mockRanking: ComercialRanking[] = [
  { posicion: 1, nombre: 'Ana Rodríguez', contratos: 31, facturacion: 67400 },
  { posicion: 2, nombre: 'Miguel Fernández', contratos: 28, facturacion: 59200 },
  { posicion: 3, nombre: 'Carlos García', contratos: 23, facturacion: 48320 },
  { posicion: 4, nombre: 'Laura Sánchez', contratos: 19, facturacion: 41800 },
  { posicion: 5, nombre: 'David Torres', contratos: 16, facturacion: 34600 },
]
