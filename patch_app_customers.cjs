const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /<CustomersPage\s*customers=\{customers\}\s*products=\{products\}\s*sales=\{sales\}\s*customerLedger=\{customerLedger\}\s*onOpenNewSale=\{\(cId, items\) => handleOpenNewSale\(cId, items\)\}\s*onUpdateCustomers=\{setCustomers\}\s*onUpdateLedger=\{setCustomerLedger\}\s*onUpdateProducts=\{setProducts\}\s*onViewInvoice=\{handleViewInvoice\}\s*\/>/g,
  `<CustomersPage
            currentEmployee={currentEmployee}
            customers={customers}
            products={products}
            sales={sales}
            customerLedger={customerLedger}
            onOpenNewSale={isActionAllowed(currentEmployee, 'canCreateSales') ? (cId, items) => handleOpenNewSale(cId, items) : undefined}
            onUpdateCustomers={setCustomers}
            onUpdateLedger={setCustomerLedger}
            onUpdateProducts={setProducts}
            onViewInvoice={handleViewInvoice}
          />`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx CustomersPage");
