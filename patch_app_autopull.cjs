const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const importFullBackupFunc = `
  const handleImportFullBackup = (data: any) => {
    if (data.products && Array.isArray(data.products)) {
      saveStoredProducts(data.products);
      setProducts(data.products);
    }
    if (data.brands && Array.isArray(data.brands)) {
      saveStoredBrands(data.brands);
      setBrands(data.brands);
    }
    if (data.types && Array.isArray(data.types)) {
      saveStoredTypes(data.types);
      setTypes(data.types);
    }
    if (data.locations && Array.isArray(data.locations)) {
      saveStoredLocations(data.locations);
      setLocations(data.locations);
    }
    if (data.customers && Array.isArray(data.customers)) {
      saveStoredCustomers(data.customers);
      setCustomers(data.customers);
    }
    if (data.customerLedger && Array.isArray(data.customerLedger)) {
      saveStoredCustomerLedger(data.customerLedger);
      setCustomerLedger(data.customerLedger);
    }
    if (data.sales && Array.isArray(data.sales)) {
      saveStoredSales(data.sales);
      setSales(data.sales);
    }
    if (data.customerReturns && Array.isArray(data.customerReturns)) {
      saveStoredCustomerReturns(data.customerReturns);
      setCustomerReturns(data.customerReturns);
    }
    if (data.vendors && Array.isArray(data.vendors)) {
      saveStoredVendors(data.vendors);
      setVendors(data.vendors);
    }
    if (data.vendorLedger && Array.isArray(data.vendorLedger)) {
      saveStoredVendorLedgerEntries(data.vendorLedger);
      setLedgerEntries(data.vendorLedger);
    }
    if (data.vendorReturns && Array.isArray(data.vendorReturns)) {
      saveStoredVendorReturns(data.vendorReturns);
      setVendorReturns(data.vendorReturns);
    }
    if (data.purchases && Array.isArray(data.purchases)) {
      saveStoredPurchases(data.purchases);
      setPurchases(data.purchases);
    }
    if (data.purchaseOrders && Array.isArray(data.purchaseOrders)) {
      saveStoredPurchaseOrders(data.purchaseOrders);
      setPurchaseOrders(data.purchaseOrders);
    }
    if (data.quotations && Array.isArray(data.quotations)) {
      saveStoredQuotations(data.quotations);
      setQuotations(data.quotations);
    }
    if (data.demands && Array.isArray(data.demands)) {
      saveStoredDemands(data.demands);
      setDemands(data.demands);
    }
    if (data.expenses && Array.isArray(data.expenses)) {
      saveStoredExpenses(data.expenses);
      setExpenses(data.expenses);
    }
    if (data.employees && Array.isArray(data.employees)) {
      saveStoredEmployees(data.employees);
      setEmployees(data.employees);
    }
    if (data.stockLogs && Array.isArray(data.stockLogs)) {
      saveStoredStockLogs(data.stockLogs);
      setStockLogs(data.stockLogs);
    }
    if (data.pricingSettings) {
      saveStoredPricingSettings(data.pricingSettings);
      setPricingSettings(data.pricingSettings);
    }
  };

  const hasInitialPulled = useRef(false);

  // Initial pull from cloud on mount
  useEffect(() => {
    if (!hasInitialPulled.current && supabaseConfig.enabled && supabaseConfig.url && supabaseConfig.anonKey) {
      hasInitialPulled.current = true;
      const client = getSupabaseClient(supabaseConfig);
      if (client) {
        fetchAllFromSupabase(client).then(res => {
          if (res.success && res.data) {
            handleImportFullBackup(res.data);
          }
        });
      }
    }
  }, [supabaseConfig.enabled, supabaseConfig.url, supabaseConfig.anonKey]);
`;

// Insert the code just before `  // Background cloud sync with debounce if Supabase is enabled`
code = code.replace(
  '  // Background cloud sync with debounce if Supabase is enabled',
  importFullBackupFunc + '\n  // Background cloud sync with debounce if Supabase is enabled'
);

// We need to replace the inline onImportFullBackup to use handleImportFullBackup
const oldOnImport = `        onImportFullBackup={(data: any) => {
          if (data.products && Array.isArray(data.products)) {
            saveStoredProducts(data.products);
            setProducts(data.products);
          }
          if (data.brands && Array.isArray(data.brands)) {
            saveStoredBrands(data.brands);
            setBrands(data.brands);
          }
          if (data.types && Array.isArray(data.types)) {
            saveStoredTypes(data.types);
            setTypes(data.types);
          }
          if (data.locations && Array.isArray(data.locations)) {
            saveStoredLocations(data.locations);
            setLocations(data.locations);
          }
          if (data.customers && Array.isArray(data.customers)) {
            saveStoredCustomers(data.customers);
            setCustomers(data.customers);
          }
          if (data.customerLedger && Array.isArray(data.customerLedger)) {
            saveStoredCustomerLedger(data.customerLedger);
            setCustomerLedger(data.customerLedger);
          }
          if (data.sales && Array.isArray(data.sales)) {
            saveStoredSales(data.sales);
            setSales(data.sales);
          }
          if (data.customerReturns && Array.isArray(data.customerReturns)) {
            saveStoredCustomerReturns(data.customerReturns);
            setCustomerReturns(data.customerReturns);
          }
          if (data.vendors && Array.isArray(data.vendors)) {
            saveStoredVendors(data.vendors);
            setVendors(data.vendors);
          }
          if (data.vendorLedger && Array.isArray(data.vendorLedger)) {
            saveStoredVendorLedgerEntries(data.vendorLedger);
            setLedgerEntries(data.vendorLedger);
          }
          if (data.vendorReturns && Array.isArray(data.vendorReturns)) {
            saveStoredVendorReturns(data.vendorReturns);
            setVendorReturns(data.vendorReturns);
          }
          if (data.purchases && Array.isArray(data.purchases)) {
            saveStoredPurchases(data.purchases);
            setPurchases(data.purchases);
          }
          if (data.purchaseOrders && Array.isArray(data.purchaseOrders)) {
            saveStoredPurchaseOrders(data.purchaseOrders);
            setPurchaseOrders(data.purchaseOrders);
          }
          if (data.quotations && Array.isArray(data.quotations)) {
            saveStoredQuotations(data.quotations);
            setQuotations(data.quotations);
          }
          if (data.demands && Array.isArray(data.demands)) {
            saveStoredDemands(data.demands);
            setDemands(data.demands);
          }
          if (data.expenses && Array.isArray(data.expenses)) {
            saveStoredExpenses(data.expenses);
            setExpenses(data.expenses);
          }
          if (data.employees && Array.isArray(data.employees)) {
            saveStoredEmployees(data.employees);
            setEmployees(data.employees);
          }
          if (data.stockLogs && Array.isArray(data.stockLogs)) {
            saveStoredStockLogs(data.stockLogs);
            setStockLogs(data.stockLogs);
          }
          if (data.pricingSettings) {
            saveStoredPricingSettings(data.pricingSettings);
            setPricingSettings(data.pricingSettings);
          }
        }}`;

code = code.replace(oldOnImport, '        onImportFullBackup={handleImportFullBackup}');

fs.writeFileSync('src/App.tsx', code);
console.log('patched autopull');
