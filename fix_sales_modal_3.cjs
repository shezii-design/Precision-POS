const fs = require('fs');
const file = 'src/components/NewSaleModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `v.name.toLowerCase().includes(vendorSearch.toLowerCase())`,
  `(v.name && v.name.toLowerCase().includes(vendorSearch.toLowerCase()))`
);

content = content.replace(
  `v.name.toLowerCase().includes(vendorSearch.toLowerCase())`,
  `(v.name && v.name.toLowerCase().includes(vendorSearch.toLowerCase()))`
);

fs.writeFileSync(file, content);
