DO $$ 
BEGIN 
    BEGIN ALTER TABLE vendor_returns ADD COLUMN total_amount NUMERIC DEFAULT 0; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE vendor_returns ADD COLUMN settlement_method TEXT DEFAULT 'cash_refund'; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE vendor_returns ADD COLUMN settlement_status TEXT DEFAULT 'completed'; EXCEPTION WHEN duplicate_column THEN null; END;
END $$;
