const fs = require('fs');

const pages = [
  'DemandsPage.tsx', 'VendorDetailsPage.tsx', 'IncomeStatementPage.tsx', 
  'QuotationsPage.tsx', 'PurchaseOrdersPage.tsx', 'ReturnsPage.tsx',
  'InventoryAuditLog.tsx', 'ExpensesPage.tsx', 'DashboardPage.tsx',
  'SalesPage.tsx', 'ProductsPage.tsx', 'CustomersPage.tsx', 'VendorsPage.tsx'
];

for (const page of pages) {
  if (!fs.existsSync(`src/components/${page}`)) continue;
  let code = fs.readFileSync(`src/components/${page}`, 'utf8');

  // We want to replace <button ... onClick={onXyz} ... </button>
  // with {onXyz && (<button ... onClick={onXyz} ... </button>)}
  
  const restrictedProps = [
    'onOpenAddDemand', 'onEditDemand', 'onDeleteDemand',
    'onOpenCreatePO', 'onOpenEditPO', 'onOpenReceiveCargo', 'onDeletePO', 'onOpenReceivePO',
    'onOpenCustomerReturnModal', 'onOpenVendorReturnModal', 'onDeleteCustomerReturn', 'onDeleteVendorReturn',
    'onOpenCreateQuotation', 'onEditQuotation', 'onDeleteQuotation',
    'onOpenAdjustModal', 'onOpenCashModal', 'onOpenPurchaseModal', 'onDeleteLedgerEntry',
    'onDeleteExpense', 'onOpenAddExpense', 'onOpenNewSale', 'onOpenNewPurchase', 'onOpenAddProduct',
    'onDeleteSale', 'onOpenCustomerReturn', 'onEdit', 'onDelete', 'onDuplicate', 'onPrintLabel', 'onAdjustStock',
    'onOpenAddVendorModal', 'onOpenEditVendorModal', 'onDeleteVendor', 'onOpenConfigureLinksModal'
  ];

  for (const prop of restrictedProps) {
    // Need to handle both onClick={prop} and onClick={() => prop(...)}
    // A robust way to hide elements that use these props is to replace the start of the button.
    // However, it's easier to find the exact JSX block.
    // Let's use a regex that finds <button[^>]*onClick=\{[^}]*prop[^}]*\}[^>]*>[\s\S]*?<\/button>
    // but wait, some are within a <div> or menu item.
    // Let's just find <button ... onClick={prop} ... </button>
    const regex = new RegExp(`(<button[^>]*onClick=\\{[^}]*\\b${prop}\\b[^}]*\\}[^>]*>[\\s\\S]*?<\\/button>)`, 'g');
    
    code = code.replace(regex, (match) => {
      // Check if it's already wrapped in a condition (rudimentary check)
      if (match.includes(`{${prop} &&`)) return match;
      return `{${prop} ? ${match} : null}`;
    });
  }

  fs.writeFileSync(`src/components/${page}`, code);
}

console.log("Wrapped buttons in condition");
