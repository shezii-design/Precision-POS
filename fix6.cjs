const fs = require('fs');
let content = fs.readFileSync('src/services/supabase.ts', 'utf8');
content = content.replace(/updated_at TIMESTAMPTZ DEFAULT NOW\(\),\n  updated_at TIMESTAMPTZ DEFAULT NOW\(\)/g, "updated_at TIMESTAMPTZ DEFAULT NOW()");
fs.writeFileSync('src/services/supabase.ts', content);
