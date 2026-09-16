const fs = require('fs');
let content = fs.readFileSync('src/services/supabase.ts', 'utf8');
content = content.replace(/END \$\$;\n`;/g, "END $$;\n\nNOTIFY pgrst, 'reload schema';\n`;");
fs.writeFileSync('src/services/supabase.ts', content);
