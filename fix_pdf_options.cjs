const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

code = code.replace(
  'margin:       [0.5, 0.5, 0.5, 0.5],',
  'margin:       0.5,'
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
