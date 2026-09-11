const fs = require('fs');

const pages = [
  'DemandsPage.tsx', 'VendorDetailsPage.tsx', 'IncomeStatementPage.tsx', 
  'QuotationsPage.tsx', 'PurchaseOrdersPage.tsx', 'ReturnsPage.tsx',
  'InventoryAuditLog.tsx', 'ExpensesPage.tsx', 'DashboardPage.tsx'
];

for (const page of pages) {
  if (!fs.existsSync(`src/components/${page}`)) continue;
  let code = fs.readFileSync(`src/components/${page}`, 'utf8');
  
  // Make onSomething: (...) => void; optional by adding ?
  code = code.replace(/onDeleteExpense: /g, "onDeleteExpense?: ");
  code = code.replace(/onOpenAddDemand: /g, "onOpenAddDemand?: ");
  code = code.replace(/onEditDemand: /g, "onEditDemand?: ");
  code = code.replace(/onDeleteDemand: /g, "onDeleteDemand?: ");
  
  code = code.replace(/onOpenCreatePO: /g, "onOpenCreatePO?: ");
  code = code.replace(/onOpenEditPO: /g, "onOpenEditPO?: ");
  code = code.replace(/onOpenReceiveCargo: /g, "onOpenReceiveCargo?: ");
  code = code.replace(/onDeletePO: /g, "onDeletePO?: ");
  code = code.replace(/onOpenReceivePO: /g, "onOpenReceivePO?: ");
  
  code = code.replace(/onOpenCustomerReturnModal: /g, "onOpenCustomerReturnModal?: ");
  code = code.replace(/onOpenVendorReturnModal: /g, "onOpenVendorReturnModal?: ");
  code = code.replace(/onDeleteCustomerReturn: /g, "onDeleteCustomerReturn?: ");
  code = code.replace(/onDeleteVendorReturn: /g, "onDeleteVendorReturn?: ");
  
  code = code.replace(/onOpenCreateQuotation: /g, "onOpenCreateQuotation?: ");
  code = code.replace(/onEditQuotation: /g, "onEditQuotation?: ");
  code = code.replace(/onDeleteQuotation: /g, "onDeleteQuotation?: ");
  code = code.replace(/onOpenAdjustModal: /g, "onOpenAdjustModal?: ");
  
  code = code.replace(/onOpenCashModal: /g, "onOpenCashModal?: ");
  code = code.replace(/onOpenPurchaseModal: /g, "onOpenPurchaseModal?: ");
  code = code.replace(/onDeleteLedgerEntry: /g, "onDeleteLedgerEntry?: ");
  
  // Also we need to wrap the buttons. This is hard to do with regex for all of them perfectly without knowing structure.
  // We can just add {onSomething && ...} for buttons calling these if they crash, but since we are doing 
  // onClick={onSomething ? () => onSomething() : undefined}, we can just do that!
  
  // Actually, making it optional is fine if we also handle it gracefully. 
  // Let's replace onClick={onSomething} with onClick={onSomething ? ...}
  
  fs.writeFileSync(`src/components/${page}`, code);
}
console.log("Made props optional");
