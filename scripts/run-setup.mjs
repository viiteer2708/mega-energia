/**
 * Setup completo via Supabase service_role client.
 * Crea perfiles, jerarquía, invoice_counters.
 * Las tablas DDL (profiles, etc.) ya deben existir.
 *
 * Uso: set -a && source .env.local && set +a && node scripts/run-setup.mjs
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const PASSWORD = 'gne2026'

const USERS = [
  { email: 'admin@gruponewenergy.es',      full_name: 'Víctor Marrón',       role: 'ADMIN',      alias: 'VMARRON' },
  { email: 'backoffice@gruponewenergy.es',  full_name: 'Laura García',        role: 'BACKOFFICE', alias: 'LGARCIA' },
  { email: 'director@gruponewenergy.es',    full_name: 'Alejandro Sacristán', role: 'DIRECTOR',   alias: 'ASACRISTAN' },
  { email: 'kam@gruponewenergy.es',         full_name: 'Miguel Ángel Rubio',  role: 'KAM',        alias: 'MRUBIO' },
  { email: 'canal@gruponewenergy.es',       full_name: 'Roberto Bilbao',      role: 'CANAL',      alias: 'RBILBAO' },
  { email: 'comercial@gruponewenergy.es',   full_name: 'Aitor Carracedo',     role: 'COMERCIAL',  alias: 'ACARRACEDO' },
]

const HIERARCHY = [
  [1, 0], // BACKOFFICE  → ADMIN
  [2, 0], // DIRECTOR    → ADMIN
  [3, 2], // KAM         → DIRECTOR
  [4, 3], // CANAL       → KAM
  [5, 4], // COMERCIAL   → CANAL
]

async function run() {
  console.log('══════════════════════════════════════════════')
  console.log('  Setup: Usuarios + jerarquía')
  console.log('══════════════════════════════════════════════\n')

  // ── 1. Crear/recuperar auth users ───────────────────────
  console.log('1. Auth users...\n')
  const userIds = []

  for (const u of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email, password: PASSWORD, email_confirm: true,
      user_metadata: { full_name: u.full_name, role: u.role },
    })

    if (error) {
      if (error.message.includes('already been registered')) {
        const { data: list } = await supabase.auth.admin.listUsers()
        const found = list?.users?.find(au => au.email === u.email)
        if (found) {
          console.log(`   ~ ${u.full_name} (${u.role}) → ${found.id}`)
          userIds.push(found.id)
        } else {
          console.error(`   ✗ ${u.email}: no encontrado`)
          userIds.push(null)
        }
      } else {
        console.error(`   ✗ ${u.email}: ${error.message}`)
        userIds.push(null)
      }
    } else {
      console.log(`   + ${u.full_name} (${u.role}) → ${data.user.id}`)
      userIds.push(data.user.id)
    }
  }

  await new Promise(r => setTimeout(r, 2000))

  // ── 2. Upsert perfiles ─────────────────────────────────
  console.log('\n2. Perfiles...\n')

  for (let i = 0; i < USERS.length; i++) {
    const id = userIds[i]
    if (!id) continue
    const u = USERS[i]

    const { error } = await supabase.from('profiles').upsert({
      id, email: u.email, full_name: u.full_name, role: u.role,
      alias: u.alias, commission_type: 'otro', wallet_personal: 0.5, wallet_family: 0.5,
    }, { onConflict: 'id' })

    if (error) console.error(`   ✗ ${u.full_name}: ${error.message}`)
    else console.log(`   ✓ ${u.full_name} → ${u.role}`)
  }

  // ── 3. Jerarquía ───────────────────────────────────────
  console.log('\n3. Jerarquía...\n')

  // ADMIN sin padre
  if (userIds[0]) {
    await supabase.from('profiles').update({ parent_id: null }).eq('id', userIds[0])
  }

  for (const [ci, pi] of HIERARCHY) {
    if (!userIds[ci] || !userIds[pi]) continue
    const { error } = await supabase.from('profiles').update({ parent_id: userIds[pi] }).eq('id', userIds[ci])
    if (error) console.error(`   ✗ ${USERS[ci].full_name}: ${error.message}`)
    else console.log(`   ✓ ${USERS[ci].full_name} → hijo de ${USERS[pi].full_name}`)
  }

  // ── 4. Invoice counters ────────────────────────────────
  console.log('\n4. Contadores...\n')
  const year = new Date().getFullYear()

  for (let i = 0; i < USERS.length; i++) {
    if (!userIds[i]) continue
    const { error } = await supabase.from('invoice_counters')
      .upsert({ user_id: userIds[i], year, last_number: 0 }, { onConflict: 'user_id,year' })
    if (error) console.log(`   ~ ${USERS[i].alias}: ${error.message}`)
    else console.log(`   ✓ ${USERS[i].alias}-${year}`)
  }

  // ── 5. Verificación ────────────────────────────────────
  console.log('\n5. Verificación:\n')
  const { data: profiles } = await supabase
    .from('profiles')
    .select('full_name, role, parent_id, alias')
    .in('id', userIds.filter(Boolean))

  if (profiles) {
    const byParent = {}
    profiles.forEach(p => {
      const key = p.parent_id || 'root'
      if (!byParent[key]) byParent[key] = []
      byParent[key].push(p)
    })

    function printTree(parentId, depth) {
      const children = byParent[parentId || 'root'] || []
      children.forEach(p => {
        const indent = '   ' + '  '.repeat(depth)
        const prefix = depth > 0 ? '└── ' : ''
        console.log(`${indent}${prefix}${p.role}: ${p.full_name} (${p.alias})`)
        const pid = userIds[USERS.findIndex(u => u.full_name === p.full_name)]
        printTree(pid, depth + 1)
      })
    }
    printTree(null, 0)
  }

  console.log('\n══════════════════════════════════════════════')
  console.log('  Password: gne2026')
  console.log('══════════════════════════════════════════════\n')
}

run().catch(err => { console.error('Error:', err); process.exit(1) })
