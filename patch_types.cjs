const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf-8');

code = code.replace(
  "| 'inventory_audit';",
  "| 'inventory_audit'\n  | 'analytics';"
);

fs.writeFileSync('src/types.ts', code);
console.log("Patched types.ts");
