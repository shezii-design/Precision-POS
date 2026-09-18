const fs = require('fs');
const file = 'src/components/NewSaleModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `c.name.toLowerCase() === editingSale.customerName?.toLowerCase()`,
  `(c.name && c.name.toLowerCase() === editingSale.customerName?.toLowerCase())`
);

content = content.replace(
  `c.name.toLowerCase() === validInitialCustomerName.toLowerCase()`,
  `(c.name && c.name.toLowerCase() === validInitialCustomerName.toLowerCase())`
);

content = content.replace(
  `c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))`,
  `c => (c.name && c.name.toLowerCase().includes(q)) || (c.phone && c.phone.includes(q))`
);

fs.writeFileSync(file, content);
