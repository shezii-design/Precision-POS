const fs = require('fs');
let code = fs.readFileSync('src/services/excel.ts', 'utf-8');
code = code.replace(
  "const image = String(normalized['imageurl'] || normalized['image'] || '').trim();",
  "const image = String(normalized['imageurl'] || normalized['image'] || normalized['imagelink'] || normalized['picture'] || '').trim();"
);
fs.writeFileSync('src/services/excel.ts', code);
console.log('Patched excel.ts image keys');
