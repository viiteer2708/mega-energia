-- ============================================================================
-- GRUPO NEW ENERGY — Fase 8: Comercializadoras como entidad principal
-- Crear tabla comercializadoras, migrar datos, refactorizar FKs
-- Pegar en Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════
-- 1. TABLA comercializadoras
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.comercializadoras (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comercializadoras_active ON public.comercializadoras(active);

-- RLS — solo ADMIN
ALTER TABLE public.comercializadoras ENABLE ROW LEVEL SECURITY;

CREATE POLICY comercializadoras_select ON public.comercializadoras
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY comercializadoras_insert ON public.comercializadoras
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY comercializadoras_update ON public.comercializadoras
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'ADMIN');

-- ═══════════════════════════════════════════════════════════════════
-- 2. MIGRAR datos existentes de rate_tables.comercializadora (texto)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO public.comercializadoras (name)
SELECT DISTINCT comercializadora
FROM public.rate_tables
WHERE comercializadora IS NOT NULL AND comercializadora <> ''
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- 3. rate_tables: texto → FK
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.rate_tables
  ADD COLUMN comercializadora_id BIGINT REFERENCES public.comercializadoras(id) ON DELETE RESTRICT;

UPDATE public.rate_tables rt
SET comercializadora_id = c.id
FROM public.comercializadoras c
WHERE c.name = rt.comercializadora;

ALTER TABLE public.rate_tables
  ALTER COLUMN comercializadora_id SET NOT NULL;

-- Reemplazar indice de texto por FK
DROP INDEX IF EXISTS idx_rate_tables_comercializadora;
CREATE INDEX idx_rate_tables_comercializadora_id ON public.rate_tables(comercializadora_id);

ALTER TABLE public.rate_tables
  DROP COLUMN comercializadora;

-- ═══════════════════════════════════════════════════════════════════
-- 4. rate_table_uploads: texto → FK
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.rate_table_uploads
  ADD COLUMN comercializadora_id BIGINT REFERENCES public.comercializadoras(id) ON DELETE RESTRICT;

UPDATE public.rate_table_uploads rtu
SET comercializadora_id = c.id
FROM public.comercializadoras c
WHERE c.name = rtu.comercializadora;

-- Puede haber uploads antiguos sin match — dejamos nullable si faltan
-- Pero para futuras inserciones será NOT NULL
ALTER TABLE public.rate_table_uploads
  DROP COLUMN comercializadora;

-- ═══════════════════════════════════════════════════════════════════
-- 5. products: añadir comercializadora_id (nullable para seed)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.products
  ADD COLUMN comercializadora_id BIGINT REFERENCES public.comercializadoras(id) ON DELETE SET NULL;

CREATE INDEX idx_products_comercializadora_id ON public.products(comercializadora_id);

-- Indice parcial unico: no puede haber dos productos iguales de la misma comercializadora
CREATE UNIQUE INDEX idx_products_name_comercializadora
  ON public.products(name, comercializadora_id)
  WHERE comercializadora_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 6. commission_formula_config: campaign_id → comercializadora_id
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.commission_formula_config
  ADD COLUMN comercializadora_id BIGINT REFERENCES public.comercializadoras(id) ON DELETE RESTRICT;

-- No podemos migrar campaign_id → comercializadora_id automaticamente
-- (no hay relacion directa), asi que dejamos los registros existentes con NULL

DROP INDEX IF EXISTS idx_commission_formula_config_campaign;

ALTER TABLE public.commission_formula_config
  DROP COLUMN campaign_id;

CREATE INDEX idx_commission_formula_config_comercializadora
  ON public.commission_formula_config(comercializadora_id);
