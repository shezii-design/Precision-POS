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
END $$;
