const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = {
  // Expenses
  'onDeleteExpense={handleDeleteExpense}': "onDeleteExpense={isActionAllowed(currentEmployee, 'canManageExpenses') ? handleDeleteExpense : undefined}",
  
  // Demands
  'onOpenAddDemand={handleOpenCreateDemand}': "onOpenAddDemand={isActionAllowed(currentEmployee, 'canManageDemands') ? handleOpenCreateDemand : undefined}",
  'onEditDemand={handleOpenEditDemand}': "onEditDemand={isActionAllowed(currentEmployee, 'canManageDemands') ? handleOpenEditDemand : undefined}",
  'onDeleteDemand={handleDeleteDemand}': "onDeleteDemand={isActionAllowed(currentEmployee, 'canManageDemands') ? handleDeleteDemand : undefined}",
  
  // Purchase Orders
  'onOpenCreatePO={handleOpenCreatePO}': "onOpenCreatePO={isActionAllowed(currentEmployee, 'canCreatePurchaseOrders') ? handleOpenCreatePO : undefined}",
  'onOpenEditPO={handleOpenEditPO}': "onOpenEditPO={isActionAllowed(currentEmployee, 'canCreatePurchaseOrders') ? handleOpenEditPO : undefined}",
  'onOpenReceiveCargo={handleOpenReceiveCargo}': "onOpenReceiveCargo={isActionAllowed(currentEmployee, 'canReceivePurchaseOrders') ? handleOpenReceiveCargo : undefined}",
  'onDeletePO={handleDeletePO}': "onDeletePO={isActionAllowed(currentEmployee, 'canCreatePurchaseOrders') ? handleDeletePO : undefined}",
  'onOpenReceivePO={handleOpenReceiveCargo}': "onOpenReceivePO={isActionAllowed(currentEmployee, 'canReceivePurchaseOrders') ? handleOpenReceiveCargo : undefined}",
  
  // Returns
  'onOpenCustomerReturnModal={handleOpenCustomerReturnModal}': "onOpenCustomerReturnModal={isActionAllowed(currentEmployee, 'canProcessReturns') ? handleOpenCustomerReturnModal : undefined}",
  'onOpenVendorReturnModal={handleOpenVendorReturnModal}': "onOpenVendorReturnModal={isActionAllowed(currentEmployee, 'canProcessReturns') ? handleOpenVendorReturnModal : undefined}",
  'onDeleteCustomerReturn={handleDeleteCustomerReturn}': "onDeleteCustomerReturn={isActionAllowed(currentEmployee, 'canProcessReturns') ? handleDeleteCustomerReturn : undefined}",
  'onDeleteVendorReturn={handleDeleteVendorReturn}': "onDeleteVendorReturn={isActionAllowed(currentEmployee, 'canProcessReturns') ? handleDeleteVendorReturn : undefined}",
  
  // Quotations
  'onOpenCreateQuotation={handleOpenCreateQuotation}': "onOpenCreateQuotation={isActionAllowed(currentEmployee, 'canManageQuotations') ? handleOpenCreateQuotation : undefined}",
  'onEditQuotation={handleEditQuotation}': "onEditQuotation={isActionAllowed(currentEmployee, 'canManageQuotations') ? handleEditQuotation : undefined}",
  'onDeleteQuotation={handleDeleteQuotation}': "onDeleteQuotation={isActionAllowed(currentEmployee, 'canManageQuotations') ? handleDeleteQuotation : undefined}",
  
  // Customers
  'onOpenNewSale={(cId, items) => handleOpenNewSale(cId, items)}': "onOpenNewSale={isActionAllowed(currentEmployee, 'canCreateSales') ? (cId, items) => handleOpenNewSale(cId, items) : undefined}",
  
  // Vendors (VendorDetailsPage & VendorsPage)
  'onOpenCashModal={handleOpenCashModal}': "onOpenCashModal={isActionAllowed(currentEmployee, 'canRecordVendorPayments') ? handleOpenCashModal : undefined}",
  'onOpenPurchaseModal={handleOpenPurchaseModal}': "onOpenPurchaseModal={isActionAllowed(currentEmployee, 'canCreatePurchases') ? handleOpenPurchaseModal : undefined}",
  'onOpenEditVendorModal={handleOpenEditVendorModal}': "onOpenEditVendorModal={isActionAllowed(currentEmployee, 'canManageVendors') ? handleOpenEditVendorModal : undefined}",
  'onDeleteLedgerEntry={handleDeleteLedgerEntry}': "onDeleteLedgerEntry={isActionAllowed(currentEmployee, 'canRecordVendorPayments') ? handleDeleteLedgerEntry : undefined}",
  'onOpenAddVendorModal={handleOpenAddVendorModal}': "onOpenAddVendorModal={isActionAllowed(currentEmployee, 'canManageVendors') ? handleOpenAddVendorModal : undefined}",

  // Inventory Audit
  'onOpenAdjustModal={(product) => handleOpenStockAdjust(product)}': "onOpenAdjustModal={isActionAllowed(currentEmployee, 'canAdjustStock') ? (product) => handleOpenStockAdjust(product) : undefined}"
};

for (const [key, value] of Object.entries(replacements)) {
  code = code.split(key).join(value);
}

fs.writeFileSync('src/App.tsx', code);
console.log("Patched remaining App.tsx permissions");
