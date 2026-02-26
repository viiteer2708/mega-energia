-- ============================================================================
-- GRUPO NEW ENERGY — Fase 4: Permisos y Visibilidad (gaps)
-- get_ancestors, requires_motivo, deleted_at, RLS DELETE, contracts_safe
-- Pegar en Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════
-- 1. FUNCIÓN get_ancestors (CTE recursivo ascendente)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_ancestors(p_user_id UUID)
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH RECURSIVE tree AS (
    SELECT parent_id FROM public.profiles WHERE id = p_user_id AND parent_id IS NOT NULL
    UNION ALL
    SELECT p.parent_id FROM public.profiles p
    INNER JOIN tree t ON p.id = t.parent_id
    WHERE p.parent_id IS NOT NULL
  )
  SELECT parent_id FROM tree;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 2. state_transitions: requires_motivo y requires_campos
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.state_transitions
  ADD COLUMN IF NOT EXISTS requires_motivo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_campos BOOLEAN NOT NULL DEFAULT false;

-- devuelto requiere motivo + campos a corregir
UPDATE public.state_transitions
SET requires_motivo = true, requires_campos = true
WHERE to_state = 'devuelto';

-- ko requiere motivo
UPDATE public.state_transitions
SET requires_motivo = true
WHERE to_state = 'ko';

-- ═══════════════════════════════════════════════════════════════════
-- 3. contracts.deleted_at (soft-delete)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_contracts_deleted_at
  ON public.contracts(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 4. RLS DELETE en contracts (solo ADMIN)
-- ═══════════════════════════════════════════════════════════════════

CREATE POLICY contracts_delete ON public.contracts
  FOR DELETE USING (
    public.get_user_role(auth.uid()) = 'ADMIN'
  );

-- ═══════════════════════════════════════════════════════════════════
-- 5. Actualizar contracts_safe (excluir soft-deleted)
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
  doc_upload_mode, devolucion_motivo, campos_a_corregir,
  draft_data, created_at, updated_at, deleted_at
FROM public.contracts
WHERE deleted_at IS NULL;
