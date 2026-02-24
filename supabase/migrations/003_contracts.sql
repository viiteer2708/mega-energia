-- ============================================================================
-- GRUPO NEW ENERGY — Fase 3: Módulo de Contratos
-- Tablas, enums, RLS, funciones, triggers e índices
-- Pegar en Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════
-- 1. ENUMS
-- ═══════════════════════════════════════════════════════════════════

CREATE TYPE public.contract_estado AS ENUM (
  'borrador',
  'pendiente_validacion',
  'pendiente_aceptacion',
  'tramitado',
  'no_tramitado',
  'futura_activacion',
  'pendiente_instalacion',
  'pendiente_renovar',
  'ok',
  'incidencia',
  'devuelto',
  'ko',
  'baja',
  'aviso_baja'
);

CREATE TYPE public.doc_tipo AS ENUM (
  'factura',
  'dni',
  'cif',
  'escrituras',
  'contrato_firmado'
);

CREATE TYPE public.pago_status AS ENUM (
  'pendiente',
  'pagado',
  'anulado'
);

CREATE TYPE public.product_tipo AS ENUM (
  'luz_hogar',
  'luz_empresa',
  'gas_hogar',
  'gas_empresa',
  'dual'
);

-- ═══════════════════════════════════════════════════════════════════
-- 2. TABLAS
-- ═══════════════════════════════════════════════════════════════════

