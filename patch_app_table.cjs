const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/onEdit=\{handleEditProduct\}/g, 
  "onEdit={isActionAllowed(currentEmployee, 'canEditProducts') ? handleEditProduct : undefined}");

code = code.replace(/onDelete=\{handleDeleteProduct\}/g, 
  "onDelete={isActionAllowed(currentEmployee, 'canDeleteProducts') ? handleDeleteProduct : undefined}");

code = code.replace(/onDuplicate=\{handleDuplicateProduct\}/g, 
  "onDuplicate={isActionAllowed(currentEmployee, 'canAddProducts') ? handleDuplicateProduct : undefined}");

code = code.replace(/onAdjustStock=\{handleOpenStockAdjust\}/g, 
  "onAdjustStock={isActionAllowed(currentEmployee, 'canAdjustStock') ? handleOpenStockAdjust : undefined}");

code = code.replace(/onPrintLabel=\{handleOpenLabelPrint\}/g, 
  "onPrintLabel={isActionAllowed(currentEmployee, 'canPrintLabels') ? handleOpenLabelPrint : undefined}");

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx properties");
