const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Import FactoryResetModal
code = code.replace(
  "import { AuthModal } from './components/AuthModal';",
  "import { AuthModal } from './components/AuthModal';\nimport { FactoryResetModal } from './components/FactoryResetModal';"
);

// 2. Add State for showWipeDataModal
const stateHook = '  const [showWipeDataModal, setShowWipeDataModal] = useState<boolean>(false);';
code = code.replace(
  '  const [showStaffModal, setShowStaffModal] = useState<boolean>(false);',
  '  const [showStaffModal, setShowStaffModal] = useState<boolean>(false);\n' + stateHook
);

// 3. Add handleExportFullBackup and handleWipeData right before return
const newFunctions = `
  const handleExportFullBackup = () => {
    const backupData = {
      products, brands, types, locations, customers, customerLedger, sales,
      customerReturns, vendors, vendorLedger: ledgerEntries, vendorReturns, purchases, purchaseOrders,
      quotations, demands, expenses, employees, registeredDevices: getStoredRegisteredDevices(), stockLogs, pricingSettings
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "inventory_full_backup_" + new Date().toISOString() + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showToast('Backup Exported', 'JSON File Saved');
  };

  const handleWipeData = (downloadBackup: boolean) => {
    if (downloadBackup) {
      handleExportFullBackup();
    }
    
    // Wipe all state
    setProducts([]);
    setBrands([]);
    setTypes([]);
    setLocations([]);
    setSales([]);
    setCustomers([]);
    setCustomerLedger([]);
    setCustomerReturns([]);
    setVendors([]);
    setLedgerEntries([]);
    setVendorReturns([]);
    setPurchases([]);
    setPurchaseOrders([]);
    setQuotations([]);
    setDemands([]);
    setExpenses([]);
    setStockLogs([]);
    
    setShowWipeDataModal(false);
    showToast('Factory Reset', 'All Data Erased');
  };
`;

code = code.replace(
  '  // --- Render ---',
  newFunctions + '\n  // --- Render ---'
);

// 4. Render FactoryResetModal
const modalRender = `
      <FactoryResetModal
        isOpen={showWipeDataModal}
        onClose={() => setShowWipeDataModal(false)}
        onConfirmWipe={handleWipeData}
      />
`;
code = code.replace(
  '      <AuthModal',
  modalRender + '      <AuthModal'
);

// 5. Pass onOpenWipeData to Navbar
code = code.replace(
  '        onOpenSecuritySettings={() => setShowSecurityModal(true)}',
  '        onOpenSecuritySettings={() => setShowSecurityModal(true)}\n        onOpenWipeData={() => setShowWipeDataModal(true)}'
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched App.tsx with wipe functionality');
