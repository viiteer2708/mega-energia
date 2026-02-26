/**
 * Seed: Crea un usuario por cada rol con jerarquía completa.
 *
 * Jerarquía resultante:
 *   ADMIN (Víctor Marrón)
 *   ├── BACKOFFICE (Laura García)
 *   └── DIRECTOR (Alejandro Sacristán)
 *       └── KAM (Miguel Ángel Rubio)
 *           └── CANAL (Roberto Bilbao)
 *               └── COMERCIAL (Aitor Carracedo)
 *
 * REQUISITO: Ejecutar primero all-migrations.sql en Supabase Dashboard > SQL Editor.
 *
 * Uso:
 *   set -a && source .env.local && set +a && node scripts/seed-test-hierarchy.mjs
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY')
  console.error('Ejecuta con: set -a && source .env.local && set +a && node scripts/seed-test-hierarchy.mjs')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PASSWORD = 'gne2026'

const USERS = [
  { email: 'admin@gruponewenergy.es',      full_name: 'Víctor Marrón',       role: 'ADMIN',      alias: 'VMARRON' },
  { email: 'backoffice@gruponewenergy.es',  full_name: 'Laura García',        role: 'BACKOFFICE', alias: 'LGARCIA' },
  { email: 'director@gruponewenergy.es',    full_name: 'Alejandro Sacristán', role: 'DIRECTOR',   alias: 'ASACRISTAN' },
  { email: 'kam@gruponewenergy.es',         full_name: 'Miguel Ángel Rubio',  role: 'KAM',        alias: 'MRUBIO' },
  { email: 'canal@gruponewenergy.es',       full_name: 'Roberto Bilbao',      role: 'CANAL',      alias: 'RBILBAO' },
  { email: 'comercial@gruponewenergy.es',   full_name: 'Aitor Carracedo',     role: 'COMERCIAL',  alias: 'ACARRACEDO' },
]

// Jerarquía: [childIndex, parentIndex]
const HIERARCHY = [
  [1, 0], // BACKOFFICE  → hijo de ADMIN
  [2, 0], // DIRECTOR    → hijo de ADMIN
  [3, 2], // KAM         → hijo de DIRECTOR
  [4, 3], // CANAL       → hijo de KAM
  [5, 4], // COMERCIAL   → hijo de CANAL
]

async function run() {
  console.log('══════════════════════════════════════════════')
  console.log('  Seed: Usuarios de test con jerarquía')
  console.log('══════════════════════════════════════════════\n')

  // ── Paso 1: Crear o recuperar usuarios ──────────────────────
  console.log('1. Creando/recuperando usuarios...\n')
  const userIds = []

  for (const u of USERS) {
    // Intentar crear en auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.full_name, role: u.role },
    })

    if (error) {
      if (error.message.includes('already been registered')) {
        // Buscar ID en auth.users vía admin API
        const { data: listData } = await supabase.auth.admin.listUsers()
        const existingAuth = listData?.users?.find(au => au.email === u.email)

        if (existingAuth) {
          console.log(`   ~ ${u.full_name} (${u.role}) ya existe en auth → ${existingAuth.id}`)
          userIds.push(existingAuth.id)
        } else {
          console.error(`   ✗ ${u.email}: registrado pero no encontrado en listUsers`)
          userIds.push(null)
        }
      } else {
        console.error(`   ✗ ${u.email}: ${error.message}`)
        userIds.push(null)
      }
    } else {
      console.log(`   + ${u.full_name} (${u.role}) creado → ${data.user.id}`)
      userIds.push(data.user.id)
    }
  }

  // Esperar a que triggers se ejecuten
  await new Promise(r => setTimeout(r, 2000))

  // ── Paso 2: Asegurar que exista el perfil (upsert) ─────────
  console.log('\n2. Creando/actualizando perfiles...\n')

  for (let i = 0; i < USERS.length; i++) {
    const id = userIds[i]
    if (!id) continue

    const u = USERS[i]
    const profileData = {
      id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      alias: u.alias,
      commission_type: 'otro',
      wallet_personal: 0.5,
      wallet_family: 0.5,
    }

    // Upsert: inserta si no existe, actualiza si ya existe
    const { error } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })

    if (error) {
      console.error(`   ✗ ${u.full_name}: ${error.message}`)
    } else {
      console.log(`   ✓ ${u.full_name} → role=${u.role}, alias=${u.alias}`)
    }
  }

  // ── Paso 3: Asignar jerarquía ──────────────────────────────
  console.log('\n3. Asignando jerarquía parent_id...\n')

  // ADMIN no tiene parent_id
  if (userIds[0]) {
    await supabase
      .from('profiles')
      .update({ parent_id: null })
      .eq('id', userIds[0])
  }

  for (const [childIdx, parentIdx] of HIERARCHY) {
    const childId = userIds[childIdx]
    const parentId = userIds[parentIdx]

    if (!childId || !parentId) {
      console.error(`   ✗ Saltando ${USERS[childIdx].full_name}: IDs no disponibles`)
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

  // ── Paso 4: Insertar invoice_counters ──────────────────────
  console.log('\n4. Creando contadores de factura...\n')
  const year = new Date().getFullYear()

  for (let i = 0; i < USERS.length; i++) {
    const id = userIds[i]
    if (!id) continue

    const { error } = await supabase
      .from('invoice_counters')
      .upsert({ user_id: id, year, last_number: 0 }, { onConflict: 'user_id,year' })

    if (error) {
      console.log(`   ~ ${USERS[i].alias}: ${error.message}`)
    } else {
      console.log(`   ✓ ${USERS[i].alias}-${year}`)
    }
  }

  // ── Verificación final ─────────────────────────────────────
  console.log('\n5. Verificación final:\n')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, parent_id, alias')
    .in('id', userIds.filter(Boolean))
    .order('created_at')

  if (profiles && profiles.length > 0) {
    const byId = Object.fromEntries(profiles.map(p => [p.id, p]))

    console.log('   Jerarquía:')
    // Ordenar por profundidad para mostrar el árbol correctamente
    const sorted = [...profiles].sort((a, b) => getDepth(a, byId) - getDepth(b, byId))
    for (const p of sorted) {
      const depth = getDepth(p, byId)
      const indent = '   ' + '  '.repeat(depth)
      const prefix = depth > 0 ? '└── ' : ''
      console.log(`${indent}${prefix}${p.role}: ${p.full_name} (${p.email})`)
    }
  } else {
    console.log('   (sin resultados)')
  }

  console.log('\n══════════════════════════════════════════════')
  console.log('  Todos los usuarios: password = gne2026')
  console.log('══════════════════════════════════════════════')
  console.log('')
  console.log('  Visibilidad esperada:')
  console.log('  ADMIN         → ve 6 usuarios (todos)')
  console.log('  BACKOFFICE    → ve 6 usuarios (todos)')
  console.log('  DIRECTOR      → ve 4 (él + KAM + CANAL + COMERCIAL)')
  console.log('  KAM           → ve 3 (él + CANAL + COMERCIAL)')
  console.log('  CANAL         → ve 2 (él + COMERCIAL)')
  console.log('  COMERCIAL     → ve 1 (solo él)')
  console.log('')
}

function getDepth(profile, byId) {
  let depth = 0
  let current = profile
  while (current.parent_id && byId[current.parent_id]) {
    depth++
    current = byId[current.parent_id]
  }
  return depth
}

run().catch(err => {
  console.error('Error fatal:', err)
  process.exit(1)
})
