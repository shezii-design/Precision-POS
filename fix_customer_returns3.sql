DO $$ 
BEGIN 
    BEGIN ALTER TABLE customer_returns ADD COLUMN customer_phone TEXT; EXCEPTION WHEN duplicate_column THEN null; END;
END $$;
