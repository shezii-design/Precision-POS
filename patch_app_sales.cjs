const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/onOpenNewSale=\{\(\) => handleOpenNewSale\(\)\}/g, 
  "onOpenNewSale={isActionAllowed(currentEmployee, 'canCreateSales') ? () => handleOpenNewSale() : undefined}");

code = code.replace(/onEditSale=\{handleEditSale\}/g, 
  "onEditSale={isActionAllowed(currentEmployee, 'canEditSales') ? handleEditSale : undefined}");

code = code.replace(/onOpenCustomerReturn=\{\(sale\) => handleOpenCustomerReturnModal\(sale\)\}/g, 
  "onOpenCustomerReturn={isActionAllowed(currentEmployee, 'canProcessReturns') ? (sale) => handleOpenCustomerReturnModal(sale) : undefined}");

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx Sales actions");
