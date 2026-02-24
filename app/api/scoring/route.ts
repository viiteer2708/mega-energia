// Server-only — GreeningEnergy Pre Scoring API
// POST /api/scoring  →  { cups, nif }

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const API_BASE = 'https://api.greeningenergy.com'

// ── Decryption (only used when API returns x-iv header) ───────────────────

function decrypt(buf: Buffer, ivB64: string): string {
  const saltB64 = process.env.GREENINGENERGY_SALT_B64?.trim()
  if (!saltB64) throw new Error('SALT not configured')
  const salt = Buffer.from(saltB64, 'base64')
  const iv = Buffer.from(ivB64, 'base64')
  const derivedKey = crypto.pbkdf2Sync(
    process.env.GREENINGENERGY_API_KEY!.trim(),
    salt, 100_000, 32, 'sha256'
  )
  const decipher = crypto.createDecipheriv('aes-256-cbc', derivedKey, iv)
  return Buffer.concat([decipher.update(buf), decipher.final()]).toString('utf8')
}

// ── Main handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env.GREENINGENERGY_API_KEY) {
    return NextResponse.json(
      { error: 'API no configurada (GREENINGENERGY_API_KEY)' },
      { status: 503 },
    )
  }

  let cups: string
  let nif: string

  try {
    const body = await req.json()
    cups = (body.cups as string)?.trim().toUpperCase()
    nif = (body.nif as string)?.trim().toUpperCase()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  if (!cups) return NextResponse.json({ error: 'CUPS requerido' }, { status: 400 })
  if (!nif) return NextResponse.json({ error: 'NIF/CIF requerido' }, { status: 400 })

  try {
    const res = await fetch(`${API_BASE}/api/public/scoring/post`, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.GREENINGENERGY_API_KEY.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ Cups: [cups], Identificacion: nif }),
      cache: 'no-store',
    })

    const buf = Buffer.from(await res.arrayBuffer())

    if (!res.ok) {
      const errText = buf.toString('utf8').slice(0, 300)
      return NextResponse.json({ error: errText || `HTTP ${res.status}` }, { status: res.status })
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

    return NextResponse.json({ resultado: text.trim() })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
