'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Mock users — reemplazar con Supabase cuando esté configurado
const MOCK_USERS = [
  { email: 'carlos@gruponewenergy.es', password: 'gne2026', name: 'Carlos García', role: 'COMERCIAL' },
  { email: 'admin@gruponewenergy.es',  password: 'gne2026', name: 'Admin GNE',    role: 'ADMIN' },
]

export async function signIn(formData: FormData) {
  const email    = (formData.get('email') as string).toLowerCase().trim()
  const password = formData.get('password') as string

  const user = MOCK_USERS.find(u => u.email === email && u.password === password)

  if (!user) {
    return { error: 'Credenciales incorrectas. Verifica tu email y contraseña.' }
  }

  const cookieStore = await cookies()
  cookieStore.set('gne-session', JSON.stringify({ email: user.email, name: user.name, role: user.role }), {
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
