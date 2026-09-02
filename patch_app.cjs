const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldSync = `  // Background cloud sync with debounce if Supabase is enabled
  useEffect(() => {
    if (!supabaseConfig.enabled || !supabaseConfig.url || !supabaseConfig.anonKey) {
      return;
    }

    const timer = setTimeout(() => {
      const client = getSupabaseClient(supabaseConfig);
      if (client) {
        syncProductsToSupabase(client, products).then((res) => {
          if (res.success) {
            setSupabaseConfig(prev => ({
              ...prev,
              lastSyncedAt: new Date().toISOString(),
              syncStatus: 'connected',
            }));
          }
        });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [products, supabaseConfig.enabled, supabaseConfig.url, supabaseConfig.anonKey]);`;

const newSync = `  // Background cloud sync with debounce if Supabase is enabled
  useEffect(() => {
    if (!supabaseConfig.enabled || !supabaseConfig.url || !supabaseConfig.anonKey) {
      return;
    }

    const timer = setTimeout(() => {
      const client = getSupabaseClient(supabaseConfig);
      if (client) {
        const bundle = {
          products, brands, types, locations, customers, customerLedger, sales,
          customerReturns, vendors, vendorLedger, vendorReturns, purchases, purchaseOrders,
          quotations, demands, expenses, employees, registeredDevices, stockLogs, pricingSettings
        };
        syncAllModulesToSupabase(client, bundle).then((res) => {
          if (res.success) {
            setSupabaseConfig(prev => ({
              ...prev,
              lastSyncedAt: new Date().toISOString(),
              syncStatus: 'connected',
            }));
          }
        });
      }
    }, 5000); // 5 seconds debounce to prevent spamming

    return () => clearTimeout(timer);
  }, [
    products, brands, types, locations, customers, customerLedger, sales,
    customerReturns, vendors, vendorLedger, vendorReturns, purchases, purchaseOrders,
    quotations, demands, expenses, employees, registeredDevices, stockLogs, pricingSettings,
    supabaseConfig.enabled, supabaseConfig.url, supabaseConfig.anonKey
  ]);`;

if (code.includes('syncProductsToSupabase(client, products).then')) {
    code = code.replace(oldSync, newSync);
    // Also we need to import syncAllModulesToSupabase
    code = code.replace(
      "import { getSupabaseClient, syncProductsToSupabase } from './services/supabase';",
      "import { getSupabaseClient, syncAllModulesToSupabase } from './services/supabase';"
    );
    fs.writeFileSync('src/App.tsx', code);
    console.log("App.tsx patched");
} else {
    console.log("Could not find the target string in App.tsx");
}
