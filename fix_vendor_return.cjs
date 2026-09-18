const fs = require('fs');
const file = 'src/components/VendorReturnModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const key = it\.productId \|\| it\.internalId \|\| it\.productName\.trim\(\)\.toLowerCase\(\);/g,
  "const key = it.productId || it.internalId || (it.productName ? it.productName.trim().toLowerCase() : '');"
);

fs.writeFileSync(file, content);
