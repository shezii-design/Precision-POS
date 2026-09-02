const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

code = code.replace(/!currentEmployee \|\| isActionAllowed\(currentEmployee, 'canCreateSales'\)/g, "isActionAllowed(currentEmployee, 'canCreateSales')");
code = code.replace(/!currentEmployee \|\| isActionAllowed\(currentEmployee, 'canAddProducts'\)/g, "isActionAllowed(currentEmployee, 'canAddProducts')");
code = code.replace(/!currentEmployee \|\| isActionAllowed\(currentEmployee, 'canManageSettings'\)/g, "isActionAllowed(currentEmployee, 'canManageSettings')");
code = code.replace(/!currentEmployee \|\| isActionAllowed\(currentEmployee, 'canImportExport'\)/g, "isActionAllowed(currentEmployee, 'canImportExport')");

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log('patched Navbar auth checks');
