const fs = require('fs');
let code = fs.readFileSync('src/components/CustomersPage.tsx', 'utf8');

// 1. Add Customer (line 298 block) - canManageCustomers
code = code.replace(
  /<button[^>]*onClick=\{\(\) => \{\s*setEditingCustomer\(null\);\s*setCustomerModalType\('customer'\);\s*setShowCustomerModal\(true\);\s*\}\}[\s\S]*?<\/button>/g,
  (match) => `{isActionAllowed(currentEmployee, 'canManageCustomers') && ${match}}`
);

// 2. Add Company (line 311 block) - canManageCustomers
code = code.replace(
  /<button[^>]*onClick=\{\(\) => \{\s*setEditingCustomer\(null\);\s*setCustomerModalType\('company'\);\s*setShowCustomerModal\(true\);\s*\}\}[\s\S]*?<\/button>/g,
  (match) => `{isActionAllowed(currentEmployee, 'canManageCustomers') && ${match}}`
);

// 3. Add Customer/Company (Empty State) (line 507 block) - canManageCustomers
code = code.replace(
  /<button[^>]*onClick=\{\(\) => \{\s*setEditingCustomer\(null\);\s*setCustomerModalType\(activeTab === 'companies' \? 'company' : 'customer'\);\s*setShowCustomerModal\(true\);\s*\}\}[\s\S]*?<\/button>/g,
  (match) => `{isActionAllowed(currentEmployee, 'canManageCustomers') && ${match}}`
);

// 4. Edit details (line 568 block) - canManageCustomers
code = code.replace(
  /<button[^>]*onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*setEditingCustomer\(cust\);\s*setCustomerModalType\(cust\.type \|\| 'customer'\);\s*setShowCustomerModal\(true\);\s*\}\}[\s\S]*?<\/button>/g,
  (match) => `{isActionAllowed(currentEmployee, 'canManageCustomers') && ${match}}`
);

// 5. Delete Customer (line 580 block) - canManageCustomers
// Wait, I already did this one in patch_customers_permissions.cjs, let's verify if it was patched!
// If not, we'll patch it.
code = code.replace(
  /<button[^>]*onClick=\{\(e\) => handleDeleteCustomer\(cust\.id, e\)\}[\s\S]*?<\/button>/g,
  (match) => {
    if (match.includes('{isActionAllowed')) return match;
    return `{isActionAllowed(currentEmployee, 'canManageCustomers') && ${match}}`;
  }
);

// 6. Record Payment (line 285 block) - canRecordCustomerPayments
code = code.replace(
  /<button[^>]*onClick=\{\(\) => \{\s*setPaymentPreselectedCustomer\(null\);\s*setShowPaymentModal\(true\);\s*\}\}[\s\S]*?<\/button>/g,
  (match) => `{isActionAllowed(currentEmployee, 'canRecordCustomerPayments') && ${match}}`
);

// 7. Receive Payment (line 682 block) - canRecordCustomerPayments
code = code.replace(
  /<button[^>]*onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*setPaymentPreselectedCustomer\(cust\);\s*setShowPaymentModal\(true\);\s*\}\}[\s\S]*?<\/button>/g,
  (match) => `{isActionAllowed(currentEmployee, 'canRecordCustomerPayments') && ${match}}`
);


fs.writeFileSync('src/components/CustomersPage.tsx', code);
console.log("Patched CustomersPage.tsx Buttons!");
