const fs = require('fs');
let content = fs.readFileSync('src/services/supabase.ts', 'utf8');

const idempMissingUpdatedAt = `
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE customer_returns ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;
`;

if(!content.includes('ALTER TABLE customer_returns ADD COLUMN updated_at TIMESTAMPTZ')) {
    content = content.replace("-- Upgrading table: vendors", idempMissingUpdatedAt + "\n-- Upgrading table: vendors");
    fs.writeFileSync('src/services/supabase.ts', content);
    console.log("Added updated_at to customer_returns in idempotent script");
} else {
    console.log("Already has it.");
}
