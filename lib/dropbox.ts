// Server-only — never import from client components

export interface DBFile {
  id: string
  name: string
  size: number // bytes
  path: string
}

export interface DBSection {
  id: string
  name: string
  files: DBFile[]
  subfolders: { id: string; name: string }[]
}

const DROPBOX_API = 'https://api.dropboxapi.com/2'

async function dbPost(endpoint: string, body: object) {
  const token = process.env.DROPBOX_ACCESS_TOKEN
  const res = await fetch(`${DROPBOX_API}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    next: { revalidate: 300 }, // cache 5 min
  })
  if (!res.ok) return null
  return res.json()
}

async function listFolder(pathOrId: string): Promise<{ files: DBFile[]; subfolders: { id: string; name: string }[] }> {
  const data = await dbPost('/files/list_folder', { path: pathOrId })
  if (!data?.entries) return { files: [], subfolders: [] }

  const files: DBFile[] = []
  const subfolders: { id: string; name: string }[] = []

  for (const entry of data.entries) {
    if (entry['.tag'] === 'file') {
      files.push({ id: entry.id, name: entry.name, size: entry.size, path: entry.path_display })
    } else if (entry['.tag'] === 'folder') {
      subfolders.push({ id: entry.id, name: entry.name })
    }
  }

  return { files, subfolders }
}

// Root folder of the shared Dropbox (listing via shared_link)
const SHARED_LINK = 'https://www.dropbox.com/scl/fo/rmx4pz7nubvqdof1mhbri/AFa5wvHv4AABAWr-NXgOjMo?rlkey=goek0ng74bdrm6dg7hsxknyw8&dl=0'

const MAIN_FOLDERS: { id: string; name: string }[] = [
  { id: 'id:6sQNZb27aFAAAAAAAAACPg', name: 'INSTRUCCIONES Y TUTORIALES' },
  { id: 'id:6sQNZb27aFAAAAAAAAAcHg', name: 'LUZ' },
  { id: 'id:6sQNZb27aFAAAAAAAACIXg', name: 'GAS' },
  { id: 'id:6sQNZb27aFAAAAAAAABXUg', name: 'PLATAFORMA ADMINISTRADORES DE FINCAS' },
]

export async function getMateriales(): Promise<{ rootFiles: DBFile[]; sections: DBSection[] }> {
  // Fetch root + all main folders in parallel
  const [rootData, ...sectionData] = await Promise.all([
    dbPost('/files/list_folder', {
      path: '',
      shared_link: { url: SHARED_LINK },
    }),
    ...MAIN_FOLDERS.map(f => listFolder(f.id)),
  ])

  const rootFiles: DBFile[] = (rootData?.entries ?? [])
    .filter((e: { '.tag': string }) => e['.tag'] === 'file')
    .map((e: { id: string; name: string; size: number; path_display: string }) => ({
      id: e.id, name: e.name, size: e.size, path: e.path_display,
    }))

  const sections: DBSection[] = MAIN_FOLDERS.map((folder, i) => ({
    id: folder.id,
    name: folder.name,
    files: sectionData[i].files,
    subfolders: sectionData[i].subfolders,
  }))

  return { rootFiles, sections }
}

export async function getTemporaryLink(fileId: string): Promise<string | null> {
  const data = await dbPost('/files/get_temporary_link', { path: fileId })
  return data?.link ?? null
}
