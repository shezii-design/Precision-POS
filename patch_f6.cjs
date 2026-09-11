const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /if \(e\.key === 'F6'\) \{\s*e\.preventDefault\(\);\s*handleOpenCreateQuotation\(\);\s*return;\s*\}/g,
  "if (e.key === 'F6') { e.preventDefault(); if (isActionAllowed(currentEmployee, 'canManageQuotations')) handleOpenCreateQuotation(); return; }"
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched F6 hotkey");
