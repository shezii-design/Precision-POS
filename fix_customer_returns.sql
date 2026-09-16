DO $$ 
BEGIN 
    BEGIN ALTER TABLE customer_returns ADD COLUMN subtotal NUMERIC DEFAULT 0; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE customer_returns ADD COLUMN deduction_or_restock_fee NUMERIC DEFAULT 0; EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE customer_returns ADD COLUMN refund_status TEXT DEFAULT 'completed'; EXCEPTION WHEN duplicate_column THEN null; END;
END $$;
