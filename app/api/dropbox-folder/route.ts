import { NextRequest, NextResponse } from 'next/server'
import { listFolder } from '@/lib/dropbox'

export async function GET(request: NextRequest) {
  const folderId = request.nextUrl.searchParams.get('id')
  if (!folderId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const data = await listFolder(folderId)
  return NextResponse.json(data)
}
