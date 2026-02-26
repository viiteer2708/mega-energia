-- Añadir porcentaje de comisión para subordinados (0-100)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS commission_pct NUMERIC DEFAULT NULL;
