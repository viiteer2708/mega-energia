import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN
  const clientId = process.env.DROPBOX_APP_KEY
  const clientSecret = process.env.DROPBOX_APP_SECRET

  const envStatus = {
    DROPBOX_REFRESH_TOKEN: refreshToken ? 'SET' : 'MISSING',
    DROPBOX_APP_KEY: clientId ? 'SET' : 'MISSING',
    DROPBOX_APP_SECRET: clientSecret ? 'SET' : 'MISSING',
  }

  // Si falta alguna variable, no intentar nada más
  if (!refreshToken || !clientId || !clientSecret) {
    return NextResponse.json({
      status: 'error',
      message: 'Faltan variables de entorno',
      env: envStatus,
      token: null,
      folder: null,
    })
  }

  // Intentar refresh del token
  let tokenOk = false
  let tokenError: string | null = null
  let accessToken: string | null = null

  try {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    })

    const res = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      cache: 'no-store',
    })

    const data = await res.json()
    if (data.access_token) {
      tokenOk = true
      accessToken = data.access_token
    } else {
      tokenError = data.error_description || data.error || 'Unknown error'
    }
  } catch (err) {
    tokenError = err instanceof Error ? err.message : String(err)
  }

  // Intentar listar carpeta raíz MATERIAL ENERGIA
  let folderEntries: number | null = null
  let folderError: string | null = null

  if (accessToken) {
    try {
      const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: 'id:Q-MSjjekoQYAAAAAAAAivA' }),
        cache: 'no-store',
      })

      if (res.ok) {
        const data = await res.json()
        folderEntries = data.entries?.length ?? 0
      } else {
        const text = await res.text().catch(() => '')
        folderError = `HTTP ${res.status}: ${text.slice(0, 200)}`
      }
    } catch (err) {
      folderError = err instanceof Error ? err.message : String(err)
    }
  }

  const allOk = tokenOk && folderEntries !== null

  return NextResponse.json({
    status: allOk ? 'ok' : 'error',
    env: envStatus,
    token: tokenOk ? 'ok' : tokenError,
    folder: folderEntries !== null
      ? { ok: true, entries: folderEntries }
      : { ok: false, error: folderError || 'No token available' },
  })
}