-- 2.1 Campañas
CREATE TABLE public.campaigns (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 Productos
CREATE TABLE public.products (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL,
  type       public.product_tipo NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 Contratos (tabla principal)
CREATE TABLE public.contracts (
  -- ── Bloque A: Datos comerciales ──
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  operador_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  campaign_id     BIGINT REFERENCES public.campaigns(id) ON DELETE SET NULL,
  product_id      BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
  su_ref          TEXT,
  observaciones   TEXT,
  activo          BOOLEAN NOT NULL DEFAULT true,
  estado          public.contract_estado NOT NULL DEFAULT 'borrador',
  fecha_alta      DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_baja      DATE,

  -- ── Bloque B: Datos de suministro ──
  cups            TEXT,
  tarifa          TEXT,
  potencia_1      NUMERIC(10,4),
  potencia_2      NUMERIC(10,4),
  potencia_3      NUMERIC(10,4),
  potencia_4      NUMERIC(10,4),
  potencia_5      NUMERIC(10,4),
  potencia_6      NUMERIC(10,4),
  media_potencia  NUMERIC(10,4) GENERATED ALWAYS AS (
    COALESCE(potencia_1, 0) + COALESCE(potencia_2, 0) + COALESCE(potencia_3, 0) +
    COALESCE(potencia_4, 0) + COALESCE(potencia_5, 0) + COALESCE(potencia_6, 0)
  ) / NULLIF(
    (CASE WHEN potencia_1 IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN potencia_2 IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN potencia_3 IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN potencia_4 IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN potencia_5 IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN potencia_6 IS NOT NULL THEN 1 ELSE 0 END), 0
  ) STORED,
  consumo_anual   NUMERIC(12,2),
  direccion       TEXT,
  codigo_postal   TEXT,
  poblacion       TEXT,
  provincia       TEXT,
  datos_manuales  BOOLEAN NOT NULL DEFAULT false,

  -- ── Bloque C: Datos del titular ──
  titular_contrato TEXT,
  cif              TEXT,
  nombre_firmante  TEXT,
  dni_firmante     TEXT,
  telefono_1       TEXT,
  telefono_2       TEXT,
  email_titular    TEXT,
  cuenta_bancaria  TEXT,
  fecha_firma      DATE,

  -- ── Bloque D: Fechas de gestión ──
  fecha_entrega_contrato DATE,
  fecha_cobro_distribuidor DATE,

  -- ── Bloque E.1: Comisiones GNE (solo visible ADMIN) ──
  commission_gnew   NUMERIC(10,4) NOT NULL DEFAULT 0,
  decomission_gnew  NUMERIC(10,4) NOT NULL DEFAULT 0,
  beneficio         NUMERIC(10,4) GENERATED ALWAYS AS (
    commission_gnew - decomission_gnew
  ) STORED,

  -- ── Devolución (campos a corregir + motivo) ──
  devolucion_motivo    TEXT,
  campos_a_corregir    JSONB, -- string[] con nombres de campo

  -- ── Auto-guardado borrador ──
  draft_data JSONB,

  -- ── Meta ──
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 Comisiones por usuario
CREATE TABLE public.contract_commissions (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contract_id     UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  commission_paid NUMERIC(10,4) NOT NULL DEFAULT 0,
  decomission     NUMERIC(10,4) NOT NULL DEFAULT 0,
  status_pago     public.pago_status NOT NULL DEFAULT 'pendiente',
  fecha_pago      DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contract_id, user_id)
);

-- 2.5 Documentos adjuntos
CREATE TABLE public.contract_documents (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  tipo_doc    public.doc_tipo NOT NULL,
  file_path   TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_size   BIGINT NOT NULL DEFAULT 0,
  mime_type   TEXT NOT NULL DEFAULT 'application/octet-stream',
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.6 Transiciones de estado permitidas por rol
CREATE TABLE public.state_transitions (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role       public.app_role NOT NULL,
  from_state public.contract_estado NOT NULL,
  to_state   public.contract_estado NOT NULL,
  UNIQUE(role, from_state, to_state)
);

-- 2.7 Log de cambios de estado
CREATE TABLE public.contract_state_log (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contract_id      UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  from_state       public.contract_estado,
  to_state         public.contract_estado NOT NULL,
  changed_by       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  motivo           TEXT,
  campos_devueltos JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.8 Log de auditoría general
CREATE TABLE public.audit_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  details     JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- 3. ÍNDICES
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX idx_contracts_owner_id    ON public.contracts(owner_id);
CREATE INDEX idx_contracts_operador_id ON public.contracts(operador_id);
CREATE INDEX idx_contracts_estado      ON public.contracts(estado);
CREATE INDEX idx_contracts_cups        ON public.contracts(cups);
CREATE INDEX idx_contracts_dni         ON public.contracts(dni_firmante);
CREATE INDEX idx_contracts_fecha_alta  ON public.contracts(fecha_alta);

CREATE INDEX idx_contract_commissions_contract ON public.contract_commissions(contract_id);
CREATE INDEX idx_contract_commissions_user     ON public.contract_commissions(user_id);

CREATE INDEX idx_contract_documents_contract ON public.contract_documents(contract_id);

CREATE INDEX idx_contract_state_log_contract ON public.contract_state_log(contract_id);

CREATE INDEX idx_audit_log_contract   ON public.audit_log(contract_id);
CREATE INDEX idx_audit_log_user       ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at);

-- ═══════════════════════════════════════════════════════════════════
-- 4. VIEW DE SEGURIDAD (sin comisiones GNE)
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
  devolucion_motivo, campos_a_corregir,
  draft_data, created_at, updated_at
FROM public.contracts;

-- ═══════════════════════════════════════════════════════════════════
-- 5. TRIGGERS
-- ═══════════════════════════════════════════════════════════════════

-- Reusar handle_updated_at() de 001_schema.sql
CREATE TRIGGER set_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_contract_commissions_updated_at
  BEFORE UPDATE ON public.contract_commissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- 6. FUNCIONES
-- ═══════════════════════════════════════════════════════════════════

-- 6.1 Validar transición de estado
CREATE OR REPLACE FUNCTION public.can_transition(
  p_role public.app_role,
  p_from public.contract_estado,
  p_to   public.contract_estado
)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.state_transitions
    WHERE role = p_role AND from_state = p_from AND to_state = p_to
  );
$$;

-- 6.2 Cambiar estado de contrato (con log)
CREATE OR REPLACE FUNCTION public.change_contract_state(
  p_contract_id UUID,
  p_new_state   public.contract_estado,
  p_changed_by  UUID,
  p_motivo      TEXT DEFAULT NULL,
  p_campos      JSONB DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_state public.contract_estado;
  v_role public.app_role;
BEGIN
  SELECT estado INTO v_current_state FROM public.contracts WHERE id = p_contract_id;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = p_changed_by;

  -- ADMIN puede hacer cualquier transición
  IF v_role != 'ADMIN' THEN
    IF NOT public.can_transition(v_role, v_current_state, p_new_state) THEN
      RETURN false;
    END IF;
  END IF;

  UPDATE public.contracts SET estado = p_new_state WHERE id = p_contract_id;

  INSERT INTO public.contract_state_log (contract_id, from_state, to_state, changed_by, motivo, campos_devueltos)
  VALUES (p_contract_id, v_current_state, p_new_state, p_changed_by, p_motivo, p_campos);

  RETURN true;
END;
$$;

-- 6.3 Registrar auditoría
CREATE OR REPLACE FUNCTION public.log_audit(
  p_contract_id UUID,
  p_user_id     UUID,
  p_action      TEXT,
  p_details     JSONB DEFAULT NULL,
  p_ip          INET DEFAULT NULL,
  p_ua          TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.audit_log (contract_id, user_id, action, details, ip_address, user_agent)
  VALUES (p_contract_id, p_user_id, p_action, p_details, p_ip, p_ua);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 7. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════

-- 7.1 contracts
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contracts_select ON public.contracts
  FOR SELECT USING (
    owner_id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('ADMIN', 'BACKOFFICE')
    OR public.is_descendant_of(owner_id, auth.uid())
  );

CREATE POLICY contracts_insert ON public.contracts
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('ADMIN', 'BACKOFFICE')
  );

CREATE POLICY contracts_update ON public.contracts
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('ADMIN', 'BACKOFFICE')
    OR public.is_descendant_of(owner_id, auth.uid())
  );

-- 7.2 contract_commissions
ALTER TABLE public.contract_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_commissions_select ON public.contract_commissions
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('ADMIN', 'BACKOFFICE')
    OR public.is_descendant_of(user_id, auth.uid())
  );

CREATE POLICY contract_commissions_insert ON public.contract_commissions
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) IN ('ADMIN', 'BACKOFFICE')
  );

