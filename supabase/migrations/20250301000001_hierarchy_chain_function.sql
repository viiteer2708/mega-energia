-- CTE recursiva para obtener la cadena jerárquica completa
-- Reemplaza N queries (1 por nivel) con 1 sola query

CREATE OR REPLACE FUNCTION get_hierarchy_chain(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  parent_id UUID,
  tier_name TEXT,
  tier_rate_pct NUMERIC,
  depth INT
)
LANGUAGE sql
STABLE
AS $$
  WITH RECURSIVE chain AS (
    -- Caso base: el usuario inicial
    SELECT
      p.id AS user_id,
      p.parent_id,
      ct.name AS tier_name,
      ct.rate_pct AS tier_rate_pct,
      0 AS depth
    FROM profiles p
    LEFT JOIN commission_tiers ct ON ct.id = p.commission_tier_id
    WHERE p.id = p_user_id

    UNION ALL

    -- Caso recursivo: subir al padre
    SELECT
      p.id,
      p.parent_id,
      ct.name,
      ct.rate_pct,
      c.depth + 1
    FROM chain c
    JOIN profiles p ON p.id = c.parent_id
    LEFT JOIN commission_tiers ct ON ct.id = p.commission_tier_id
    WHERE c.parent_id IS NOT NULL
      AND c.depth < 10  -- Prevenir loops infinitos
  )
  SELECT
    chain.user_id,
    chain.parent_id,
    chain.tier_name,
    chain.tier_rate_pct,
    chain.depth
  FROM chain
  ORDER BY chain.depth;
$$;
