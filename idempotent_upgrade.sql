DO $$ 
BEGIN 
    BEGIN ALTER TABLE sales ADD COLUMN change_given NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE sales ADD COLUMN payment_status TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE sales ADD COLUMN has_returns BOOLEAN; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE sales ADD COLUMN total_returned_amount NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE sales ADD COLUMN net_amount NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE sales ADD COLUMN net_balance_due NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE sales ADD COLUMN returned_items_count NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE sales ADD COLUMN returns_list JSONB; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE sales ADD COLUMN invoice_naming_preference TEXT; EXCEPTION WHEN duplicate_column THEN null; END;

    BEGIN ALTER TABLE stock_logs ADD COLUMN internal_id TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN brand_name TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN type_name TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN unit TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN change NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN previous_stock NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN new_stock NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN movement_type TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN reference_number TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN entity_name TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN unit_rate NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN total_movement_value NUMERIC; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN location_name TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN cabin_number TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN timestamp TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN notes TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN product_id TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN product_name TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN reason TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE stock_logs ADD COLUMN reference_id TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
END $$;
