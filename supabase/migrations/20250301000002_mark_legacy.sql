-- Marcar tablas legacy v1 con comentarios
-- Estas tablas fueron reemplazadas por energy_companies, energy_products, commission_rates y formula_configs

COMMENT ON TABLE comercializadoras IS 'LEGACY v1 — migrado a energy_companies';
COMMENT ON TABLE rate_tables IS 'LEGACY v1 — migrado a energy_products + commission_rates';
COMMENT ON TABLE rate_table_sheets IS 'LEGACY v1 — migrado a commission_rates';
COMMENT ON TABLE rate_table_offers IS 'LEGACY v1 — migrado a commission_rates';
COMMENT ON TABLE rate_table_rates IS 'LEGACY v1 — migrado a commission_rates';
COMMENT ON TABLE commission_formula_config IS 'LEGACY v1 — migrado a formula_configs';
