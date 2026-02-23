import { NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET() {
  const apiKey = process.env.GREENINGENERGY_API_KEY?.trim()
  const saltB64 = process.env.GREENINGENERGY_SALT_B64?.trim()

  const envStatus = {
    GREENINGENERGY_API_KEY: apiKey
      ? { set: true, length: apiKey.length, start: apiKey.slice(0, 6), end: apiKey.slice(-6) }
      : { set: false },
    GREENINGENERGY_SALT_B64: saltB64
      ? { set: true, length: saltB64.length, start: saltB64.slice(0, 6), end: saltB64.slice(-6) }
      : { set: false },
  }

  if (!apiKey || !saltB64) {
    return NextResponse.json({ status: 'error', message: 'Faltan variables de entorno', env: envStatus })
  }

  // Test: consultar un CUPS real y desencriptar
  const cups = 'ES0031104001642002EP'
  let apiOk = false
  let apiError: string | null = null
  let decryptOk = false
  let decryptError: string | null = null
  let httpStatus: number | null = null
  let hasIv = false

  try {
    const res = await fetch(
      `https://api.greeningenergy.com/api/public/sips/info?cups=${cups}`,
      { headers: { 'x-api-key': apiKey }, cache: 'no-store' },
    )
    httpStatus = res.status
    const buf = Buffer.from(await res.arrayBuffer())

    if (!res.ok) {
      apiError = buf.toString('utf8').slice(0, 300)
      return NextResponse.json({ status: 'error', env: envStatus, httpStatus, apiError })
    }

    apiOk = true
    const iv = res.headers.get('x-iv')
    hasIv = !!iv

    if (iv) {
      try {
        const salt = Buffer.from(saltB64, 'base64')
        const ivBuf = Buffer.from(iv, 'base64')
        const derivedKey = crypto.pbkdf2Sync(apiKey, salt, 100_000, 32, 'sha256')
        const decipher = crypto.createDecipheriv('aes-256-cbc', derivedKey, ivBuf)
        const text = Buffer.concat([decipher.update(buf), decipher.final()]).toString('utf8')
        JSON.parse(text) // Verify valid JSON
        decryptOk = true
      } catch (e) {
        decryptError = e instanceof Error ? e.message : String(e)
      }
    } else {
      // No encryption — try parsing directly
      try {
        JSON.parse(buf.toString('utf8'))
        decryptOk = true
      } catch {
        decryptError = 'Response not encrypted but not valid JSON either'
      }
    }
  } catch (e) {
    apiError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({
    status: decryptOk ? 'ok' : 'error',
    env: envStatus,
    api: { ok: apiOk, httpStatus, hasIv, error: apiError },
    decrypt: { ok: decryptOk, error: decryptError },
  })
}
