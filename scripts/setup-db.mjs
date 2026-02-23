import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  console.error('Configúralas en .env.local o expórtalas antes de ejecutar este script.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const USERS = [
  { email: 'admin@gruponewenergy.es',    password: 'gne2026', full_name: 'Víctor Marrón',       role: 'ADMIN' },
  { email: 'director@gruponewenergy.es',  password: 'gne2026', full_name: 'Alejandro Sacristán', role: 'DIRECTOR' },
  { email: 'kam@gruponewenergy.es',       password: 'gne2026', full_name: 'Miguel Ángel Rubio',  role: 'KAM' },
  { email: 'canal@gruponewenergy.es',     password: 'gne2026', full_name: 'Roberto Bilbao',      role: 'CANAL' },
  { email: 'comercial@gruponewenergy.es', password: 'gne2026', full_name: 'Aitor Carracedo',     role: 'COMERCIAL' },
]

async function run() {
  // ── Paso 1: Crear usuarios via Admin API ──
  console.log('1. Creando usuarios via Admin API...')
  const userIds = []

  for (const u of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name, role: u.role },
    })

    if (error) {
      console.error(`   ✗ ${u.email}: ${error.message}`)
      userIds.push(null)
    } else {
      console.log(`   ✓ ${u.full_name} (${u.role}) → ${data.user.id}`)
      userIds.push(data.user.id)
    }
  }

  // Esperar un momento para que los triggers se ejecuten
  await new Promise(r => setTimeout(r, 2000))

  // ── Paso 2: Asignar jerarquía parent_id ──
  // ADMIN → DIRECTOR → KAM → CANAL → COMERCIAL
  console.log('\n2. Asignando jerarquía parent_id...')
  const hierarchy = [
    [1, 0], // DIRECTOR hijo de ADMIN
    [2, 1], // KAM hijo de DIRECTOR
    [3, 2], // CANAL hijo de KAM
    [4, 3], // COMERCIAL hijo de CANAL
  ]

  for (const [childIdx, parentIdx] of hierarchy) {
    const childId = userIds[childIdx]
    const parentId = userIds[parentIdx]
    if (!childId || !parentId) {
      console.error(`   ✗ Saltando: IDs no disponibles para ${USERS[childIdx].full_name}`)
      continue
    }

    const { error } = await supabase
      .from('profiles')
      .update({ parent_id: parentId })
      .eq('id', childId)

    if (error) {
      console.error(`   ✗ ${USERS[childIdx].full_name}: ${error.message}`)
    } else {
      console.log(`   ✓ ${USERS[childIdx].full_name} → hijo de ${USERS[parentIdx].full_name}`)
    }
  }

  // ── Verificación ──
  console.log('\n3. Verificando profiles...')
  const { data: profiles, error: err } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, parent_id')
    .order('created_at')

  if (err) {
    console.error('Error:', err.message)
  } else {
    console.table(profiles)
  }

  console.log('\n¡Listo! Usuarios creados y jerarquía asignada.')
}

run().catch(err => {
  console.error('Error fatal:', err.message)
  process.exit(1)
})