CREATE POLICY contract_commissions_update ON public.contract_commissions
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) IN ('ADMIN', 'BACKOFFICE')
  );

-- 7.3 contract_documents
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_documents_select ON public.contract_documents
  FOR SELECT USING (
    uploaded_by = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('ADMIN', 'BACKOFFICE')
    OR EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id AND (
        c.owner_id = auth.uid()
        OR public.is_descendant_of(c.owner_id, auth.uid())
      )
    )
  );

CREATE POLICY contract_documents_insert ON public.contract_documents
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('ADMIN', 'BACKOFFICE')
  );

CREATE POLICY contract_documents_delete ON public.contract_documents
  FOR DELETE USING (
    uploaded_by = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('ADMIN', 'BACKOFFICE')
  );

-- 7.4 state_transitions
ALTER TABLE public.state_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY state_transitions_select ON public.state_transitions
  FOR SELECT USING (true);

CREATE POLICY state_transitions_mutate ON public.state_transitions
  FOR ALL USING (
    public.get_user_role(auth.uid()) = 'ADMIN'
  );

-- 7.5 contract_state_log
ALTER TABLE public.contract_state_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY contract_state_log_select ON public.contract_state_log
  FOR SELECT USING (
    public.get_user_role(auth.uid()) IN ('ADMIN', 'BACKOFFICE')
    OR EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id AND (
        c.owner_id = auth.uid()
        OR public.is_descendant_of(c.owner_id, auth.uid())
      )
    )
  );

CREATE POLICY contract_state_log_insert ON public.contract_state_log
  FOR INSERT WITH CHECK (true);

-- 7.6 audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_select ON public.audit_log
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'ADMIN'
  );

CREATE POLICY audit_log_insert ON public.audit_log
  FOR INSERT WITH CHECK (true);

-- 7.7 campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaigns_select ON public.campaigns
  FOR SELECT USING (true);

CREATE POLICY campaigns_mutate ON public.campaigns
  FOR ALL USING (
    public.get_user_role(auth.uid()) IN ('ADMIN', 'BACKOFFICE')
  );

-- 7.8 products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_select ON public.products
  FOR SELECT USING (true);

CREATE POLICY products_mutate ON public.products
  FOR ALL USING (
    public.get_user_role(auth.uid()) IN ('ADMIN', 'BACKOFFICE')
  );

-- ═══════════════════════════════════════════════════════════════════
-- 8. SEED: Transiciones de estado permitidas
-- ═══════════════════════════════════════════════════════════════════

