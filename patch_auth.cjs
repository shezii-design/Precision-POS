const fs = require('fs');
let code = fs.readFileSync('src/services/auth.ts', 'utf-8');

const oldIsActionAllowed = `export function isActionAllowed(user: EmployeeAccount, action: keyof EmployeePermissions): boolean {
  if (user.role === 'admin') return true;
  return Boolean(user.permissions[action]);
}`;

const newIsActionAllowed = `export function isActionAllowed(user: EmployeeAccount | null, action: keyof EmployeePermissions): boolean {
  // If offline, disable all write/edit actions globally for everyone
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    const writeActions = [
      'canCreateSales', 'canAddProducts', 'canEditProducts', 'canDeleteProducts', 
      'canManageSettings', 'canImportExport', 'canClearRecords', 'canManageStaff'
    ];
    if (writeActions.includes(action)) {
      return false;
    }
  }

  if (!user) {
    // If no employee is logged in, assume super admin, but still restricted by offline check above
    return true;
  }
  if (user.role === 'admin') return true;
  return Boolean(user.permissions[action]);
}`;

code = code.replace(oldIsActionAllowed, newIsActionAllowed);
fs.writeFileSync('src/services/auth.ts', code);
console.log('patched isActionAllowed');
