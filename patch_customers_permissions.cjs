const fs = require('fs');
let code = fs.readFileSync('src/components/CustomersPage.tsx', 'utf8');

// The file already imports `isActionAllowed` at line 51!

// We can replace the buttons rendering with conditional rendering.
// 1. Add Customer / Add Company
// These are currently `<button onClick={() => { setFormMode('create'); setFormType('individual'); setShowFormModal(true); }}`
code = code.replace(
  /<button[^>]*onClick=\{\(\) => \{\s*setFormMode\('create'\);\s*setFormType\('individual'\);\s*setShowFormModal\(true\);\s*\}\}[\s\S]*?<\/button>/g,
  (match) => `{isActionAllowed(currentEmployee, 'canManageCustomers') && ${match}}`
);
code = code.replace(
  /<button[^>]*onClick=\{\(\) => \{\s*setFormMode\('create'\);\s*setFormType\('company'\);\s*setShowFormModal\(true\);\s*\}\}[\s\S]*?<\/button>/g,
  (match) => `{isActionAllowed(currentEmployee, 'canManageCustomers') && ${match}}`
);

// 2. Edit Customer
code = code.replace(
  /<button[^>]*onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*setFormMode\('edit'\);\s*setSelectedCustomerForForm\(cust\);\s*setShowFormModal\(true\);\s*\}\}[\s\S]*?<\/button>/g,
  (match) => `{isActionAllowed(currentEmployee, 'canManageCustomers') && ${match}}`
);
code = code.replace(
  /<button[^>]*onClick=\{\(\) => \{\s*setFormMode\('edit'\);\s*setSelectedCustomerForForm\(currentCustomer\);\s*setShowFormModal\(true\);\s*\}\}[\s\S]*?<\/button>/g,
  (match) => `{isActionAllowed(currentEmployee, 'canManageCustomers') && ${match}}`
);


// 3. Delete Customer
code = code.replace(
  /<button[^>]*onClick=\{\(e\) => handleDeleteCustomer\(cust\.id, e\)\}[\s\S]*?<\/button>/g,
  (match) => `{isActionAllowed(currentEmployee, 'canManageCustomers') && ${match}}`
);
code = code.replace(
  /<button[^>]*onClick=\{\(\) => handleDeleteCustomer\(currentCustomer\.id, null as any\)\}[\s\S]*?<\/button>/g,
  (match) => `{isActionAllowed(currentEmployee, 'canManageCustomers') && ${match}}`
); // Note: wait, where else is handleDeleteCustomer used? Let's check below.

// 4. Record Payment
code = code.replace(
  /<button[^>]*onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*setSelectedCustomerForPayment\(cust\);\s*setShowPaymentModal\(true\);\s*\}\}[\s\S]*?<\/button>/g,
  (match) => `{isActionAllowed(currentEmployee, 'canRecordCustomerPayments') && ${match}}`
);
code = code.replace(
  /<button[^>]*onClick=\{\(\) => \{\s*setSelectedCustomerForPayment\(currentCustomer\);\s*setShowPaymentModal\(true\);\s*\}\}[\s\S]*?<\/button>/g,
  (match) => `{isActionAllowed(currentEmployee, 'canRecordCustomerPayments') && ${match}}`
);

fs.writeFileSync('src/components/CustomersPage.tsx', code);
console.log("Patched CustomersPage.tsx permissions");
