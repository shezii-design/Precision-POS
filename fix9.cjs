const fs = require('fs');
let content = fs.readFileSync('src/services/supabase.ts', 'utf8');

const idempMissingUpdatedAt3 = `
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE purchases ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;
`;

if(!content.includes('ALTER TABLE purchases ADD COLUMN updated_at TIMESTAMPTZ')) {
    content = content.replace("-- Upgrading table: quotations", idempMissingUpdatedAt3 + "\n-- Upgrading table: quotations");
    fs.writeFileSync('src/services/supabase.ts', content);
    console.log("Added updated_at to purchases in idempotent script");
} else {
    console.log("Already has it.");
}
