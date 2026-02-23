-- ============================================================================
-- GRUPO NEW ENERGY — Fase 2: Expansión de profiles + tabla invoice_counters
-- ============================================================================

-- 1. Nuevas columnas de facturación en profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_name         TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_nif          TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_address      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_postal_code  TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_city         TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_iban         TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_retention_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_vat_pct      NUMERIC(5,2) NOT NULL DEFAULT 21;

-- 2. Nuevas columnas comerciales en profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS alias                TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS commercial_nif       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS commercial_address   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS commercial_postal_code TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS commission_type      TEXT NOT NULL DEFAULT 'otro'
    CHECK (commission_type IN ('partner', 'master', 'distribuidor', 'otro')),
  ADD COLUMN IF NOT EXISTS wallet_personal      NUMERIC(8,4) NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS wallet_family        NUMERIC(8,4) NOT NULL DEFAULT 0.5;

-- 3. Tabla invoice_counters
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year        INT NOT NULL,
  last_number INT NOT NULL DEFAULT 0,
  UNIQUE(user_id, year)
);

ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_counters_select ON public.invoice_counters
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('ADMIN', 'BACKOFFICE')
  );

-- 4. Función atómica para obtener siguiente número de factura
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_user_id UUID, p_year INT)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_next INT;
BEGIN
  INSERT INTO public.invoice_counters (user_id, year, last_number)
  VALUES (p_user_id, p_year, 1)
  ON CONFLICT (user_id, year)
  DO UPDATE SET last_number = invoice_counters.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN v_next;
END;
$$;
