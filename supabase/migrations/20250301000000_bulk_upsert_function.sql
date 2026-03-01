-- Función transaccional para bulk upsert de commission_rates
-- Ejecuta todo en una sola transacción: si falla cualquier paso, rollback completo

CREATE OR REPLACE FUNCTION bulk_upsert_commission_rates(
  p_company_name TEXT,
  p_model TEXT,
  p_margin NUMERIC,
  p_products JSONB,
  p_uploaded_by UUID,
  p_file_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id INT;
  v_companies_created INT := 0;
  v_products_created INT := 0;
  v_records_created INT := 0;
  v_records_updated INT := 0;
  v_product JSONB;
  v_rate JSONB;
  v_product_id INT;
  v_existing_rate_id INT;
BEGIN
  -- 1. Upsert comercializadora
  SELECT id INTO v_company_id
  FROM energy_companies
  WHERE name = p_company_name;

  IF v_company_id IS NULL THEN
    INSERT INTO energy_companies (name, commission_model, gnew_margin_pct)
    VALUES (p_company_name, p_model, p_margin)
    RETURNING id INTO v_company_id;
    v_companies_created := 1;
  ELSE
    UPDATE energy_companies
    SET commission_model = p_model, gnew_margin_pct = p_margin, updated_at = NOW()
    WHERE id = v_company_id;
  END IF;

  -- 2. Procesar productos y rates
  FOR v_product IN SELECT * FROM jsonb_array_elements(p_products)
  LOOP
    -- Upsert producto
    SELECT id INTO v_product_id
    FROM energy_products
    WHERE company_id = v_company_id
      AND name = v_product->>'name'
      AND COALESCE(fee_value, 0) = COALESCE((v_product->>'fee_value')::NUMERIC, 0);

    IF v_product_id IS NULL THEN
      INSERT INTO energy_products (company_id, name, fee_value, fee_label)
      VALUES (
        v_company_id,
        v_product->>'name',
        (v_product->>'fee_value')::NUMERIC,
        v_product->>'fee_label'
      )
      RETURNING id INTO v_product_id;
      v_products_created := v_products_created + 1;
    END IF;

    -- Upsert rates del producto
    FOR v_rate IN SELECT * FROM jsonb_array_elements(v_product->'rates')
    LOOP
      SELECT id INTO v_existing_rate_id
      FROM commission_rates
      WHERE product_id = v_product_id
        AND tariff = v_product->>'tariff'
        AND consumption_min = (v_rate->>'consumption_min')::INT
        AND consumption_max = (v_rate->>'consumption_max')::INT;

      IF v_existing_rate_id IS NOT NULL THEN
        UPDATE commission_rates
        SET gross_amount = (v_rate->>'gross_amount')::NUMERIC, updated_at = NOW()
        WHERE id = v_existing_rate_id;
        v_records_updated := v_records_updated + 1;
      ELSE
        INSERT INTO commission_rates (product_id, tariff, consumption_min, consumption_max, gross_amount)
        VALUES (
          v_product_id,
          v_product->>'tariff',
          (v_rate->>'consumption_min')::INT,
          (v_rate->>'consumption_max')::INT,
          (v_rate->>'gross_amount')::NUMERIC
        );
        v_records_created := v_records_created + 1;
      END IF;
    END LOOP;
  END LOOP;

  -- 3. Registrar upload
  INSERT INTO commission_uploads (
    file_name, uploaded_by, company_id,
    records_created, records_updated, products_created,
    total_rows, updated_rows, error_rows, summary
  ) VALUES (
    p_file_name, p_uploaded_by, v_company_id,
    v_records_created, v_records_updated, v_products_created,
    v_records_created + v_records_updated, v_records_updated, 0,
    jsonb_build_object(
      'total_products', v_products_created,
      'total_rates', v_records_created + v_records_updated
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'company_id', v_company_id,
    'companies_created', v_companies_created,
    'products_created', v_products_created,
    'records_created', v_records_created,
    'records_updated', v_records_updated,
    'rates_upserted', v_records_created + v_records_updated
  );
END;
$$;
