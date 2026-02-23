'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function updateProfile(formData: FormData) {
  const name = (formData.get('name') as string)?.trim()

  if (!name) {
    redirect('/perfil')
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  await supabase
    .from('profiles')
    .update({ full_name: name })
    .eq('id', user.id)

  redirect('/perfil')
}
