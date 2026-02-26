-- ============================================================================
-- GRUPO NEW ENERGY — Fase 6: Sistema de Comisionado
-- Nuevos enums, tablas, columnas, RLS, índices y triggers
-- Pegar en Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════
-- 1. ENUMS
-- ═══════════════════════════════════════════════════════════════════

CREATE TYPE public.commission_gnew_status AS ENUM (
  'no_calculada',
  'cargada_excel',
  'calculada_formula',
  'bloqueada'
);

-- Añadir valor 'retenido' al enum pago_status existente
ALTER TYPE public.pago_status ADD VALUE IF NOT EXISTS 'retenido';

-- ═══════════════════════════════════════════════════════════════════
-- 2. ALTER TABLAS EXISTENTES
-- ═══════════════════════════════════════════════════════════════════

-- 2.1 Añadir status_commission_gnew a contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS status_commission_gnew public.commission_gnew_status
    NOT NULL DEFAULT 'no_calculada';

-- 2.2 Añadir notes a contract_commissions
ALTER TABLE public.contract_commissions
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ═══════════════════════════════════════════════════════════════════
-- 3. NUEVAS TABLAS
-- ═══════════════════════════════════════════════════════════════════

-- 3.1 Configuración de fórmulas de comisión por campaña/producto
CREATE TABLE public.commission_formula_config (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id    BIGINT NOT NULL REFERENCES public.campaigns(id) ON DELETE RESTRICT,
  product_id     BIGINT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  fee_energia    NUMERIC(10,6) NOT NULL DEFAULT 0,
  fee_potencia   NUMERIC(10,6) NOT NULL DEFAULT 0,
  servicio_pct   NUMERIC(5,2) NOT NULL DEFAULT 0,
  version        INT NOT NULL DEFAULT 1,
  active         BOOLEAN NOT NULL DEFAULT true,
  created_by     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2 Log de cálculos de comisión por fórmula
CREATE TABLE public.commission_calculations (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contract_id       UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  formula_config_id BIGINT NOT NULL REFERENCES public.commission_formula_config(id) ON DELETE RESTRICT,
  consumo_used      NUMERIC(12,2),
  potencia_used     NUMERIC(10,4),
  fee_energia_used  NUMERIC(10,6),
  fee_potencia_used NUMERIC(10,6),
  servicio_pct_used NUMERIC(5,2),
  result_amount     NUMERIC(10,4) NOT NULL,
  calculated_by     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.3 Historial de subidas Excel
CREATE TABLE public.commission_uploads (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  file_name    TEXT NOT NULL,
  total_rows   INT NOT NULL DEFAULT 0,
  updated_rows INT NOT NULL DEFAULT 0,
  error_rows   INT NOT NULL DEFAULT 0,
  errors       JSONB,
  uploaded_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- 4. ÍNDICES
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX idx_commission_formula_config_campaign ON public.commission_formula_config(campaign_id);
CREATE INDEX idx_commission_formula_config_product  ON public.commission_formula_config(product_id);
CREATE INDEX idx_commission_formula_config_active   ON public.commission_formula_config(active);

CREATE INDEX idx_commission_calculations_contract ON public.commission_calculations(contract_id);
CREATE INDEX idx_commission_calculations_config   ON public.commission_calculations(formula_config_id);

CREATE INDEX idx_commission_uploads_created_at ON public.commission_uploads(created_at);

CREATE INDEX idx_contracts_status_commission_gnew ON public.contracts(status_commission_gnew);

CREATE INDEX idx_contract_commissions_status_pago ON public.contract_commissions(status_pago);

-- ═══════════════════════════════════════════════════════════════════
-- 5. TRIGGERS
-- ═══════════════════════════════════════════════════════════════════

CREATE TRIGGER set_commission_formula_config_updated_at
  BEFORE UPDATE ON public.commission_formula_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- 6. ACTUALIZAR VIEW contracts_safe
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.contracts_safe AS
SELECT
  id, owner_id, operador_id, campaign_id, product_id,
  su_ref, observaciones, activo, estado, fecha_alta, fecha_baja,
  cups, tarifa, potencia_1, potencia_2, potencia_3,
  potencia_4, potencia_5, potencia_6, media_potencia,
  consumo_anual, direccion, codigo_postal, poblacion, provincia, datos_manuales,
  titular_contrato, cif, nombre_firmante, dni_firmante,
  telefono_1, telefono_2, email_titular, cuenta_bancaria, fecha_firma,
  fecha_entrega_contrato, fecha_cobro_distribuidor,
  status_commission_gnew,
  doc_upload_mode, devolucion_motivo, campos_a_corregir,
  draft_data, created_at, updated_at
FROM public.contracts;

-- ═══════════════════════════════════════════════════════════════════
-- 7. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════

-- 7.1 commission_formula_config — solo ADMIN
ALTER TABLE public.commission_formula_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY commission_formula_config_select ON public.commission_formula_config
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'ADMIN'
  );

CREATE POLICY commission_formula_config_insert ON public.commission_formula_config
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) = 'ADMIN'
  );

CREATE POLICY commission_formula_config_update ON public.commission_formula_config
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) = 'ADMIN'
  );

-- 7.2 commission_calculations — solo ADMIN
ALTER TABLE public.commission_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY commission_calculations_select ON public.commission_calculations
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'ADMIN'
  );

CREATE POLICY commission_calculations_insert ON public.commission_calculations
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) = 'ADMIN'
  );

-- 7.3 commission_uploads — solo ADMIN
ALTER TABLE public.commission_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY commission_uploads_select ON public.commission_uploads
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'ADMIN'
  );

CREATE POLICY commission_uploads_insert ON public.commission_uploads
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) = 'ADMIN'
  );
