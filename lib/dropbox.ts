// Server-only — never import from client components

export interface DBFile {
  id: string
  name: string
  size: number
  path: string
}

export interface DBSection {
  id: string
  name: string
  files: DBFile[]
  subfolders: { id: string; name: string }[]
}

const DROPBOX_API = 'https://api.dropboxapi.com/2'

// ── Token cache (proceso de Node — se refresca automáticamente) ───────────────

let cachedToken: string | null = null
let tokenExpiresAt = 0

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && Date.now() < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedToken
  }

  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN
  const clientId = process.env.DROPBOX_APP_KEY
  const clientSecret = process.env.DROPBOX_APP_SECRET

  if (!refreshToken || !clientId || !clientSecret) {
    console.error('[Dropbox] Faltan variables de entorno DROPBOX_*')
    return null
  }

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
    if (!data.access_token) {
      console.error('[Dropbox] Token refresh failed:', data)
      return null
    }

    cachedToken = data.access_token
    tokenExpiresAt = Date.now() + data.expires_in * 1000
    return cachedToken!
  } catch (err) {
    console.error('[Dropbox] Error al refrescar token:', err)
    return null
  }
}

// ── API helper ────────────────────────────────────────────────────────────────

async function dbPost(endpoint: string, body: object) {
  const token = await getAccessToken()
  if (!token) {
    console.error('[Dropbox] No se pudo obtener token — revisa DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY, DROPBOX_APP_SECRET')
    return null
  }

  try {
    const res = await fetch(`${DROPBOX_API}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(`[Dropbox] ${endpoint} respondió ${res.status}: ${text}`)
      return null
    }
    return res.json()
  } catch (err) {
    console.error(`[Dropbox] Error en ${endpoint}:`, err)
    return null
  }
}

// ── Folder listing ────────────────────────────────────────────────────────────

export async function listFolder(pathOrId: string): Promise<{ files: DBFile[]; subfolders: { id: string; name: string }[] }> {
  const data = await dbPost('/files/list_folder', { path: pathOrId })
  if (!data?.entries) return { files: [], subfolders: [] }

  // Acumular todas las entries, manejando paginación
  const allEntries: typeof data.entries = [...data.entries]

  let hasMore = data.has_more as boolean
  let cursor = data.cursor as string

  while (hasMore) {
    const page = await dbPost('/files/list_folder/continue', { cursor })
    if (!page?.entries) break
    allEntries.push(...page.entries)
    hasMore = page.has_more as boolean
    cursor = page.cursor as string
  }

  const files: DBFile[] = []
  const subfolders: { id: string; name: string }[] = []

  for (const entry of allEntries) {
    if (entry['.tag'] === 'file') {
      files.push({ id: entry.id, name: entry.name, size: entry.size, path: entry.path_display })
    } else if (entry['.tag'] === 'folder') {
      subfolders.push({ id: entry.id, name: entry.name })
    }
  }

  return { files, subfolders }
}

// ── Estructura de carpetas: MATERIAL ENERGIA ────────────────────────────────

const ROOT_FOLDER_ID = 'id:Q-MSjjekoQYAAAAAAAAivA' // MATERIAL ENERGIA

export async function getMateriales(): Promise<{ rootFiles: DBFile[]; sections: DBSection[] }> {
  // Descubrir dinámicamente todas las subcarpetas de MATERIAL ENERGIA
  const rootData = await listFolder(ROOT_FOLDER_ID)

  // Cargar contenido de cada subcarpeta en paralelo
  const sectionData = await Promise.all(
    rootData.subfolders.map(f => listFolder(f.id))
  )

  const sections: DBSection[] = rootData.subfolders.map((folder, i) => ({
    id: folder.id,
    name: folder.name,
    files: sectionData[i].files,
    subfolders: sectionData[i].subfolders,
  }))

  return { rootFiles: rootData.files, sections }
}

export async function getTemporaryLink(fileId: string): Promise<string | null> {
  const data = await dbPost('/files/get_temporary_link', { path: fileId })
  return data?.link ?? null
}
