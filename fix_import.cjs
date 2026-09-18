const fs = require('fs');
let code = fs.readFileSync('src/components/NewSaleModal.tsx', 'utf8');

code = code.replace(
  "SaleItem",
  "SaleItem,\n  Vendor"
);

fs.writeFileSync('src/components/NewSaleModal.tsx', code);
