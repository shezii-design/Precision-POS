const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/onOpenNewPurchase=\{\(\) => handleOpenNewPurchase\(\)\}/g, 
  "onOpenNewPurchase={isActionAllowed(currentEmployee, 'canCreatePurchases') ? () => handleOpenNewPurchase() : undefined}");

code = code.replace(/onEditPurchase=\{handleEditPurchase\}/g, 
  "onEditPurchase={isActionAllowed(currentEmployee, 'canEditPurchases') ? handleEditPurchase : undefined}");

code = code.replace(/onDeletePurchase=\{handleDeletePurchase\}/g, 
  "onDeletePurchase={isActionAllowed(currentEmployee, 'canDeletePurchases') ? handleDeletePurchase : undefined}");

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx Purchases actions");
