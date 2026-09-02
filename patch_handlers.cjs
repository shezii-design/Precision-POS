const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const functionsToPatch = [
  'handleSaveExpense',
  'handleDeleteExpense',
  'handleEditQuotation',
  'handleSaveQuotation',
  'handleDeleteQuotation',
  'handleSavePO',
  'handleDeletePO',
  'handleSaveDemand',
  'handleDeleteDemand',
  'handleEditSale',
  'handleSaveVendor',
  'handleDeleteVendor',
  'handleSaveCashEntry',
  'handleDeleteLedgerEntry',
  'handleSavePurchase',
  'handleDeletePurchase',
  'handleSaveLinkedProducts',
  'handleSaveCustomerReturn',
  'handleDeleteCustomerReturn',
  'handleSaveVendorReturn',
  'handleDeleteVendorReturn',
  'handleEditProduct',
  'handleSaveProduct',
  'handleDeleteProduct',
  'handleSaveStock',
  'handleSavePricingSettings',
  'handleOpenCreateQuotation',
  'handleOpenCreatePO',
  'handleOpenEditPO',
  'handleOpenReceiveCargo',
  'handleOpenCreateDemand',
  'handleOpenEditDemand',
  'handleOpenNewSale',
  'handleOpenAddVendorModal',
  'handleOpenEditVendorModal',
  'handleOpenCashModal',
  'handleOpenPurchaseModal',
  'handleOpenConfigureLinksModal',
  'handleOpenCustomerReturnModal',
  'handleOpenVendorReturnModal',
  'handleOpenAddProduct',
  'handleOpenStockAdjust',
  'handleDeleteCustomer'
];

functionsToPatch.forEach(fn => {
  const regex = new RegExp(`(const ${fn} = \\([^)]*\\)(?: *: *[^=]+)? *=> *{)`);
  if (regex.test(code)) {
    code = code.replace(regex, `$1\n    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', 'error'); return; }`);
  } else {
    console.warn(`Function ${fn} not found.`);
  }
});

fs.writeFileSync('src/App.tsx', code);
console.log('patched App.tsx handlers');
