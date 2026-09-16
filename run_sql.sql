DO $$ 
BEGIN 
    BEGIN ALTER TABLE customer_returns ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE vendor_returns ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN null; END;
    BEGIN ALTER TABLE purchases ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN null; END;
END $$;
NOTIFY pgrst, 'reload schema';
