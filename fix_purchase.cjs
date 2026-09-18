const fs = require('fs');
const file = 'src/components/PurchaseFormModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/searchProductQuery\.toLowerCase\(\)/g, "(searchProductQuery ? searchProductQuery.toLowerCase() : '')");

fs.writeFileSync(file, content);
