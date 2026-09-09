const fs = require('fs');
let code = fs.readFileSync('src/components/CustomersPage.tsx', 'utf8');

code = code.replace(/onOpenNewSaleForCustomer=\{\(cId, items\) => onOpenNewSale\(cId, items\)\}/g, 
  "onOpenNewSaleForCustomer={onOpenNewSale ? (cId, items) => onOpenNewSale(cId, items) : undefined}");

fs.writeFileSync('src/components/CustomersPage.tsx', code);
console.log("Patched CustomersPage.tsx onOpenNewSaleForCustomer");
