const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /if \(e\.key === 'F5'\) \{\s*e\.preventDefault\(\);\s*handleOpenNewSale\(\);\s*return;\s*\}/g,
  "if (e.key === 'F5') { e.preventDefault(); if (isActionAllowed(currentEmployee, 'canCreateSales')) handleOpenNewSale(); return; }"
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched F5 hotkey");
