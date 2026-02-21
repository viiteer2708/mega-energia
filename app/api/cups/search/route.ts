// Server-only — GreeningEnergy SIPS API
// Docs: openapi.json / https://api.greeningenergy.com

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const API_BASE = 'https://api.greeningenergy.com'

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
    // API returned encrypted response — decrypt
    try {
      text = decrypt(buf, iv)
    } catch {
      // Fallback: try as plain text
      text = buf.toString('utf8')
    }
  } else {
    // No encryption — plain JSON
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
    // Fetch raw SIPS data + 12-month consumption in parallel
    const [rawData, consumoData] = await Promise.all([
      apiGet(`/api/public/sips/info/raw?cups=${encodeURIComponent(cups)}`),
      apiGet(`/api/public/sips/info/consumo?cups=${encodeURIComponent(cups)}`),
    ])

    // ── Parse ClientesSips[0] ──────────────────────────────────────────
    const raw = rawData as Obj
    const cliente = (raw?.ClientesSips as Obj[] | null)?.[0] ?? {} as Obj

    const tarifa = str(cliente.CodigoTarifaATREnVigor)

    // Potencias in Watts → convert to kW
    const potencias: { periodo: string; potencia: number }[] = []
    for (let i = 1; i <= 6; i++) {
      const wVal = num(cliente[`PotenciasContratadasEnWP${i}`])
      if (wVal !== null) potencias.push({ periodo: `P${i}`, potencia: wVal / 1000 })
    }

    // Titular: try full name field, then concatenate parts
    const nombreCompleto = str(cliente.NombreCompletoTitular)
    const titularParts = [
      str(cliente.NombreTitular),
      str(cliente.Apellido1Titular),
      str(cliente.Apellido2Titular),
    ].filter(Boolean).join(' ')
    const titular = nombreCompleto ?? (titularParts || null)

    // Address
    const municipio  = str(cliente.DesMunicipioPS)  ?? str(cliente.MunicipioPS)
    const provincia  = str(cliente.DesProvinciaPS)  ?? str(cliente.CodigoProvinciaPS)
    const cp         = str(cliente.CodigoPostalPS)
    const distribuidora = str(cliente.NombreEmpresaDistribuidora)
    const ultimaLectura = str(cliente.FechaUltimaLectura)
    const tipoMedida = str(cliente.CodigoTelegestion)  // non-empty → telegestionado

    // Build address string from parts
    const tipoVia  = str(cliente.TipoViaPS)
    const via      = str(cliente.ViaPS)
    const numFinca = str(cliente.NumFincaPS)
    const piso     = str(cliente.PisoPS)
    const puerta   = str(cliente.PuertaPS)
    const direccion = [tipoVia, via, numFinca, piso, puerta].filter(Boolean).join(' ') || null

    // NIF
    const nif = str(cliente.IdTitular)

    // ── Parse CupsConsumo[] ────────────────────────────────────────────
    // Schema: [{Fecha: "2025-01T...", P1: kWh, P2: kWh, ...}]
    const MES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    const consumoMensual: { mes: string; kwh: number }[] = []

    if (Array.isArray(consumoData)) {
      for (const row of consumoData as Obj[]) {
        const fecha = str(row.Fecha)
        const mesLabel = fecha
          ? MES_ES[new Date(fecha).getMonth()]
          : undefined

        // Sum all periods for total monthly kWh
        let kwh = 0
        for (let i = 1; i <= 6; i++) {
          kwh += num(row[`P${i}`]) ?? 0
        }
        if (mesLabel && kwh > 0) consumoMensual.push({ mes: mesLabel, kwh })
      }
    }

    const consumoAnual = consumoMensual.reduce((s, r) => s + r.kwh, 0) || null

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
