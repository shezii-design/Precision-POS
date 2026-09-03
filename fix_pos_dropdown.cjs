const fs = require('fs');
let code = fs.readFileSync('src/components/NewSaleModal.tsx', 'utf-8');

// Change `filteredProducts.map` to `filteredProducts.slice(0, 50).map`
code = code.replace(
  'filteredProducts.map(prod => {',
  'filteredProducts.slice(0, 50).map(prod => {'
);

fs.writeFileSync('src/components/NewSaleModal.tsx', code);
console.log('Fixed POS dropdown limit');
