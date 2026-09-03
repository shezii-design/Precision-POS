const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const injection = `
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
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showToast('Backup Exported', 'JSON File Saved');
  };

  const handleWipeData = (downloadBackup: boolean) => {
    if (downloadBackup) {
      handleExportFullBackup();
    }
    
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
  '  const nextInternalId = getNextInternalId(products);',
  '  const nextInternalId = getNextInternalId(products);\n' + injection
);

fs.writeFileSync('src/App.tsx', code);
