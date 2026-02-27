-- ============================================================================
-- GRUPO NEW ENERGY — Motor de Comisiones v2
-- Nuevas tablas: energy_companies, energy_products, commission_rates,
-- formula_configs, formula_fee_options, commission_tiers,
-- user_commission_overrides
-- ALTER: contracts, contract_commissions, profiles
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════
-- 1. ENUMS
-- ═══════════════════════════════════════════════════════════════════

CREATE TYPE public.commission_model AS ENUM ('table', 'formula');
CREATE TYPE public.pricing_type AS ENUM ('indexado', 'fijo');
CREATE TYPE public.potencia_calc_method AS ENUM ('sum_periods', 'average');
CREATE TYPE public.override_type AS ENUM ('percentage', 'fixed');
CREATE TYPE public.fee_type AS ENUM ('energia', 'potencia');

-- ═══════════════════════════════════════════════════════════════════
-- 2. TABLAS NUEVAS
-- ═══════════════════════════════════════════════════════════════════

-- 2.1 Comercializadoras de energía
CREATE TABLE public.energy_companies (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name              VARCHAR(100) NOT NULL UNIQUE,
  commission_model  public.commission_model NOT NULL DEFAULT 'table',
  gnew_margin_pct   NUMERIC(5,4) NOT NULL DEFAULT 0,
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 Productos de energía
CREATE TABLE public.energy_products (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id        BIGINT NOT NULL REFERENCES public.energy_companies(id) ON DELETE CASCADE,
  name              VARCHAR(100) NOT NULL,
  fee_value         NUMERIC(10,4),
  fee_label         VARCHAR(50),
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, name, fee_value)
);

-- 2.3 Comisiones por tabla (modelo TABLE)
CREATE TABLE public.commission_rates (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id        BIGINT NOT NULL REFERENCES public.energy_products(id) ON DELETE CASCADE,
  tariff            VARCHAR(20) NOT NULL,
  consumption_min   INTEGER NOT NULL,
  consumption_max   INTEGER NOT NULL,
  gross_amount      NUMERIC(10,2) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, tariff, consumption_min, consumption_max),
  CHECK (consumption_max >= consumption_min)
);

-- 2.4 Configuración de fórmula por producto (modelo FORMULA)
CREATE TABLE public.formula_configs (
  id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id              BIGINT NOT NULL UNIQUE REFERENCES public.energy_products(id) ON DELETE CASCADE,
  pricing_type            public.pricing_type NOT NULL DEFAULT 'indexado',
  -- Componente ENERGÍA
  fee_energia             NUMERIC(10,6),
  fee_energia_fijo        NUMERIC(10,6),
  margen_intermediacion   NUMERIC(10,6) NOT NULL DEFAULT 0,
  -- Componente POTENCIA
  fee_potencia            NUMERIC(10,4),
  potencia_calc_method    public.potencia_calc_method NOT NULL DEFAULT 'sum_periods',
  -- Componente SERVICIO
  comision_servicio       NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Factores de ajuste
  factor_potencia         NUMERIC(5,4) NOT NULL DEFAULT 1.0000,
  factor_energia          NUMERIC(5,4) NOT NULL DEFAULT 1.0000,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.5 Opciones seleccionables de fee
CREATE TABLE public.formula_fee_options (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  formula_config_id     BIGINT NOT NULL REFERENCES public.formula_configs(id) ON DELETE CASCADE,
  fee_type              public.fee_type NOT NULL,
  value                 NUMERIC(10,6) NOT NULL,
  label                 VARCHAR(50),
  sort_order            INTEGER NOT NULL DEFAULT 0,
  UNIQUE(formula_config_id, fee_type, value)
);

-- 2.6 Comisionados (tiers)
CREATE TABLE public.commission_tiers (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name              VARCHAR(50) NOT NULL UNIQUE,
  rate_pct          NUMERIC(5,4),
  sort_order        INTEGER NOT NULL DEFAULT 0
);

-- 2.7 Overrides de comisión por usuario
CREATE TABLE public.user_commission_overrides (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id        BIGINT REFERENCES public.energy_products(id) ON DELETE CASCADE,
  override_type     public.override_type NOT NULL,
  override_value    NUMERIC(10,4) NOT NULL,
  set_by_user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- ═══════════════════════════════════════════════════════════════════
-- 3. ALTER TABLAS EXISTENTES
-- ═══════════════════════════════════════════════════════════════════

-- 3.1 profiles: añadir commission_tier_id
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS commission_tier_id BIGINT REFERENCES public.commission_tiers(id) ON DELETE SET NULL;

-- 3.2 contracts: añadir campos de comisión v2
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS energy_company_id BIGINT REFERENCES public.energy_companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS energy_product_id BIGINT REFERENCES public.energy_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS selected_fee_energia NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS selected_fee_potencia NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS gross_commission NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS gnew_margin NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS payout_partner_base NUMERIC(10,2);

-- 3.3 contract_commissions: añadir campos v2
ALTER TABLE public.contract_commissions
  ADD COLUMN IF NOT EXISTS tier_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS rate_applied NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS is_differential BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS differential_from_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 4. MIGRAR datos de comercializadoras → energy_companies
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO public.energy_companies (name)
SELECT name FROM public.comercializadoras
WHERE active = true
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- 5. ACTUALIZAR VIEW contracts_safe
-- ═══════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS public.contracts_safe;

CREATE VIEW public.contracts_safe AS
SELECT
  id, owner_id, operador_id, campaign_id, product_id,
  energy_company_id, energy_product_id,
  su_ref, observaciones, activo, estado, fecha_alta, fecha_baja,
  cups, tarifa, potencia_1, potencia_2, potencia_3,
  potencia_4, potencia_5, potencia_6, media_potencia,
  consumo_anual, direccion, codigo_postal, poblacion, provincia, datos_manuales,
  titular_contrato, cif, nombre_firmante, dni_firmante,
  telefono_1, telefono_2, email_titular, cuenta_bancaria, fecha_firma,
  fecha_entrega_contrato, fecha_cobro_distribuidor,
  status_commission_gnew,
  selected_fee_energia, selected_fee_potencia,
  doc_upload_mode, devolucion_motivo, campos_a_corregir,
  draft_data, created_at, updated_at
FROM public.contracts;

-- ═══════════════════════════════════════════════════════════════════
-- 6. ÍNDICES
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX idx_energy_companies_active ON public.energy_companies(active);

CREATE INDEX idx_energy_products_company ON public.energy_products(company_id, active);

CREATE INDEX idx_commission_rates_lookup ON public.commission_rates(product_id, tariff, consumption_min, consumption_max);

CREATE INDEX idx_formula_configs_product ON public.formula_configs(product_id);

CREATE INDEX idx_formula_fee_options_config ON public.formula_fee_options(formula_config_id, fee_type);

CREATE INDEX idx_user_commission_overrides_user ON public.user_commission_overrides(user_id, product_id);

CREATE INDEX idx_contracts_energy_company ON public.contracts(energy_company_id);
CREATE INDEX idx_contracts_energy_product ON public.contracts(energy_product_id);

CREATE INDEX idx_cc_is_differential ON public.contract_commissions(is_differential);

CREATE INDEX idx_profiles_commission_tier ON public.profiles(commission_tier_id);

-- ═══════════════════════════════════════════════════════════════════
-- 7. TRIGGERS
-- ═══════════════════════════════════════════════════════════════════

CREATE TRIGGER set_energy_companies_updated_at
  BEFORE UPDATE ON public.energy_companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_energy_products_updated_at
  BEFORE UPDATE ON public.energy_products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_commission_rates_updated_at
  BEFORE UPDATE ON public.commission_rates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_formula_configs_updated_at
  BEFORE UPDATE ON public.formula_configs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_user_commission_overrides_updated_at
  BEFORE UPDATE ON public.user_commission_overrides
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- 8. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════

-- 8.1 energy_companies — todos pueden leer (necesitan ver en formulario), solo ADMIN muta
ALTER TABLE public.energy_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY energy_companies_select ON public.energy_companies
  FOR SELECT USING (true);

CREATE POLICY energy_companies_insert ON public.energy_companies
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY energy_companies_update ON public.energy_companies
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'ADMIN');

-- 8.2 energy_products — todos pueden leer, solo ADMIN muta
ALTER TABLE public.energy_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY energy_products_select ON public.energy_products
  FOR SELECT USING (true);

CREATE POLICY energy_products_insert ON public.energy_products
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY energy_products_update ON public.energy_products
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'ADMIN');

