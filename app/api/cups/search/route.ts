// Server-only — GreeningEnergy SIPS API
// Docs: openapi.json / https://api.greeningenergy.com

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const API_BASE = 'https://api.greeningenergy.com'

// ── ATR tariff code → friendly name ──────────────────────────────────────────

const ATR_MAP: Record<string, string> = {
  '018': '2.0TD',
  '019': '3.0TD',
  '011': 'RL.1',
  '012': 'RL.2',
  '013': 'RL.3',
  '014': 'RL.4',
  '015': 'RL.5',
  '016': 'RL.6',
  '003': '3.0A',
  '004': '3.1A',
  '006': '6.1',
  '007': '6.2',
  '008': '6.3',
  '009': '6.4',
  '010': '6.5',
}

// TipoTarifa enum (from /info endpoint) → friendly name
const TIPO_TARIFA_MAP: Record<number, string> = {
  202020: '2.0TD',
  202030: '3.0TD',
  202061: '6.1TD',
  202062: '6.2TD',
  202063: '6.3TD',
  202064: '6.4TD',
}

function mapTarifa(atrCode: string | null, tipoTarifa?: number | null): string | null {
  if (atrCode) return ATR_MAP[atrCode] ?? atrCode
  if (tipoTarifa) return TIPO_TARIFA_MAP[tipoTarifa] ?? null
  return null
}

// ── Decryption (only used when API returns x-iv header) ───────────────────

function decrypt(buf: Buffer, ivB64: string): string {
  const saltB64 = process.env.GREENINGENERGY_SALT_B64
  if (!saltB64) throw new Error('SALT not configured')
  const salt = Buffer.from(saltB64, 'base64')
  const iv = Buffer.from(ivB64, 'base64')
  const derivedKey = crypto.pbkdf2Sync(
    process.env.GREENINGENERGY_API_KEY!,
    salt, 100_000, 32, 'sha256'
  )
  const decipher = crypto.createDecipheriv('aes-256-cbc', derivedKey, iv)
  return Buffer.concat([decipher.update(buf), decipher.final()]).toString('utf8')
}

// ── Fetch + optional decrypt ───────────────────────────────────────────────

