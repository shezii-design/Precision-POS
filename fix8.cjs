const fs = require('fs');
let content = fs.readFileSync('src/services/supabase.ts', 'utf8');

const idempMissingUpdatedAt2 = `
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE vendor_returns ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;
`;

if(!content.includes('ALTER TABLE vendor_returns ADD COLUMN updated_at TIMESTAMPTZ')) {
    content = content.replace("-- Upgrading table: purchase_orders", idempMissingUpdatedAt2 + "\n-- Upgrading table: purchase_orders");
    fs.writeFileSync('src/services/supabase.ts', content);
    console.log("Added updated_at to vendor_returns in idempotent script");
} else {
    console.log("Already has it.");
}
