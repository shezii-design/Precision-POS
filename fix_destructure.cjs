const fs = require('fs');
let code = fs.readFileSync('src/components/NewSaleModal.tsx', 'utf8');

code = code.replace(
  "  customers = [],\n  sales = [],",
  "  customers = [],\n  vendors = [],\n  sales = [],"
);

fs.writeFileSync('src/components/NewSaleModal.tsx', code);
