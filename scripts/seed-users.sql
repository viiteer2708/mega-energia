-- ============================================================================
-- SEED: Usuarios de test con jerarquía completa
-- Pegar en Supabase Dashboard > SQL Editor > New query > Run
--
-- IMPORTANTE: Los 6 usuarios auth ya existen. Este script solo crea
-- los perfiles y asigna la jerarquía.
-- ============================================================================

-- 1. Insertar perfiles (upsert por si el trigger ya los creó)
INSERT INTO public.profiles (id, email, full_name, role, alias, commission_type, wallet_personal, wallet_family)
VALUES
  ('a11332c0-e04b-43f2-b2b2-f2d4a80a305d', 'admin@gruponewenergy.es',      'Víctor Marrón',       'ADMIN',      'VMARRON',     'otro', 0.5, 0.5),
  ('48043d26-7d29-47e6-9766-5a91b15f9da0', 'backoffice@gruponewenergy.es',  'Laura García',        'BACKOFFICE', 'LGARCIA',     'otro', 0.5, 0.5),
  ('7cae709e-456a-473d-96f8-a2b51c2e103a', 'director@gruponewenergy.es',    'Alejandro Sacristán', 'DIRECTOR',   'ASACRISTAN',  'otro', 0.5, 0.5),
  ('ec5cb2db-069d-41e1-aa18-ce99c10c1e6e', 'kam@gruponewenergy.es',         'Miguel Ángel Rubio',  'KAM',        'MRUBIO',      'otro', 0.5, 0.5),
  ('7de8099c-865d-499e-8fa8-194175cce5be', 'canal@gruponewenergy.es',       'Roberto Bilbao',      'CANAL',      'RBILBAO',     'otro', 0.5, 0.5),
  ('c774c449-0adc-4251-ba7f-5575ef11c236', 'comercial@gruponewenergy.es',   'Aitor Carracedo',     'COMERCIAL',  'ACARRACEDO',  'otro', 0.5, 0.5)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  alias = EXCLUDED.alias,
  commission_type = EXCLUDED.commission_type,
  wallet_personal = EXCLUDED.wallet_personal,
  wallet_family = EXCLUDED.wallet_family;

-- 2. Asignar jerarquía:
--   ADMIN (raíz)
--   ├── BACKOFFICE
--   └── DIRECTOR
--       └── KAM
--           └── CANAL
--               └── COMERCIAL

UPDATE public.profiles SET parent_id = NULL
  WHERE id = 'a11332c0-e04b-43f2-b2b2-f2d4a80a305d'; -- ADMIN = raíz

UPDATE public.profiles SET parent_id = 'a11332c0-e04b-43f2-b2b2-f2d4a80a305d'
  WHERE id = '48043d26-7d29-47e6-9766-5a91b15f9da0'; -- BACKOFFICE → ADMIN

UPDATE public.profiles SET parent_id = 'a11332c0-e04b-43f2-b2b2-f2d4a80a305d'
  WHERE id = '7cae709e-456a-473d-96f8-a2b51c2e103a'; -- DIRECTOR → ADMIN

UPDATE public.profiles SET parent_id = '7cae709e-456a-473d-96f8-a2b51c2e103a'
  WHERE id = 'ec5cb2db-069d-41e1-aa18-ce99c10c1e6e'; -- KAM → DIRECTOR

UPDATE public.profiles SET parent_id = 'ec5cb2db-069d-41e1-aa18-ce99c10c1e6e'
  WHERE id = '7de8099c-865d-499e-8fa8-194175cce5be'; -- CANAL → KAM

UPDATE public.profiles SET parent_id = '7de8099c-865d-499e-8fa8-194175cce5be'
  WHERE id = 'c774c449-0adc-4251-ba7f-5575ef11c236'; -- COMERCIAL → CANAL

-- 3. Contadores de factura
INSERT INTO public.invoice_counters (user_id, year, last_number)
VALUES
  ('a11332c0-e04b-43f2-b2b2-f2d4a80a305d', 2026, 0),
  ('48043d26-7d29-47e6-9766-5a91b15f9da0', 2026, 0),
  ('7cae709e-456a-473d-96f8-a2b51c2e103a', 2026, 0),
  ('ec5cb2db-069d-41e1-aa18-ce99c10c1e6e', 2026, 0),
  ('7de8099c-865d-499e-8fa8-194175cce5be', 2026, 0),
  ('c774c449-0adc-4251-ba7f-5575ef11c236', 2026, 0)
ON CONFLICT (user_id, year) DO NOTHING;

-- 4. Verificación
SELECT p.full_name, p.role, p.alias, p2.full_name AS superior
FROM public.profiles p
LEFT JOIN public.profiles p2 ON p.parent_id = p2.id
ORDER BY
  CASE p.role
    WHEN 'ADMIN' THEN 1
    WHEN 'BACKOFFICE' THEN 2
    WHEN 'DIRECTOR' THEN 3
    WHEN 'KAM' THEN 4
    WHEN 'CANAL' THEN 5
    WHEN 'COMERCIAL' THEN 6
  END;

-- 5. Forzar recarga del schema cache de PostgREST
NOTIFY pgrst, 'reload schema';
