const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf-8');

const startStr = "export async function syncAllModulesToSupabase(";
const endStr = "  return {\n    success: errors.length === 0,\n    message: errors.length > 0 ? 'Sync completed with errors' : 'Sync successful',\n    syncedCounts,\n    errors: errors.length > 0 ? errors : undefined,\n  };\n}";

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr, startIndex) + endStr.length;

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find function bounds");
    process.exit(1);
}

const newFunction = `export async function syncAllModulesToSupabase(
  client: SupabaseClient,
  bundle: FullSyncDataBundle
): Promise<FullSyncResult> {
  const errors: string[] = [];
  const syncedCounts = {
    products: 0,
    customers: 0,
    customerLedger: 0,
    sales: 0,
    customerReturns: 0,
    vendors: 0,
    vendorLedger: 0,
    vendorReturns: 0,
    purchases: 0,
    purchaseOrders: 0,
    quotations: 0,
    demands: 0,
    expenses: 0,
    employees: 0,
    devices: 0,
    stockLogs: 0,
    masterData: 0,
  };

  // 1. Products
  if (bundle.products) {
    try {
      const prodRes = await syncProductsToSupabase(client, bundle.products);
      if (prodRes.success) syncedCounts.products = prodRes.count;
      else if (prodRes.error) errors.push(\`Products: \${prodRes.error}\`);
    } catch (e: any) {
      errors.push(\`Products: \${e.message}\`);
    }
  }

  // 2. Master Data
  if (bundle.brands || bundle.types || bundle.locations) {
    try {
      const masterRes = await syncMasterDataToSupabase(client, bundle.brands || [], bundle.types || [], bundle.locations || []);
      if (masterRes.success) syncedCounts.masterData = masterRes.count;
      else if (masterRes.error) errors.push(\`Master Data: \${masterRes.error}\`);
    } catch (e: any) {
      errors.push(\`Master Data: \${e.message}\`);
    }
  }

  // 3. Customers & Ledgers
  if (bundle.customers || bundle.customerLedger) {
    try {
      const custRes = await syncCustomersToSupabase(client, bundle.customers || [], bundle.customerLedger || []);
      if (custRes.success) {
        syncedCounts.customers = custRes.customerCount;
        syncedCounts.customerLedger = custRes.ledgerCount;
      } else if (custRes.error) errors.push(\`Customers: \${custRes.error}\`);
    } catch (e: any) {
      errors.push(\`Customers: \${e.message}\`);
    }
  }

  // 4. Sales & Customer Returns
  if (bundle.sales) {
    try {
      const salesRes = await syncSalesToSupabase(client, bundle.sales);
      if (salesRes.success) syncedCounts.sales = salesRes.count;
      else if (salesRes.error) errors.push(\`Sales: \${salesRes.error}\`);
    } catch (e: any) {
      errors.push(\`Sales: \${e.message}\`);
    }
  }

  if (bundle.customerReturns) {
    try {
      const crRes = await syncCustomerReturnsToSupabase(client, bundle.customerReturns);
      if (crRes.success) syncedCounts.customerReturns = crRes.count;
      else if (crRes.error) errors.push(\`Customer Returns: \${crRes.error}\`);
    } catch (e: any) {
      errors.push(\`Customer Returns: \${e.message}\`);
    }
  }

  // 5. Vendors & Purchases
  if (bundle.vendors || bundle.purchases || bundle.purchaseOrders) {
    try {
      const vendRes = await syncVendorsAndPurchasesToSupabase(client, bundle.vendors || [], bundle.purchases || [], bundle.purchaseOrders || []);
      if (vendRes.success) {
        syncedCounts.vendors = vendRes.vendorCount;
        syncedCounts.purchases = vendRes.purchaseCount;
        syncedCounts.purchaseOrders = vendRes.poCount;
      } else if (vendRes.error) errors.push(\`Vendors & Purchases: \${vendRes.error}\`);
    } catch (e: any) {
      errors.push(\`Vendors & Purchases: \${e.message}\`);
    }
  }

  // 6. Vendor Ledger & Vendor Returns
  if (bundle.vendorLedger) {
    try {
      const vlRes = await syncVendorLedgerToSupabase(client, bundle.vendorLedger);
      if (vlRes.success) syncedCounts.vendorLedger = vlRes.count;
      else if (vlRes.error) errors.push(\`Vendor Ledger: \${vlRes.error}\`);
    } catch (e: any) {
      errors.push(\`Vendor Ledger: \${e.message}\`);
    }
  }

  if (bundle.vendorReturns) {
    try {
      const vrRes = await syncVendorReturnsToSupabase(client, bundle.vendorReturns);
      if (vrRes.success) syncedCounts.vendorReturns = vrRes.count;
      else if (vrRes.error) errors.push(\`Vendor Returns: \${vrRes.error}\`);
    } catch (e: any) {
      errors.push(\`Vendor Returns: \${e.message}\`);
    }
  }

  // 7. Quotations
  if (bundle.quotations) {
    try {
      // @ts-ignore
      const quoteRes = await syncQuotationsToSupabase(client, bundle.quotations);
      if (quoteRes.success) syncedCounts.quotations = quoteRes.count;
      else if (quoteRes.error) errors.push(\`Quotations: \${quoteRes.error}\`);
    } catch (e: any) {
      errors.push(\`Quotations: \${e.message}\`);
    }
  }

  // 8. Demands
  if (bundle.demands) {
    try {
      // @ts-ignore
      const demRes = await syncDemandsToSupabase(client, bundle.demands);
      if (demRes.success) syncedCounts.demands = demRes.count;
      else if (demRes.error) errors.push(\`Demands: \${demRes.error}\`);
    } catch (e: any) {
      errors.push(\`Demands: \${e.message}\`);
    }
  }

  // 9. Expenses
  if (bundle.expenses) {
    try {
      const expRes = await syncExpensesToSupabase(client, bundle.expenses);
      if (expRes.success) syncedCounts.expenses = expRes.count;
      else if (expRes.error) errors.push(\`Expenses: \${expRes.error}\`);
    } catch (e: any) {
      errors.push(\`Expenses: \${e.message}\`);
    }
  }

  // 10. Staff & Devices
  if (bundle.employees || bundle.registeredDevices) {
    try {
      // @ts-ignore
      const staffRes = await syncStaffAndDevicesToSupabase(client, bundle.employees || [], bundle.registeredDevices || []);
      if (staffRes.success) {
        syncedCounts.employees = staffRes.employeeCount;
        syncedCounts.devices = staffRes.deviceCount;
      } else if (staffRes.error) errors.push(\`Staff & Devices: \${staffRes.error}\`);
    } catch (e: any) {
      errors.push(\`Staff & Devices: \${e.message}\`);
    }
  }

  // 11. Stock Logs
  if (bundle.stockLogs) {
    try {
      const slRes = await syncStockLogsToSupabase(client, bundle.stockLogs);
      if (slRes.success) syncedCounts.stockLogs = slRes.count;
      else if (slRes.error) errors.push(\`Stock Logs: \${slRes.error}\`);
    } catch (e: any) {
      errors.push(\`Stock Logs: \${e.message}\`);
    }
  }

  // 12. Pricing Settings
  if (bundle.pricingSettings) {
    try {
      await syncPricingSettingsToSupabase(client, bundle.pricingSettings);
    } catch (e: any) {
      errors.push(\`Pricing Settings: \${e.message}\`);
    }
  }

  return {
    success: errors.length === 0,
    message: errors.length > 0 ? 'Sync completed with errors' : 'Sync successful',
    syncedCounts,
    errors: errors.length > 0 ? errors : undefined,
  };
}`;

const newCode = code.slice(0, startIndex) + newFunction + code.slice(endIndex);
fs.writeFileSync('src/services/supabase.ts', newCode);
console.log('supabase.ts sync rewritten');
