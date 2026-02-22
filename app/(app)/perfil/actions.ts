'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function updateProfile(formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  const cookieStore = await cookies()
  const raw = cookieStore.get('mega-session')?.value
  if (!raw || !name || !email) {
    redirect('/login')
  }

  const session = JSON.parse(raw) as { email: string; name: string; role: string }

  cookieStore.set(
    'mega-session',
    JSON.stringify({ email, name, role: session.role }),
    {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 8,
    }
  )

  redirect('/perfil')
}
