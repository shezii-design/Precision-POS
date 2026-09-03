const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "import { getSupabaseClient, syncAllModulesToSupabase, fetchAllFromSupabase } from './services/supabase';",
  "import { getSupabaseClient, syncAllModulesToSupabase, fetchAllFromSupabase, wipeAllSupabaseData } from './services/supabase';"
);

const handleWipeDataOrig = `  const handleWipeData = (downloadBackup: boolean) => {
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
  };`;

const handleWipeDataNew = `  const handleWipeData = async (downloadBackup: boolean) => {
    if (downloadBackup) {
      handleExportFullBackup();
    }
    
    // Clear Supabase Data first if configured
    if (supabaseConfig.enabled && supabaseConfig.url && supabaseConfig.anonKey) {
      const client = getSupabaseClient(supabaseConfig);
      if (client) {
        await wipeAllSupabaseData(client);
      }
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
    
    // Clear the sync cache to ensure the empty state syncs properly or avoids ghost syncs
    prevSyncState.current = {};
    
    setShowWipeDataModal(false);
    showToast('Factory Reset', 'All Data Erased');
  };`;

code = code.replace(handleWipeDataOrig, handleWipeDataNew);

fs.writeFileSync('src/App.tsx', code);
console.log('Patched App.tsx wipe data');