-- ── Nuevas transiciones del flujo de entrada ──
-- Creador/Owner: borrador → pendiente_validacion (con campos completos + docs)
-- Creador/Owner: devuelto → pendiente_validacion (tras corregir campos)
-- Creador/Owner: devuelto → borrador (sin condiciones)
INSERT INTO public.state_transitions (role, from_state, to_state) VALUES
  ('COMERCIAL', 'borrador', 'pendiente_validacion'),
  ('COMERCIAL', 'devuelto', 'pendiente_validacion'),
  ('COMERCIAL', 'devuelto', 'borrador'),
  ('CANAL', 'borrador', 'pendiente_validacion'),
  ('CANAL', 'devuelto', 'pendiente_validacion'),
  ('CANAL', 'devuelto', 'borrador'),
  ('KAM', 'borrador', 'pendiente_validacion'),
  ('KAM', 'devuelto', 'pendiente_validacion'),
  ('KAM', 'devuelto', 'borrador'),
  ('DIRECTOR', 'borrador', 'pendiente_validacion'),
  ('DIRECTOR', 'devuelto', 'pendiente_validacion'),
  ('DIRECTOR', 'devuelto', 'borrador');

-- BACKOFFICE: validación, devolución, gestión completa
INSERT INTO public.state_transitions (role, from_state, to_state) VALUES
  ('BACKOFFICE', 'pendiente_validacion', 'tramitado'),
  ('BACKOFFICE', 'pendiente_validacion', 'devuelto'),
  ('BACKOFFICE', 'pendiente_validacion', 'ko'),
  -- Transiciones existentes entre estados operativos (no se modifican)
  ('BACKOFFICE', 'tramitado', 'pendiente_aceptacion'),
  ('BACKOFFICE', 'tramitado', 'no_tramitado'),
  ('BACKOFFICE', 'pendiente_aceptacion', 'futura_activacion'),
  ('BACKOFFICE', 'pendiente_aceptacion', 'ko'),
  ('BACKOFFICE', 'futura_activacion', 'pendiente_instalacion'),
  ('BACKOFFICE', 'futura_activacion', 'ok'),
  ('BACKOFFICE', 'pendiente_instalacion', 'ok'),
  ('BACKOFFICE', 'ok', 'pendiente_renovar'),
  ('BACKOFFICE', 'ok', 'incidencia'),
  ('BACKOFFICE', 'ok', 'aviso_baja'),
  ('BACKOFFICE', 'incidencia', 'ok'),
  ('BACKOFFICE', 'aviso_baja', 'baja'),
  ('BACKOFFICE', 'aviso_baja', 'ok');

-- ADMIN: bypass en función, pero seed para referencia UI
INSERT INTO public.state_transitions (role, from_state, to_state) VALUES
  ('ADMIN', 'borrador', 'pendiente_validacion'),
  ('ADMIN', 'pendiente_validacion', 'tramitado'),
  ('ADMIN', 'pendiente_validacion', 'devuelto'),
  ('ADMIN', 'pendiente_validacion', 'ko'),
  ('ADMIN', 'devuelto', 'pendiente_validacion'),
  ('ADMIN', 'devuelto', 'borrador'),
  ('ADMIN', 'tramitado', 'pendiente_aceptacion'),
  ('ADMIN', 'tramitado', 'no_tramitado'),
  ('ADMIN', 'pendiente_aceptacion', 'futura_activacion'),
  ('ADMIN', 'pendiente_aceptacion', 'ko'),
  ('ADMIN', 'futura_activacion', 'pendiente_instalacion'),
  ('ADMIN', 'futura_activacion', 'ok'),
  ('ADMIN', 'pendiente_instalacion', 'ok'),
  ('ADMIN', 'ok', 'pendiente_renovar'),
  ('ADMIN', 'ok', 'incidencia'),
  ('ADMIN', 'ok', 'aviso_baja'),
  ('ADMIN', 'incidencia', 'ok'),
  ('ADMIN', 'aviso_baja', 'baja'),
  ('ADMIN', 'aviso_baja', 'ok'),
  ('ADMIN', 'ko', 'borrador');

-- ═══════════════════════════════════════════════════════════════════
-- 9. SEED: Productos iniciales
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO public.products (name, type) VALUES
  ('Luz Hogar',    'luz_hogar'),
  ('Luz Empresa',  'luz_empresa'),
  ('Gas Hogar',    'gas_hogar'),
  ('Gas Empresa',  'gas_empresa'),
  ('Dual',         'dual');

-- ═══════════════════════════════════════════════════════════════════
-- 10. STORAGE BUCKET (ejecutar por separado si falla en SQL Editor)
-- ═══════════════════════════════════════════════════════════════════

-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'contract-documents',
--   'contract-documents',
--   false,
--   10485760, -- 10MB
--   ARRAY['application/pdf', 'image/jpeg', 'image/png']
-- );
