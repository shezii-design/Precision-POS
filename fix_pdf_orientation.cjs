const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

code = code.replace(
  "jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }",
  "jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' as const }"
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
