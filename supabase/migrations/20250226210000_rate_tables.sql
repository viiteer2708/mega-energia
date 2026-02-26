-- ============================================================================
-- GRUPO NEW ENERGY — Fase 7: Tablas de comisiones por rangos
-- rate_tables, rate_table_sheets, rate_table_offers, rate_table_rates,
-- rate_table_uploads
-- Pegar en Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════
-- 1. TABLAS
-- ═══════════════════════════════════════════════════════════════════

-- 1.1 Tabla principal — una por comercializadora+versión
CREATE TABLE public.rate_tables (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  comercializadora TEXT NOT NULL,
  version         INT NOT NULL DEFAULT 1,
  active          BOOLEAN NOT NULL DEFAULT true,
  notes           TEXT,
  uploaded_by     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 Hojas — una por tarifa de acceso dentro de cada rate_table
CREATE TABLE public.rate_table_sheets (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rate_table_id   BIGINT NOT NULL REFERENCES public.rate_tables(id) ON DELETE CASCADE,
  tarifa          TEXT NOT NULL,
  UNIQUE (rate_table_id, tarifa)
);

-- 1.3 Ofertas — columnas dinámicas dentro de cada hoja
CREATE TABLE public.rate_table_offers (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sheet_id        BIGINT NOT NULL REFERENCES public.rate_table_sheets(id) ON DELETE CASCADE,
  offer_name      TEXT NOT NULL,
  fee             NUMERIC(10,4),
  sort_order      INT NOT NULL DEFAULT 0,
  UNIQUE (sheet_id, offer_name)
);

-- 1.4 Rangos de consumo — filas de comisión por rango kWh
CREATE TABLE public.rate_table_rates (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  offer_id        BIGINT NOT NULL REFERENCES public.rate_table_offers(id) ON DELETE CASCADE,
  kwh_from        NUMERIC(12,2) NOT NULL,
  kwh_to          NUMERIC(12,2) NOT NULL,
  commission      NUMERIC(10,4) NOT NULL,
  CHECK (kwh_to >= kwh_from)
);

-- 1.5 Log de subidas de tablas de rangos
CREATE TABLE public.rate_table_uploads (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rate_table_id   BIGINT NOT NULL REFERENCES public.rate_tables(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  comercializadora TEXT NOT NULL,
  totals          JSONB,
  errors          JSONB,
  uploaded_by     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- 2. ÍNDICES
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX idx_rate_tables_comercializadora ON public.rate_tables(comercializadora);
CREATE INDEX idx_rate_tables_active           ON public.rate_tables(active);

CREATE INDEX idx_rate_table_sheets_rate_table ON public.rate_table_sheets(rate_table_id);

CREATE INDEX idx_rate_table_offers_sheet      ON public.rate_table_offers(sheet_id);

CREATE INDEX idx_rate_table_rates_offer       ON public.rate_table_rates(offer_id);
CREATE INDEX idx_rate_table_rates_range       ON public.rate_table_rates(kwh_from, kwh_to);

CREATE INDEX idx_rate_table_uploads_rate_table ON public.rate_table_uploads(rate_table_id);
CREATE INDEX idx_rate_table_uploads_created_at ON public.rate_table_uploads(created_at);

-- ═══════════════════════════════════════════════════════════════════
-- 3. TRIGGERS
-- ═══════════════════════════════════════════════════════════════════

CREATE TRIGGER set_rate_tables_updated_at
  BEFORE UPDATE ON public.rate_tables
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- 4. ROW LEVEL SECURITY — solo ADMIN
-- ═══════════════════════════════════════════════════════════════════

-- 4.1 rate_tables
ALTER TABLE public.rate_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_tables_select ON public.rate_tables
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY rate_tables_insert ON public.rate_tables
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY rate_tables_update ON public.rate_tables
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'ADMIN');

-- 4.2 rate_table_sheets
ALTER TABLE public.rate_table_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_table_sheets_select ON public.rate_table_sheets
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY rate_table_sheets_insert ON public.rate_table_sheets
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'ADMIN');

-- 4.3 rate_table_offers
ALTER TABLE public.rate_table_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_table_offers_select ON public.rate_table_offers
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY rate_table_offers_insert ON public.rate_table_offers
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'ADMIN');

-- 4.4 rate_table_rates
ALTER TABLE public.rate_table_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_table_rates_select ON public.rate_table_rates
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY rate_table_rates_insert ON public.rate_table_rates
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'ADMIN');

-- 4.5 rate_table_uploads
ALTER TABLE public.rate_table_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_table_uploads_select ON public.rate_table_uploads
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY rate_table_uploads_insert ON public.rate_table_uploads
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'ADMIN');
