const fs = require('fs');
const file = 'src/components/NewSaleModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `const q = customerSearch.toLowerCase().trim();`,
  `const q = (customerSearch || '').toLowerCase().trim();`
);

content = content.replace(
  `const q = productSearchTerm.toLowerCase().trim();`,
  `const q = (productSearchTerm || '').toLowerCase().trim();`
);

fs.writeFileSync(file, content);
