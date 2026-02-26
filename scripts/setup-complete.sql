-- ============================================================================
-- SETUP COMPLETO: Todo lo que falta tras crear app_role + profiles
-- Pegar en Supabase Dashboard > SQL Editor > Run
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════
-- 001: Índices, funciones, RLS y triggers de profiles
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_profiles_parent_id ON public.profiles(parent_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role      ON public.profiles(role);

-- Funciones recursivas de jerarquía
CREATE OR REPLACE FUNCTION public.get_descendants(root_id UUID)
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH RECURSIVE tree AS (
    SELECT id FROM public.profiles WHERE parent_id = root_id
    UNION ALL
    SELECT p.id FROM public.profiles p INNER JOIN tree t ON p.parent_id = t.id
  )
  SELECT id FROM tree;
$$;

CREATE OR REPLACE FUNCTION public.is_descendant_of(child_id UUID, ancestor_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT child_id IN (SELECT public.get_descendants(ancestor_id));
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- RLS profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_select' AND tablename = 'profiles') THEN
    CREATE POLICY profiles_select ON public.profiles
      FOR SELECT USING (
        id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('ADMIN', 'BACKOFFICE')
        OR public.is_descendant_of(id, auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_update_own' AND tablename = 'profiles') THEN
    CREATE POLICY profiles_update_own ON public.profiles
      FOR UPDATE USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- Trigger: crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'COMERCIAL')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: updated_at automático
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- 002: Expansión de profiles + invoice_counters
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_name         TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_nif          TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_address      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_postal_code  TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_city         TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_iban         TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_retention_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_vat_pct      NUMERIC(5,2) NOT NULL DEFAULT 21;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS alias                TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS commercial_nif       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS commercial_address   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS commercial_postal_code TEXT NOT NULL DEFAULT '';

-- commission_type con CHECK (solo si no existe)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='commission_type') THEN
    ALTER TABLE public.profiles ADD COLUMN commission_type TEXT NOT NULL DEFAULT 'otro'
      CHECK (commission_type IN ('partner', 'master', 'distribuidor', 'otro'));
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_personal      NUMERIC(8,4) NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS wallet_family        NUMERIC(8,4) NOT NULL DEFAULT 0.5;

CREATE TABLE IF NOT EXISTS public.invoice_counters (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year        INT NOT NULL,
  last_number INT NOT NULL DEFAULT 0,
  UNIQUE(user_id, year)
);

ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'invoice_counters_select' AND tablename = 'invoice_counters') THEN
    CREATE POLICY invoice_counters_select ON public.invoice_counters
      FOR SELECT USING (
        user_id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('ADMIN', 'BACKOFFICE')
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.next_invoice_number(p_user_id UUID, p_year INT)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_next INT;
BEGIN
  INSERT INTO public.invoice_counters (user_id, year, last_number)
  VALUES (p_user_id, p_year, 1)
  ON CONFLICT (user_id, year)
  DO UPDATE SET last_number = invoice_counters.last_number + 1
  RETURNING last_number INTO v_next;
  RETURN v_next;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 003: Contratos (enums, tablas, RLS, funciones, seed)
-- ═══════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_estado') THEN
    CREATE TYPE public.contract_estado AS ENUM (
      'borrador','pendiente_validacion','pendiente_aceptacion',
      'tramitado','no_tramitado','futura_activacion',
      'pendiente_instalacion','pendiente_renovar',
      'ok','incidencia','devuelto','ko','baja','aviso_baja'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doc_tipo') THEN
    CREATE TYPE public.doc_tipo AS ENUM (
      'factura','dni','cif','escrituras','contrato_firmado','documentacion_completa'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pago_status') THEN
    CREATE TYPE public.pago_status AS ENUM ('pendiente','pagado','anulado');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_tipo') THEN
    CREATE TYPE public.product_tipo AS ENUM ('luz_hogar','luz_empresa','gas_hogar','gas_empresa','dual');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.campaigns (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL, type public.product_tipo NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  operador_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  campaign_id BIGINT REFERENCES public.campaigns(id) ON DELETE SET NULL,
  product_id BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
  su_ref TEXT, observaciones TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  estado public.contract_estado NOT NULL DEFAULT 'borrador',
  fecha_alta DATE NOT NULL DEFAULT CURRENT_DATE, fecha_baja DATE,
  cups TEXT, tarifa TEXT,
  potencia_1 NUMERIC(10,4), potencia_2 NUMERIC(10,4), potencia_3 NUMERIC(10,4),
  potencia_4 NUMERIC(10,4), potencia_5 NUMERIC(10,4), potencia_6 NUMERIC(10,4),
  media_potencia NUMERIC(10,4) GENERATED ALWAYS AS (
    (COALESCE(potencia_1,0)+COALESCE(potencia_2,0)+COALESCE(potencia_3,0)+
     COALESCE(potencia_4,0)+COALESCE(potencia_5,0)+COALESCE(potencia_6,0))
    / NULLIF(
      (CASE WHEN potencia_1 IS NOT NULL THEN 1 ELSE 0 END+
       CASE WHEN potencia_2 IS NOT NULL THEN 1 ELSE 0 END+
       CASE WHEN potencia_3 IS NOT NULL THEN 1 ELSE 0 END+
       CASE WHEN potencia_4 IS NOT NULL THEN 1 ELSE 0 END+
       CASE WHEN potencia_5 IS NOT NULL THEN 1 ELSE 0 END+
       CASE WHEN potencia_6 IS NOT NULL THEN 1 ELSE 0 END),0)
  ) STORED,
  consumo_anual NUMERIC(12,2),
  direccion TEXT, codigo_postal TEXT, poblacion TEXT, provincia TEXT,
  datos_manuales BOOLEAN NOT NULL DEFAULT false,
  titular_contrato TEXT, cif TEXT, nombre_firmante TEXT, dni_firmante TEXT,
  telefono_1 TEXT, telefono_2 TEXT, email_titular TEXT, cuenta_bancaria TEXT,
  fecha_firma DATE,
  fecha_entrega_contrato DATE, fecha_cobro_distribuidor DATE,
  commission_gnew NUMERIC(10,4) NOT NULL DEFAULT 0,
  decomission_gnew NUMERIC(10,4) NOT NULL DEFAULT 0,
  beneficio NUMERIC(10,4) GENERATED ALWAYS AS (commission_gnew - decomission_gnew) STORED,
  doc_upload_mode TEXT CHECK (doc_upload_mode IN ('single','separate')),
  devolucion_motivo TEXT, campos_a_corregir JSONB, draft_data JSONB,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_commissions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  commission_paid NUMERIC(10,4) NOT NULL DEFAULT 0,
  decomission NUMERIC(10,4) NOT NULL DEFAULT 0,
  status_pago public.pago_status NOT NULL DEFAULT 'pendiente',
  fecha_pago DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contract_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.contract_documents (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  tipo_doc public.doc_tipo NOT NULL,
  file_path TEXT NOT NULL, file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.state_transitions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role public.app_role NOT NULL,
  from_state public.contract_estado NOT NULL,
  to_state public.contract_estado NOT NULL,
  requires_motivo BOOLEAN NOT NULL DEFAULT false,
  requires_campos BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(role, from_state, to_state)
);

CREATE TABLE IF NOT EXISTS public.contract_state_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  from_state public.contract_estado, to_state public.contract_estado NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  motivo TEXT, campos_devueltos JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, details JSONB,
  ip_address INET, user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_contracts_owner_id    ON public.contracts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contracts_operador_id ON public.contracts(operador_id);
CREATE INDEX IF NOT EXISTS idx_contracts_estado      ON public.contracts(estado);
CREATE INDEX IF NOT EXISTS idx_contracts_cups        ON public.contracts(cups);
CREATE INDEX IF NOT EXISTS idx_contracts_dni         ON public.contracts(dni_firmante);
CREATE INDEX IF NOT EXISTS idx_contracts_fecha_alta  ON public.contracts(fecha_alta);
CREATE INDEX IF NOT EXISTS idx_contracts_deleted_at  ON public.contracts(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contract_commissions_contract ON public.contract_commissions(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_commissions_user     ON public.contract_commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_contract   ON public.contract_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_state_log_contract   ON public.contract_state_log(contract_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_contract   ON public.audit_log(contract_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user       ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at);

-- View seguridad
CREATE OR REPLACE VIEW public.contracts_safe AS
SELECT id, owner_id, operador_id, campaign_id, product_id,
  su_ref, observaciones, activo, estado, fecha_alta, fecha_baja,
  cups, tarifa, potencia_1, potencia_2, potencia_3,
  potencia_4, potencia_5, potencia_6, media_potencia,
  consumo_anual, direccion, codigo_postal, poblacion, provincia, datos_manuales,
  titular_contrato, cif, nombre_firmante, dni_firmante,
  telefono_1, telefono_2, email_titular, cuenta_bancaria, fecha_firma,
  fecha_entrega_contrato, fecha_cobro_distribuidor,
  doc_upload_mode, devolucion_motivo, campos_a_corregir,
  draft_data, created_at, updated_at, deleted_at
FROM public.contracts WHERE deleted_at IS NULL;

-- Triggers contratos
DROP TRIGGER IF EXISTS set_contracts_updated_at ON public.contracts;
CREATE TRIGGER set_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_contract_commissions_updated_at ON public.contract_commissions;
CREATE TRIGGER set_contract_commissions_updated_at
  BEFORE UPDATE ON public.contract_commissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Funciones contratos
CREATE OR REPLACE FUNCTION public.can_transition(
  p_role public.app_role, p_from public.contract_estado, p_to public.contract_estado
) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.state_transitions WHERE role=p_role AND from_state=p_from AND to_state=p_to);
$$;

CREATE OR REPLACE FUNCTION public.change_contract_state(
  p_contract_id UUID, p_new_state public.contract_estado,
  p_changed_by UUID, p_motivo TEXT DEFAULT NULL, p_campos JSONB DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_current_state public.contract_estado; v_role public.app_role;
BEGIN
  SELECT estado INTO v_current_state FROM public.contracts WHERE id=p_contract_id;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id=p_changed_by;
  IF v_role != 'ADMIN' THEN
    IF NOT public.can_transition(v_role, v_current_state, p_new_state) THEN RETURN false; END IF;
  END IF;
  UPDATE public.contracts SET estado=p_new_state WHERE id=p_contract_id;
  INSERT INTO public.contract_state_log(contract_id,from_state,to_state,changed_by,motivo,campos_devueltos)
  VALUES(p_contract_id,v_current_state,p_new_state,p_changed_by,p_motivo,p_campos);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_audit(
  p_contract_id UUID, p_user_id UUID, p_action TEXT,
  p_details JSONB DEFAULT NULL, p_ip INET DEFAULT NULL, p_ua TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.audit_log(contract_id,user_id,action,details,ip_address,user_agent)
  VALUES(p_contract_id,p_user_id,p_action,p_details,p_ip,p_ua);
END;
$$;

-- RLS contracts
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='contracts_select' AND tablename='contracts') THEN
    CREATE POLICY contracts_select ON public.contracts FOR SELECT USING (
      owner_id=auth.uid() OR public.get_user_role(auth.uid()) IN ('ADMIN','BACKOFFICE')
      OR public.is_descendant_of(owner_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='contracts_insert' AND tablename='contracts') THEN
    CREATE POLICY contracts_insert ON public.contracts FOR INSERT WITH CHECK (
      owner_id=auth.uid() OR public.get_user_role(auth.uid()) IN ('ADMIN','BACKOFFICE'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='contracts_update' AND tablename='contracts') THEN
    CREATE POLICY contracts_update ON public.contracts FOR UPDATE USING (
      owner_id=auth.uid() OR public.get_user_role(auth.uid()) IN ('ADMIN','BACKOFFICE')
      OR public.is_descendant_of(owner_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='contracts_delete' AND tablename='contracts') THEN
    CREATE POLICY contracts_delete ON public.contracts FOR DELETE USING (
      public.get_user_role(auth.uid())='ADMIN');
  END IF;
END $$;

-- RLS contract_commissions
ALTER TABLE public.contract_commissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='contract_commissions_select' AND tablename='contract_commissions') THEN
    CREATE POLICY contract_commissions_select ON public.contract_commissions FOR SELECT USING (
      user_id=auth.uid() OR public.get_user_role(auth.uid()) IN ('ADMIN','BACKOFFICE')
      OR public.is_descendant_of(user_id, auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='contract_commissions_insert' AND tablename='contract_commissions') THEN
    CREATE POLICY contract_commissions_insert ON public.contract_commissions FOR INSERT WITH CHECK (
      public.get_user_role(auth.uid()) IN ('ADMIN','BACKOFFICE'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='contract_commissions_update' AND tablename='contract_commissions') THEN
    CREATE POLICY contract_commissions_update ON public.contract_commissions FOR UPDATE USING (
      public.get_user_role(auth.uid()) IN ('ADMIN','BACKOFFICE'));
  END IF;
END $$;

-- RLS contract_documents
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='contract_documents_select' AND tablename='contract_documents') THEN
    CREATE POLICY contract_documents_select ON public.contract_documents FOR SELECT USING (
      uploaded_by=auth.uid() OR public.get_user_role(auth.uid()) IN ('ADMIN','BACKOFFICE')
      OR EXISTS(SELECT 1 FROM public.contracts c WHERE c.id=contract_id AND (c.owner_id=auth.uid() OR public.is_descendant_of(c.owner_id,auth.uid()))));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='contract_documents_insert' AND tablename='contract_documents') THEN
    CREATE POLICY contract_documents_insert ON public.contract_documents FOR INSERT WITH CHECK (
      uploaded_by=auth.uid() OR public.get_user_role(auth.uid()) IN ('ADMIN','BACKOFFICE'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='contract_documents_delete' AND tablename='contract_documents') THEN
    CREATE POLICY contract_documents_delete ON public.contract_documents FOR DELETE USING (
      uploaded_by=auth.uid() OR public.get_user_role(auth.uid()) IN ('ADMIN','BACKOFFICE'));
  END IF;
END $$;

-- RLS state_transitions
ALTER TABLE public.state_transitions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='state_transitions_select' AND tablename='state_transitions') THEN
    CREATE POLICY state_transitions_select ON public.state_transitions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='state_transitions_mutate' AND tablename='state_transitions') THEN
    CREATE POLICY state_transitions_mutate ON public.state_transitions FOR ALL USING (
      public.get_user_role(auth.uid())='ADMIN');
  END IF;
END $$;

-- RLS contract_state_log
ALTER TABLE public.contract_state_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='contract_state_log_select' AND tablename='contract_state_log') THEN
    CREATE POLICY contract_state_log_select ON public.contract_state_log FOR SELECT USING (
      public.get_user_role(auth.uid()) IN ('ADMIN','BACKOFFICE')
      OR EXISTS(SELECT 1 FROM public.contracts c WHERE c.id=contract_id AND (c.owner_id=auth.uid() OR public.is_descendant_of(c.owner_id,auth.uid()))));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='contract_state_log_insert' AND tablename='contract_state_log') THEN
    CREATE POLICY contract_state_log_insert ON public.contract_state_log FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- RLS audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='audit_log_select' AND tablename='audit_log') THEN
    CREATE POLICY audit_log_select ON public.audit_log FOR SELECT USING (public.get_user_role(auth.uid())='ADMIN');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='audit_log_insert' AND tablename='audit_log') THEN
    CREATE POLICY audit_log_insert ON public.audit_log FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- RLS campaigns & products
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='campaigns_select' AND tablename='campaigns') THEN
    CREATE POLICY campaigns_select ON public.campaigns FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='campaigns_mutate' AND tablename='campaigns') THEN
    CREATE POLICY campaigns_mutate ON public.campaigns FOR ALL USING (public.get_user_role(auth.uid()) IN ('ADMIN','BACKOFFICE'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='products_select' AND tablename='products') THEN
    CREATE POLICY products_select ON public.products FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='products_mutate' AND tablename='products') THEN
    CREATE POLICY products_mutate ON public.products FOR ALL USING (public.get_user_role(auth.uid()) IN ('ADMIN','BACKOFFICE'));
  END IF;
END $$;

-- Seed transiciones de estado
INSERT INTO public.state_transitions (role, from_state, to_state) VALUES
  ('COMERCIAL','borrador','pendiente_validacion'),('COMERCIAL','devuelto','pendiente_validacion'),('COMERCIAL','devuelto','borrador'),
  ('CANAL','borrador','pendiente_validacion'),('CANAL','devuelto','pendiente_validacion'),('CANAL','devuelto','borrador'),
  ('KAM','borrador','pendiente_validacion'),('KAM','devuelto','pendiente_validacion'),('KAM','devuelto','borrador'),
  ('DIRECTOR','borrador','pendiente_validacion'),('DIRECTOR','devuelto','pendiente_validacion'),('DIRECTOR','devuelto','borrador'),
  ('BACKOFFICE','pendiente_validacion','tramitado'),('BACKOFFICE','pendiente_validacion','devuelto'),('BACKOFFICE','pendiente_validacion','ko'),
  ('BACKOFFICE','tramitado','pendiente_aceptacion'),('BACKOFFICE','tramitado','no_tramitado'),
  ('BACKOFFICE','pendiente_aceptacion','futura_activacion'),('BACKOFFICE','pendiente_aceptacion','ko'),
  ('BACKOFFICE','futura_activacion','pendiente_instalacion'),('BACKOFFICE','futura_activacion','ok'),
  ('BACKOFFICE','pendiente_instalacion','ok'),('BACKOFFICE','ok','pendiente_renovar'),
  ('BACKOFFICE','ok','incidencia'),('BACKOFFICE','ok','aviso_baja'),
  ('BACKOFFICE','incidencia','ok'),('BACKOFFICE','aviso_baja','baja'),('BACKOFFICE','aviso_baja','ok'),
  ('ADMIN','borrador','pendiente_validacion'),('ADMIN','pendiente_validacion','tramitado'),
  ('ADMIN','pendiente_validacion','devuelto'),('ADMIN','pendiente_validacion','ko'),
  ('ADMIN','devuelto','pendiente_validacion'),('ADMIN','devuelto','borrador'),
  ('ADMIN','tramitado','pendiente_aceptacion'),('ADMIN','tramitado','no_tramitado'),
  ('ADMIN','pendiente_aceptacion','futura_activacion'),('ADMIN','pendiente_aceptacion','ko'),
  ('ADMIN','futura_activacion','pendiente_instalacion'),('ADMIN','futura_activacion','ok'),
  ('ADMIN','pendiente_instalacion','ok'),('ADMIN','ok','pendiente_renovar'),
  ('ADMIN','ok','incidencia'),('ADMIN','ok','aviso_baja'),
  ('ADMIN','incidencia','ok'),('ADMIN','aviso_baja','baja'),('ADMIN','aviso_baja','ok'),('ADMIN','ko','borrador')
ON CONFLICT DO NOTHING;

-- Marcar requires_motivo/requires_campos
UPDATE public.state_transitions SET requires_motivo=true, requires_campos=true WHERE to_state='devuelto';
UPDATE public.state_transitions SET requires_motivo=true WHERE to_state='ko';

-- Seed productos
INSERT INTO public.products (name, type) VALUES
  ('Luz Hogar','luz_hogar'),('Luz Empresa','luz_empresa'),
  ('Gas Hogar','gas_hogar'),('Gas Empresa','gas_empresa'),('Dual','dual')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- 004: get_ancestors
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_ancestors(p_user_id UUID)
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH RECURSIVE tree AS (
    SELECT parent_id FROM public.profiles WHERE id=p_user_id AND parent_id IS NOT NULL
    UNION ALL
    SELECT p.parent_id FROM public.profiles p INNER JOIN tree t ON p.id=t.parent_id WHERE p.parent_id IS NOT NULL
  )
  SELECT parent_id FROM tree;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 005: commission_pct
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS commission_pct NUMERIC DEFAULT NULL;

-- ═══════════════════════════════════════════════════════════════════
-- SEED: 6 usuarios de test con jerarquía
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO public.profiles (id, email, full_name, role, alias, commission_type, wallet_personal, wallet_family)
VALUES
  ('a11332c0-e04b-43f2-b2b2-f2d4a80a305d','admin@gruponewenergy.es','Víctor Marrón','ADMIN','VMARRON','otro',0.5,0.5),
  ('48043d26-7d29-47e6-9766-5a91b15f9da0','backoffice@gruponewenergy.es','Laura García','BACKOFFICE','LGARCIA','otro',0.5,0.5),
  ('7cae709e-456a-473d-96f8-a2b51c2e103a','director@gruponewenergy.es','Alejandro Sacristán','DIRECTOR','ASACRISTAN','otro',0.5,0.5),
  ('ec5cb2db-069d-41e1-aa18-ce99c10c1e6e','kam@gruponewenergy.es','Miguel Ángel Rubio','KAM','MRUBIO','otro',0.5,0.5),
  ('7de8099c-865d-499e-8fa8-194175cce5be','canal@gruponewenergy.es','Roberto Bilbao','CANAL','RBILBAO','otro',0.5,0.5),
  ('c774c449-0adc-4251-ba7f-5575ef11c236','comercial@gruponewenergy.es','Aitor Carracedo','COMERCIAL','ACARRACEDO','otro',0.5,0.5)
ON CONFLICT (id) DO UPDATE SET
  full_name=EXCLUDED.full_name, role=EXCLUDED.role, alias=EXCLUDED.alias,
  commission_type=EXCLUDED.commission_type, wallet_personal=EXCLUDED.wallet_personal, wallet_family=EXCLUDED.wallet_family;

-- Jerarquía
UPDATE public.profiles SET parent_id=NULL WHERE id='a11332c0-e04b-43f2-b2b2-f2d4a80a305d';
UPDATE public.profiles SET parent_id='a11332c0-e04b-43f2-b2b2-f2d4a80a305d' WHERE id='48043d26-7d29-47e6-9766-5a91b15f9da0';
UPDATE public.profiles SET parent_id='a11332c0-e04b-43f2-b2b2-f2d4a80a305d' WHERE id='7cae709e-456a-473d-96f8-a2b51c2e103a';
UPDATE public.profiles SET parent_id='7cae709e-456a-473d-96f8-a2b51c2e103a' WHERE id='ec5cb2db-069d-41e1-aa18-ce99c10c1e6e';
UPDATE public.profiles SET parent_id='ec5cb2db-069d-41e1-aa18-ce99c10c1e6e' WHERE id='7de8099c-865d-499e-8fa8-194175cce5be';
UPDATE public.profiles SET parent_id='7de8099c-865d-499e-8fa8-194175cce5be' WHERE id='c774c449-0adc-4251-ba7f-5575ef11c236';

-- Contadores de factura
INSERT INTO public.invoice_counters (user_id, year, last_number) VALUES
  ('a11332c0-e04b-43f2-b2b2-f2d4a80a305d',2026,0),
  ('48043d26-7d29-47e6-9766-5a91b15f9da0',2026,0),
  ('7cae709e-456a-473d-96f8-a2b51c2e103a',2026,0),
  ('ec5cb2db-069d-41e1-aa18-ce99c10c1e6e',2026,0),
  ('7de8099c-865d-499e-8fa8-194175cce5be',2026,0),
  ('c774c449-0adc-4251-ba7f-5575ef11c236',2026,0)
ON CONFLICT (user_id, year) DO NOTHING;

-- Forzar recarga schema cache PostgREST
NOTIFY pgrst, 'reload schema';

-- Verificación final
SELECT p.full_name, p.role::text, p.alias, p2.full_name AS superior
FROM public.profiles p
LEFT JOIN public.profiles p2 ON p.parent_id = p2.id
ORDER BY CASE p.role
  WHEN 'ADMIN' THEN 1 WHEN 'BACKOFFICE' THEN 2 WHEN 'DIRECTOR' THEN 3
  WHEN 'KAM' THEN 4 WHEN 'CANAL' THEN 5 WHEN 'COMERCIAL' THEN 6
END;
