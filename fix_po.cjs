const fs = require('fs');
const file = 'src/components/PurchaseOrderFormModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/productSearchQuery\.toLowerCase\(\)/g, "(productSearchQuery ? productSearchQuery.toLowerCase() : '')");

fs.writeFileSync(file, content);
