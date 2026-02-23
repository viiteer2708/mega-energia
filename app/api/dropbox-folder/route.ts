import { NextRequest, NextResponse } from 'next/server'
import { listFolder } from '@/lib/dropbox'

export async function GET(request: NextRequest) {
  const folderId = request.nextUrl.searchParams.get('id')
  if (!folderId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    const data = await listFolder(folderId)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[API dropbox-folder] Error:', err)
    return NextResponse.json({ error: 'Error al cargar carpeta' }, { status: 500 })
  }
}
