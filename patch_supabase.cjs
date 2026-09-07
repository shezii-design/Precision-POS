const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf-8');

code = code.replace(
  "if (selectErr && selectErr.code === '42P01' || selectErr.code === 'PGRST205') {",
  "if (selectErr && (selectErr.code === '42P01' || selectErr.code === 'PGRST205')) {"
);

fs.writeFileSync('src/services/supabase.ts', code);
console.log('Fixed parens');
