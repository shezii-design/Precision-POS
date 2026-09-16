const fs = require('fs');
let content = fs.readFileSync('src/services/supabase.ts', 'utf8');
content = content.replace("END $$;\n`;", "END $$;\n\nNOTIFY pgrst, 'reload schema';\n`;");
content = content.replace("END $$;\r\n`;", "END $$;\n\nNOTIFY pgrst, 'reload schema';\n`;");
if (!content.includes('NOTIFY pgrst')) {
    content = content.replace(/END \$\$;\s*`;/, "END $$;\n\nNOTIFY pgrst, 'reload schema';\n`;");
}
fs.writeFileSync('src/services/supabase.ts', content);
