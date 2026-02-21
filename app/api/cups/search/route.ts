// Server-only — desencripta la respuesta de greeningenergy y devuelve datos SIPS al cliente

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const API_BASE = 'https://api.greeningenergy.com'

// ── Desencriptado (PBKDF2-SHA256 + AES-256-CBC, idéntico al JS del cliente) ──

function decrypt(buf: Buffer, ivB64: string): string {
  const key = process.env.GREENINGENERGY_API_KEY!
  const salt = Buffer.from(process.env.GREENINGENERGY_SALT_B64!, 'base64')
  const iv = Buffer.from(ivB64, 'base64')
  const derivedKey = crypto.pbkdf2Sync(key, salt, 100_000, 32, 'sha256')
  const decipher = crypto.createDecipheriv('aes-256-cbc', derivedKey, iv)
  return Buffer.concat([decipher.update(buf), decipher.final()]).toString('utf8')
}

function tryDecrypt(buf: Buffer, ivB64: string): string {
  // 1) descifra el buffer crudo
  try { return decrypt(buf, ivB64) } catch { /* continúa */ }

  // 2) respuesta JSON plana (algunos endpoints sin cifrar)
  const plain = buf.toString('utf8').trim()
  if (plain.startsWith('{') || plain.startsWith('[')) return plain

  // 3) el body es base64 del ciphertext
  try { return decrypt(Buffer.from(plain, 'base64'), ivB64) } catch { /* continúa */ }

  throw new Error('No se pudo descifrar la respuesta de la API')
}

// ── Fetch helper ───────────────────────────────────────────────────────────

async function apiGet(path: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-api-key': process.env.GREENINGENERGY_API_KEY! },
    cache: 'no-store',
  })
  const iv = res.headers.get('x-iv') ?? ''
  const buf = Buffer.from(await res.arrayBuffer())

  if (!res.ok) {
    throw new Error(`API HTTP ${res.status}: ${buf.toString('utf8').slice(0, 200)}`)
  }

  const text = iv ? tryDecrypt(buf, iv) : buf.toString('utf8')
  return JSON.parse(text)
}

// ── Parsers best-effort (igual que el HTML original) ──────────────────────

type Obj = Record<string, unknown>

function str(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim()
  if (typeof v === 'number') return String(v)
  return null
}

function deep(o: unknown, ...keys: string[]): unknown {
  if (!o || typeof o !== 'object') return undefined
  const obj = o as Obj
  for (const k of keys) if (obj[k] != null) return obj[k]
  return undefined
}

function extractTarifa(o: unknown): string | null {
  const raw = o as Obj
  return (
    str(deep(o, 'TarifaAcceso', 'tarifaAcceso', 'Peaje', 'peaje', 'Tarifa', 'tarifa')) ??
    str((raw?.DatosSips as Obj)?.TarifaAcceso) ??
    str((raw?.DatosSips as Obj)?.PeajeAcceso)
  )
}

function extractPotencias(o: unknown): { periodo: string; potencia: number }[] {
  const raw = o as Obj
  const source =
    raw?.PotenciasContratadas ??
    raw?.potencias ??
    (raw?.DatosSips as Obj)?.Potencias ??
    (raw?.SipsData as Obj)?.Potencias

  if (Array.isArray(source) && source.length) {
    return source
      .map((item: unknown, i: number) => {
        if (typeof item === 'object' && item !== null) {
          const s = item as Obj
          return {
            periodo: str(s.Periodo ?? s.periodo ?? s.Period) ?? `P${i + 1}`,
            potencia: Number(s.Potencia ?? s.potencia ?? s.Value ?? s.value ?? 0),
          }
        }
        return { periodo: `P${i + 1}`, potencia: Number(item) }
      })
      .filter((p) => p.potencia > 0)
  }

  // Escaneo profundo buscando keys que incluyan "potencia"
  const found: { periodo: string; potencia: number }[] = []
  const stack: [string, unknown][] = Object.entries(raw)
  while (stack.length) {
    const [k, v] = stack.pop()!
    if (v && typeof v === 'object') Object.entries(v as Obj).forEach((e) => stack.push(e))
    if (/potencia/i.test(k)) {
      const n = Number(v)
      if (!Number.isNaN(n) && n > 0) found.push({ periodo: k, potencia: n })
    }
  }
  return found
}