-- 8.3 commission_rates — solo ADMIN
ALTER TABLE public.commission_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY commission_rates_select ON public.commission_rates
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY commission_rates_insert ON public.commission_rates
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY commission_rates_update ON public.commission_rates
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'ADMIN');

-- 8.4 formula_configs — solo ADMIN puede editar, todos leen (necesario para formulario)
ALTER TABLE public.formula_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY formula_configs_select ON public.formula_configs
  FOR SELECT USING (true);

CREATE POLICY formula_configs_insert ON public.formula_configs
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY formula_configs_update ON public.formula_configs
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'ADMIN');

-- 8.5 formula_fee_options — todos leen (formulario), solo ADMIN muta
ALTER TABLE public.formula_fee_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY formula_fee_options_select ON public.formula_fee_options
  FOR SELECT USING (true);

CREATE POLICY formula_fee_options_insert ON public.formula_fee_options
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY formula_fee_options_update ON public.formula_fee_options
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY formula_fee_options_delete ON public.formula_fee_options
  FOR DELETE USING (public.get_user_role(auth.uid()) = 'ADMIN');

-- 8.6 commission_tiers — todos leen, solo ADMIN muta
ALTER TABLE public.commission_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY commission_tiers_select ON public.commission_tiers
  FOR SELECT USING (true);

CREATE POLICY commission_tiers_insert ON public.commission_tiers
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY commission_tiers_update ON public.commission_tiers
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'ADMIN');

-- 8.7 user_commission_overrides — usuario ve las suyas + descendientes, ADMIN/BO todas
ALTER TABLE public.user_commission_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY uco_select ON public.user_commission_overrides
  FOR SELECT USING (
    user_id = auth.uid()
    OR set_by_user_id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('ADMIN', 'BACKOFFICE')
    OR public.is_descendant_of(user_id, auth.uid())
  );

CREATE POLICY uco_insert ON public.user_commission_overrides
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) IN ('ADMIN', 'BACKOFFICE')
    OR public.is_descendant_of(user_id, auth.uid())
  );

CREATE POLICY uco_update ON public.user_commission_overrides
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) IN ('ADMIN', 'BACKOFFICE')
    OR set_by_user_id = auth.uid()
  );

-- ═══════════════════════════════════════════════════════════════════
-- 9. SEED: Commission Tiers
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO public.commission_tiers (name, rate_pct, sort_order) VALUES
  ('PARTNER',       1.0000, 1),
  ('MASTER',        0.9500, 2),
  ('DISTRIBUIDOR',  0.8500, 3),
  ('EXCLUSIVE',     1.1000, 4),
  ('VIP',           NULL,   5);
