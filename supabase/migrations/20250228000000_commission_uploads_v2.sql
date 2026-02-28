-- Migración: commission_uploads v2
-- Añade campos para tracking detallado de cargas de comisiones

-- Añadir columnas a commission_uploads
ALTER TABLE commission_uploads
  ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES energy_companies(id),
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS records_created INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS records_updated INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS products_created INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS summary JSONB;

-- Índice por company_id para consultas filtradas
CREATE INDEX IF NOT EXISTS idx_commission_uploads_company_id
  ON commission_uploads(company_id);

-- Índice por fecha para historial
CREATE INDEX IF NOT EXISTS idx_commission_uploads_created_at
  ON commission_uploads(created_at DESC);
