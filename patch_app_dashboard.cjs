const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/onOpenNewPurchase=\{\(vendorId\) => handleOpenPurchaseModal\(vendorId\)\}/g, 
  "onOpenNewPurchase={isActionAllowed(currentEmployee, 'canCreatePurchases') ? (vendorId) => handleOpenPurchaseModal(vendorId) : undefined}");

code = code.replace(/onOpenCreatePO=\{\(\) => handleOpenCreatePO\(\)\}/g, 
  "onOpenCreatePO={isActionAllowed(currentEmployee, 'canCreatePurchaseOrders') ? () => handleOpenCreatePO() : undefined}");

code = code.replace(/onOpenCreateDemand=\{handleOpenCreateDemand\}/g, 
  "onOpenCreateDemand={isActionAllowed(currentEmployee, 'canManageDemands') ? handleOpenCreateDemand : undefined}");

code = code.replace(/onOpenAddProduct=\{handleOpenAddProduct\}/g, 
  "onOpenAddProduct={isActionAllowed(currentEmployee, 'canAddProducts') ? handleOpenAddProduct : undefined}");

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx Dashboard actions");