async function apiGet(path: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-api-key': process.env.GREENINGENERGY_API_KEY! },
    cache: 'no-store',
  })

  const buf = Buffer.from(await res.arrayBuffer())

  if (!res.ok) {
    throw new Error(`API HTTP ${res.status}: ${buf.toString('utf8').slice(0, 300)}`)
  }

  const iv = res.headers.get('x-iv')
  let text: string

  if (iv) {
    try {
      text = decrypt(buf, iv)
    } catch (e) {
      throw new Error(`Decryption failed: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  } else {
    text = buf.toString('utf8')
  }

  return JSON.parse(text)
}

// ── Field helpers ─────────────────────────────────────────────────────────

type Obj = Record<string, unknown>

function str(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim()
  return null
}

function num(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

// ── Main handler ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const cups = req.nextUrl.searchParams.get('cups')?.trim().toUpperCase()
  if (!cups) return NextResponse.json({ error: 'CUPS requerido' }, { status: 400 })

  if (!process.env.GREENINGENERGY_API_KEY) {
    return NextResponse.json(
      { error: 'API no configurada (GREENINGENERGY_API_KEY)' },
      { status: 503 },
    )
  }

  try {
    // Fetch SIPS info + raw + monthly consumption in parallel
    const [infoData, rawData, consumoData] = await Promise.all([
      apiGet(`/api/public/sips/info?cups=${encodeURIComponent(cups)}`),
      apiGet(`/api/public/sips/info/raw?cups=${encodeURIComponent(cups)}`),
      apiGet(`/api/public/sips/info/consumo?cups=${encodeURIComponent(cups)}`),
    ])

    // ── Parse /info (CupsInfo) ─────────────────────────────────────────
    const info = infoData as Obj

    // Potencias — already in kW in the /info endpoint
    const potContratada = info?.PotenciaContratada as Obj | null
    const potencias: { periodo: string; potencia: number }[] = []
    for (const p of ['P1','P2','P3','P4','P5','P6'] as const) {
      const v = num(potContratada?.[p])
      if (v !== null) potencias.push({ periodo: p, potencia: v })
    }

    // Tarifa — from /info TipoTarifa enum, fallback to raw ATR code
    const raw = rawData as Obj
    const cliente = (raw?.ClientesSips as Obj[] | null)?.[0] ?? {} as Obj
    const atrCode = str(cliente.CodigoTarifaATREnVigor)
    const tipoTarifa = typeof info.TipoTarifa === 'number' ? info.TipoTarifa : null
    const tarifa = mapTarifa(atrCode, tipoTarifa)

    // Consumo anual — from ConsumoPeriodos (sum), fallback to ConsumoEstimado
    const consumoPeriodos = info?.ConsumoPeriodos as Obj | null
    let consumoAnualInfo = 0
    if (consumoPeriodos) {
      for (const p of ['P1','P2','P3','P4','P5','P6']) {
        consumoAnualInfo += num(consumoPeriodos[p]) ?? 0
      }
    }
    if (!consumoAnualInfo) consumoAnualInfo = num(info.ConsumoEstimado) ?? 0

    // ── Parse ClientesSips[0] (from /raw) for geo + distribuidora ─────
    const municipio    = str(cliente.DesMunicipioPS)  ?? str(cliente.MunicipioPS)
    const provincia    = str(cliente.DesProvinciaPS)  ?? str(cliente.CodigoProvinciaPS)
    const cp           = str(cliente.CodigoPostalPS)
    const distribuidora = str(cliente.NombreEmpresaDistribuidora)
    const ultimaLectura = str(cliente.FechaUltimaLectura)
    const tipoMedida   = str(cliente.CodigoTelegestion)

    // Build address string from raw parts
    const tipoVia  = str(cliente.TipoViaPS)
    const via      = str(cliente.ViaPS)
    const numFinca = str(cliente.NumFincaPS)
    const piso     = str(cliente.PisoPS)
    const puerta   = str(cliente.PuertaPS)
    const direccion = [tipoVia, via, numFinca, piso, puerta].filter(Boolean).join(' ') || null

    // NIF + titular (rarely returned by public SIPS)
    const nif    = str(cliente.IdTitular)
    const nombreCompleto = str(cliente.NombreCompletoTitular)
    const titularParts = [
      str(cliente.NombreTitular),
      str(cliente.Apellido1Titular),
      str(cliente.Apellido2Titular),
    ].filter(Boolean).join(' ')
    const titular = nombreCompleto ?? (titularParts || null)

    // ── Parse CupsConsumo[] for monthly breakdown ──────────────────────
    const MES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    const consumoMensual: { mes: string; kwh: number }[] = []

    if (Array.isArray(consumoData)) {
      for (const row of consumoData as Obj[]) {
        const fecha = str(row.Fecha)
        const mesLabel = fecha
          ? MES_ES[new Date(fecha).getMonth()]
          : undefined

        let kwh = 0
        for (let i = 1; i <= 6; i++) {
          kwh += num(row[`P${i}`]) ?? 0
        }
        if (mesLabel && kwh > 0) consumoMensual.push({ mes: mesLabel, kwh })
      }
    }

    // Monthly sum as fallback consumo anual
    const consumoMensualSum = consumoMensual.reduce((s, r) => s + r.kwh, 0)
    const consumoAnual = consumoMensualSum || consumoAnualInfo || null

    return NextResponse.json({
      cups,
      tarifa,
      potencias,
      consumoMensual,
      consumoAnual,
      titular,
      nif,
      direccion,
      municipio,
      provincia,
      cp,
      distribuidora,
      tipoMedida,
      ultimaLectura,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
