import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://epouditgydvspsfcqfsx.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwb3VkaXRneWR2c3BzZmNxZnN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTgwNjYyMCwiZXhwIjoyMDg3MzgyNjIwfQ.LZDlyoWCeKNiwEbVc8hmsWwtz8J63WsSDe7zdEMp78I'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const sqlPath = resolve(__dirname, '..', 'supabase', 'migrations', '002_user_profile_expansion.sql')
const sql = readFileSync(sqlPath, 'utf-8')

async function run() {
  console.log('Ejecutando migración 002_user_profile_expansion...\n')

  const { error } = await supabase.rpc('exec_sql', { sql_text: sql })

  if (error) {
    // Si exec_sql no existe, intentar vía REST (Dashboard SQL Editor)
    console.error('Error con rpc exec_sql:', error.message)
    console.log('\nAlternativa: copia el contenido de')
    console.log(`  ${sqlPath}`)
    console.log('y ejecútalo en Supabase Dashboard > SQL Editor > New query > Run')
    process.exit(1)
  }

  console.log('Migración aplicada correctamente.')
}

run().catch(err => {
  console.error('Error fatal:', err.message)
  process.exit(1)
})
