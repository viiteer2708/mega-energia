-- ============================================================================
-- GRUPO NEW ENERGY — Ajuste fórmula comisión: añadir MI, eliminar porcentajes
-- Nueva fórmula: CONSUMO × (fee_energia + mi) + (media_potencia × fee_potencia) + comision_servicio
-- ============================================================================

-- commission_formula_config
ALTER TABLE public.commission_formula_config DROP COLUMN IF EXISTS pct_fee_energia;
ALTER TABLE public.commission_formula_config DROP COLUMN IF EXISTS pct_fee_potencia;
ALTER TABLE public.commission_formula_config ADD COLUMN IF NOT EXISTS mi NUMERIC(10,6) NOT NULL DEFAULT 0;

-- commission_calculations
ALTER TABLE public.commission_calculations DROP COLUMN IF EXISTS pct_fee_energia_used;
ALTER TABLE public.commission_calculations DROP COLUMN IF EXISTS pct_fee_potencia_used;
ALTER TABLE public.commission_calculations ADD COLUMN IF NOT EXISTS mi_used NUMERIC(10,6);