function extractConsumoMensual(arr: unknown): { mes: string; kwh: number }[] {
  if (!Array.isArray(arr)) return []
  const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const KEYS = ['Consumo', 'consumo', 'kWh', 'kwh', 'Kwh', 'Energia', 'energia', 'Activa', 'activa', 'ConsumoActiva']

  return arr
    .map((row: unknown, i: number) => {
      if (!row || typeof row !== 'object') return null
      const o = row as Obj
      const mesRaw = str(o.Mes ?? o.mes ?? o.Month ?? o.month ?? o.Fecha ?? o.fecha)
      const mes = mesRaw?.slice(0, 3) ?? MES[i % 12]

      let kwh = 0
      for (const k of KEYS) {
        if (o[k] != null) { kwh = Number(o[k]); break }
      }
      if (!kwh) {
        const firstNum = Object.values(o).find((x) => typeof x === 'number')
        if (firstNum != null) kwh = Number(firstNum)
      }
      return { mes, kwh }
    })
    .filter((r): r is { mes: string; kwh: number } => r !== null && r.kwh > 0)
}

// ── Handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const cups = req.nextUrl.searchParams.get('cups')?.trim().toUpperCase()
  if (!cups) return NextResponse.json({ error: 'CUPS requerido' }, { status: 400 })

  if (!process.env.GREENINGENERGY_API_KEY || !process.env.GREENINGENERGY_SALT_B64) {
    return NextResponse.json(
      { error: 'API no configurada. Añade GREENINGENERGY_API_KEY y GREENINGENERGY_SALT_B64 en .env.local' },
      { status: 503 },
    )
  }

  try {
    const [rawData, consumoData] = await Promise.all([
      apiGet(`/api/public/sips/info/raw?cups=${encodeURIComponent(cups)}`),
      apiGet(`/api/public/sips/info/consumo?cups=${encodeURIComponent(cups)}`),
    ])

    const raw = rawData as Obj
    const tarifa = extractTarifa(rawData)
    const potencias = extractPotencias(rawData)
    const consumoMensual = extractConsumoMensual(consumoData)
    const consumoAnual = consumoMensual.reduce((s, r) => s + r.kwh, 0) || null

    return NextResponse.json({
      cups,
      tarifa,
      potencias,
      consumoMensual,
      consumoAnual,
      titular:
        str(deep(raw, 'Nombre', 'nombre', 'Titular', 'titular', 'NombreTitular')) ??
        str((raw?.DatosSips as Obj)?.Nombre),
      nif: str(deep(raw, 'NIF', 'nif', 'CIF', 'cif', 'DNI', 'dni')),
      direccion:
        str(deep(raw, 'Direccion', 'direccion', 'DireccionSuministro', 'Domicilio')) ??
        str((raw?.DatosSips as Obj)?.Direccion),
      municipio:
        str(deep(raw, 'Municipio', 'municipio', 'Localidad')) ??
        str((raw?.DatosSips as Obj)?.Municipio),
      provincia:
        str(deep(raw, 'Provincia', 'provincia')) ??
        str((raw?.DatosSips as Obj)?.Provincia),
      cp: str(deep(raw, 'CodigoPostal', 'codigoPostal', 'CP', 'cp', 'CodPostal')),
      comercializadora: str(deep(raw, 'Comercializadora', 'comercializadora', 'NombreComercializadora')),
      distribuidora: str(deep(raw, 'Distribuidora', 'distribuidora', 'CodigoDistribuidora')),
      tipoMedida: str(deep(raw, 'TipoMedida', 'tipoMedida', 'TipoContador', 'Telegestionado')),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
