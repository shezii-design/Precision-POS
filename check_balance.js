const fs = require('fs');
const code = fs.readFileSync('src/services/storage.ts', 'utf8');
const match = code.match(/function calculateVendorBalance[\s\S]*?return balance;\n}/);
console.log(match ? "Found function" : "Not found");
