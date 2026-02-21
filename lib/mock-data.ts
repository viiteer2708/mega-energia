import type {
  KPIData,
  ContratoMensual,
  ContratoPorTipo,
  Actividad,
  ComercialRanking,
  Comunicado,
  EmailStats,
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

// ── Emails ──────────────────────────────────────────────────────────────────

export const mockEmailStats: EmailStats = {
  total_enviados: 148,
  tasa_apertura: 61.4,
  tasa_respuesta: 22.3,
  rebotados: 4,
}

export const mockComunicados: Comunicado[] = [
  {
    id: 'em-001',
    asunto: 'Propuesta tarifa Luz Empresa — Talleres Hernández, S.A.',
    tipo: 'propuesta',
    estado: 'respondido',
    destinatarios: [
      { nombre: 'José Hernández', email: 'jhernandez@talleres-hernandez.es', empresa: 'Talleres Hernández, S.A.' },
    ],
    fecha_envio: '2026-02-20T09:15:00',
    fecha_apertura: '2026-02-20T10:02:00',
    cuerpo: `Estimado José,\n\nMe pongo en contacto con usted para presentarle nuestra propuesta personalizada para Talleres Hernández, S.A.\n\nTras analizar su consumo actual, hemos diseñado una tarifa de Luz Empresa que le permitirá ahorrar hasta un 23% en su factura eléctrica mensual.\n\n**Detalles de la propuesta:**\n- Tarifa: Empresa Plus 3.0TD\n- Potencia contratada: 45 kW\n- Precio energía P1: 0,142 €/kWh\n- Precio energía P2: 0,098 €/kWh\n- Precio energía P3: 0,068 €/kWh\n- Permanencia: 12 meses\n\nAhorro estimado anual: 2.840 €\n\nQuedo a su disposición para cualquier consulta o para concretar una reunión.\n\nUn cordial saludo,\nCarlos García\nComercial MEGA ENERGÍA`,
    adjuntos: ['propuesta_talleres_hernandez_feb2026.pdf'],
  },
  {
    id: 'em-002',
    asunto: 'Seguimiento visita comercial — Restaurante El Rincón',
    tipo: 'seguimiento',
    estado: 'abierto',
    destinatarios: [
      { nombre: 'María López', email: 'info@restauranteelrincon.es', empresa: 'Restaurante El Rincón, S.L.' },
    ],
    fecha_envio: '2026-02-19T16:30:00',
    fecha_apertura: '2026-02-20T08:45:00',
    cuerpo: `Estimada María,\n\nFue un placer visitarles ayer en el restaurante. Como acordamos, le envío un resumen de los puntos tratados.\n\nTras revisar sus facturas de los últimos 6 meses, confirmamos que con nuestra tarifa Hostelería Dual (luz + gas) obtendría un ahorro significativo frente a su contrato actual.\n\n¿Podemos quedar esta semana para finalizar los detalles y proceder con la firma?\n\nQuedo pendiente de su respuesta.\n\nSaludos,\nCarlos García`,
    adjuntos: [],
  },
  {
    id: 'em-003',
    asunto: 'Bienvenido a MEGA ENERGÍA — Familia Martínez',
    tipo: 'bienvenida',
    estado: 'abierto',
    destinatarios: [
      { nombre: 'Antonio Martínez', email: 'amartinez@gmail.com' },
    ],
    fecha_envio: '2026-02-18T11:00:00',
    fecha_apertura: '2026-02-18T12:30:00',
    cuerpo: `Estimado Antonio,\n\nEs un placer darle la bienvenida a la familia MEGA ENERGÍA.\n\nSu contrato de Luz Hogar ya está activo y el suministro quedará operativo en los próximos 2-3 días hábiles. Le enviaremos una notificación en cuanto esté confirmado.\n\n**Sus datos de contrato:**\n- CUPS: ES0021000012345678AB\n- Tarifa: Hogar Inteligente 2.0TD\n- Potencia: 5,75 kW\n- Precio fijo mensual: 18,50 €\n\nPara cualquier consulta puede contactarme directamente en este email o llamarme al 612 345 678.\n\nGracias por confiar en nosotros.\n\nCarlos García\nComercial MEGA ENERGÍA`,
    adjuntos: ['contrato_martinez_lopez.pdf', 'guia_bienvenida_mega.pdf'],
  },
  {
    id: 'em-004',
    asunto: 'Propuesta renovación contrato — Academia de Idiomas Berlín',
    tipo: 'renovacion',
    estado: 'enviado',
    destinatarios: [
      { nombre: 'Sandra Weiss', email: 'direccion@academiaberlin.es', empresa: 'Academia de Idiomas Berlín, S.L.' },
      { nombre: 'Contabilidad', email: 'contabilidad@academiaberlin.es', empresa: 'Academia de Idiomas Berlín, S.L.' },
    ],
    fecha_envio: '2026-02-17T10:00:00',
    cuerpo: `Estimada Sandra,\n\nSu contrato actual con MEGA ENERGÍA vence el próximo 15 de marzo. Aprovecho para presentarle las condiciones mejoradas para la renovación.\n\nDada su trayectoria como cliente y su consumo, hemos preparado una oferta especial que incluye:\n\n- Precio energía P1 reducido: 0,128 €/kWh (antes 0,145 €/kWh)\n- Bono fidelidad: descuento del 5% durante 3 meses\n- Sin penalización por cambio de potencia\n\nPor favor, háganos saber si desea proceder con la renovación o si prefiere que le llame para explicarle los detalles.\n\nSaludos,\nCarlos García`,
    adjuntos: ['oferta_renovacion_academia_berlin_2026.pdf'],
  },
  {
    id: 'em-005',
    asunto: 'Novedades tarifarias febrero 2026 — MEGA ENERGÍA',
    tipo: 'informativo',
    estado: 'abierto',
    destinatarios: [
      { nombre: 'Pedro Ruiz', email: 'pedro.ruiz@ferreteria-garcia.es', empresa: 'García e Hijos Ferretería' },
      { nombre: 'Carmen Vega', email: 'cvega@peluqueria-stylecut.es', empresa: 'Peluquería Style & Cut' },
      { nombre: 'Luis Moreno', email: 'lmoreno@talleres-auto.es', empresa: 'Talleres Auto Moreno' },
    ],
    fecha_envio: '2026-02-15T09:00:00',
    fecha_apertura: '2026-02-15T14:22:00',
    cuerpo: `Estimados clientes,\n\nLes informamos de las novedades que MEGA ENERGÍA introduce este mes de febrero:\n\n**Nuevas tarifas:**\n- Tarifa Solar Plus: incluye gestión de excedentes de autoconsumo\n- Tarifa Nocturna Empresa: precio especial en horario valle (23h-7h)\n\n**Cambios regulatorios:**\nA partir del 1 de marzo, el Ministerio para la Transición Ecológica actualiza los peajes de red. Nuestras tarifas ya recogen estos cambios sin coste adicional para usted.\n\nPara más información, no dude en contactarme.\n\nUn saludo,\nCarlos García`,
    adjuntos: [],
  },
  {
    id: 'em-006',
    asunto: 'Oferta especial Dual Hogar — ahorra en luz Y gas',
    tipo: 'promocion',
    estado: 'rebotado',
    destinatarios: [
      { nombre: 'Ramón Pascual', email: 'rpascual@hotmail.comm' },
    ],
    fecha_envio: '2026-02-14T11:30:00',
    cuerpo: `Estimado Ramón,\n\nLe escribo para presentarle nuestra oferta exclusiva de este mes: el bono Dual Hogar.\n\nContratando luz y gas con MEGA ENERGÍA, obtendrá:\n- 10% de descuento en la factura de luz durante 6 meses\n- 8% de descuento en la factura de gas durante 6 meses\n- Gestión de los cambios de compañía sin ningún trámite por su parte\n\nEsta oferta es válida hasta el 28 de febrero.\n\n¿Le interesa? Con una llamada lo tenemos todo listo.\n\nSaludos,\nCarlos García`,
    adjuntos: [],
  },
  {
    id: 'em-007',
    asunto: 'Propuesta Luz Empresa — Clínica Dental Sonrisa',
    tipo: 'propuesta',
    estado: 'respondido',
    destinatarios: [
      { nombre: 'Dra. Elena Blanco', email: 'clinica@dentalsonrisa.es', empresa: 'Clínica Dental Sonrisa, S.L.' },
    ],
    fecha_envio: '2026-02-12T10:45:00',
    fecha_apertura: '2026-02-12T11:20:00',
    cuerpo: `Estimada Elena,\n\nAdjunto encontrará la propuesta que preparé tras nuestra reunión del pasado lunes.\n\nLa tarifa Empresa Sanitaria que le propongo está especialmente diseñada para centros médicos, con precio estable durante 24 meses y sin sorpresas en la factura.\n\nAhorro estimado respecto a su contrato actual: 1.680 € anuales.\n\nEspero su confirmación para proceder con el alta.\n\nSaludos,\nCarlos García`,
    adjuntos: ['propuesta_dental_sonrisa_feb2026.pdf'],
  },
  {
    id: 'em-008',
    asunto: 'Seguimiento propuesta — Gym FitPower',
    tipo: 'seguimiento',
    estado: 'enviado',
    destinatarios: [
      { nombre: 'Marcos Jiménez', email: 'info@gymfitpower.es', empresa: 'Gym FitPower S.L.' },
    ],
    fecha_envio: '2026-02-10T16:00:00',
    cuerpo: `Estimado Marcos,\n\nSigo pendiente de su respuesta sobre la propuesta que le envié el pasado día 3 de febrero.\n\nEntiendo que es una decisión importante, por eso quería recordarle que la oferta especial que incluía el descuento del 15% durante los primeros 3 meses vence el próximo viernes 14.\n\nSi tiene cualquier duda o quiere revisar algún punto de la propuesta, estoy disponible esta semana.\n\nSaludos,\nCarlos García`,
    adjuntos: [],
  },
]
