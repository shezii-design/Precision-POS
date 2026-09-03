const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /  \/\/ Background cloud sync with debounce if Supabase is enabled[\s\S]*?\]\);/m;

const replacement = `  // Background cloud sync with debounce if Supabase is enabled
  const prevSyncState = useRef<any>({});

  useEffect(() => {
    if (!supabaseConfig.enabled || !supabaseConfig.url || !supabaseConfig.anonKey) {
      return;
    }

    const currentDevices = getStoredRegisteredDevices();

    const currentBundle: any = {
      products, brands, types, locations, customers, customerLedger, sales,
      customerReturns, vendors, vendorLedger: ledgerEntries, vendorReturns, purchases, purchaseOrders,
      quotations, demands, expenses, employees, registeredDevices: currentDevices, stockLogs, pricingSettings
    };

    const changedBundle: any = {};
    let hasChanges = false;

    for (const key in currentBundle) {
      if (key === 'registeredDevices') {
        if (JSON.stringify(currentBundle[key]) !== JSON.stringify(prevSyncState.current[key])) {
          changedBundle[key] = currentBundle[key];
          hasChanges = true;
        }
      } else {
        if (currentBundle[key] !== prevSyncState.current[key]) {
          changedBundle[key] = currentBundle[key];
          hasChanges = true;
        }
      }
    }

    if (!hasChanges) {
      return;
    }

    const timer = setTimeout(() => {
      const client = getSupabaseClient(supabaseConfig);
      if (client) {
        syncAllModulesToSupabase(client, changedBundle).then((res) => {
          if (res.success) {
            for (const key in changedBundle) {
              prevSyncState.current[key] = changedBundle[key];
            }
            setSupabaseConfig(prev => ({
              ...prev,
              lastSyncedAt: new Date().toISOString(),
              syncStatus: 'connected',
            }));
          }
        });
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [
    products, brands, types, locations, customers, customerLedger, sales,
    customerReturns, vendors, ledgerEntries, vendorReturns, purchases, purchaseOrders,
    quotations, demands, expenses, employees, stockLogs, pricingSettings,
    supabaseConfig.enabled, supabaseConfig.url, supabaseConfig.anonKey
  ]);`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/App.tsx', code);
console.log('patched App.tsx');
