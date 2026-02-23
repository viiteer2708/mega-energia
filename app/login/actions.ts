'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Mock users — reemplazar con Supabase cuando esté configurado
const MOCK_USERS = [
  { id: 'admin-01',  email: 'admin@gruponewenergy.es',     password: 'gne2026', name: 'Víctor Marrón',        role: 'ADMIN' },
  { id: 'dir-01',    email: 'director@gruponewenergy.es',  password: 'gne2026', name: 'Alejandro Sacristán',  role: 'DIRECTOR' },
  { id: 'kam-01',    email: 'kam@gruponewenergy.es',       password: 'gne2026', name: 'Miguel Ángel Rubio',   role: 'KAM' },
  { id: 'canal-01',  email: 'canal@gruponewenergy.es',     password: 'gne2026', name: 'Roberto Bilbao',       role: 'CANAL' },
  { id: 'com-01',    email: 'comercial@gruponewenergy.es', password: 'gne2026', name: 'Aitor Carracedo',      role: 'COMERCIAL' },
]

export async function signIn(formData: FormData) {
  const email    = (formData.get('email') as string).toLowerCase().trim()
  const password = formData.get('password') as string

  const user = MOCK_USERS.find(u => u.email === email && u.password === password)

  if (!user) {
    return { error: 'Credenciales incorrectas. Verifica tu email y contraseña.' }
  }

  const cookieStore = await cookies()
  cookieStore.set('gne-session', JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role }), {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 8, // 8 horas
  })

  redirect('/dashboard')
}

export async function signOut() {
  const cookieStore = await cookies()
  cookieStore.delete('gne-session')
  redirect('/login')
}
