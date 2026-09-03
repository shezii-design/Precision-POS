const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf-8');

// Make all FullSyncDataBundle properties optional
code = code.replace(
  `export interface FullSyncDataBundle {
  products: Product[];
  brands: Brand[];
  types: ProductType[];
  locations: LocationItem[];
  customers: Customer[];
  customerLedger: CustomerLedgerEntry[];
  sales?: Sale[];
  customerReturns?: CustomerReturn[];
  vendors: Vendor[];
  vendorLedger?: VendorLedgerEntry[];
  vendorReturns?: VendorReturn[];
  purchases: Purchase[];
  purchaseOrders: PurchaseOrder[];
  quotations: Quotation[];
  demands: Demand[];
  expenses: Expense[];
  employees: EmployeeAccount[];
  registeredDevices: RegisteredDevice[];
  stockLogs: StockLog[];
  pricingSettings?: GlobalPricingSettings;
}`,
  `export interface FullSyncDataBundle {
  products?: Product[];
  brands?: Brand[];
  types?: ProductType[];
  locations?: LocationItem[];
  customers?: Customer[];
  customerLedger?: CustomerLedgerEntry[];
  sales?: Sale[];
  customerReturns?: CustomerReturn[];
  vendors?: Vendor[];
  vendorLedger?: VendorLedgerEntry[];
  vendorReturns?: VendorReturn[];
  purchases?: Purchase[];
  purchaseOrders?: PurchaseOrder[];
  quotations?: Quotation[];
  demands?: Demand[];
  expenses?: Expense[];
  employees?: EmployeeAccount[];
  registeredDevices?: RegisteredDevice[];
  stockLogs?: StockLog[];
  pricingSettings?: GlobalPricingSettings;
}`
);

// We need to wrap each block in syncAllModulesToSupabase with an if check.
// I'll do this with string replaces for the specific blocks.

const replacements = [
  {
    find: `  // 1. Products
  try {
    const prodRes = await syncProductsToSupabase(client, bundle.products);`,
    replace: `  // 1. Products
  if (bundle.products) {
  try {
    const prodRes = await syncProductsToSupabase(client, bundle.products);`
  },
  {
    find: `  } catch (e: any) {
    errors.push(\`Products: \${e.message}\`);
  }`,
    replace: `  } catch (e: any) {
    errors.push(\`Products: \${e.message}\`);
  }
  }`
  },
  {
    find: `  // 2. Master Data
  try {
    const masterRes = await syncMasterDataToSupabase(client, bundle.brands, bundle.types, bundle.locations);`,
    replace: `  // 2. Master Data
  if (bundle.brands || bundle.types || bundle.locations) {
  try {
    const masterRes = await syncMasterDataToSupabase(client, bundle.brands || [], bundle.types || [], bundle.locations || []);`
  },
  {
    find: `  } catch (e: any) {
    errors.push(\`Master Data: \${e.message}\`);
  }`,
    replace: `  } catch (e: any) {
    errors.push(\`Master Data: \${e.message}\`);
  }
  }`
  },
  {
    find: `  // 3. Customers & Ledgers
  try {
    const custRes = await syncCustomersToSupabase(client, bundle.customers, bundle.customerLedger);`,
    replace: `  // 3. Customers & Ledgers
  if (bundle.customers || bundle.customerLedger) {
  try {
    const custRes = await syncCustomersToSupabase(client, bundle.customers || [], bundle.customerLedger || []);`
  },
  {
    find: `  } catch (e: any) {
    errors.push(\`Customers: \${e.message}\`);
  }`,
    replace: `  } catch (e: any) {
    errors.push(\`Customers: \${e.message}\`);
  }
  }`
  },
  {
    find: `  // 4. Sales & Customer Returns
  try {
    const salesRes = await syncSalesToSupabase(client, bundle.sales || []);`,
    replace: `  // 4. Sales & Customer Returns
  if (bundle.sales) {
  try {
    const salesRes = await syncSalesToSupabase(client, bundle.sales);`
  },
  {
    find: `  } catch (e: any) {
    errors.push(\`Sales: \${e.message}\`);
  }`,
    replace: `  } catch (e: any) {
    errors.push(\`Sales: \${e.message}\`);
  }
  }`
  },
  {
    find: `  try {
    const crRes = await syncCustomerReturnsToSupabase(client, bundle.customerReturns || []);`,
    replace: `  if (bundle.customerReturns) {
  try {
    const crRes = await syncCustomerReturnsToSupabase(client, bundle.customerReturns);`
  },
  {
    find: `  } catch (e: any) {
    errors.push(\`Customer Returns: \${e.message}\`);
  }`,
    replace: `  } catch (e: any) {
    errors.push(\`Customer Returns: \${e.message}\`);
  }
  }`
  },
  {
    find: `  // 5. Vendors & Purchases
  try {
    const vendRes = await syncVendorsAndPurchasesToSupabase(client, bundle.vendors, bundle.purchases, bundle.purchaseOrders);`,
    replace: `  // 5. Vendors & Purchases
  if (bundle.vendors || bundle.purchases || bundle.purchaseOrders) {
  try {
    const vendRes = await syncVendorsAndPurchasesToSupabase(client, bundle.vendors || [], bundle.purchases || [], bundle.purchaseOrders || []);`
  },
  {
    find: `  } catch (e: any) {
    errors.push(\`Vendors & Purchases: \${e.message}\`);
  }`,
    replace: `  } catch (e: any) {
    errors.push(\`Vendors & Purchases: \${e.message}\`);
  }
  }`
  },
  {
    find: `  // 6. Vendor Ledger & Vendor Returns
  try {
    const vlRes = await syncVendorLedgerToSupabase(client, bundle.vendorLedger || []);`,
    replace: `  // 6. Vendor Ledger & Vendor Returns
  if (bundle.vendorLedger) {
  try {
    const vlRes = await syncVendorLedgerToSupabase(client, bundle.vendorLedger);`
  },
  {
    find: `  } catch (e: any) {
    errors.push(\`Vendor Ledger: \${e.message}\`);
  }`,
    replace: `  } catch (e: any) {
    errors.push(\`Vendor Ledger: \${e.message}\`);
  }
  }`
  },
  {
    find: `  try {
    const vrRes = await syncVendorReturnsToSupabase(client, bundle.vendorReturns || []);`,
    replace: `  if (bundle.vendorReturns) {
  try {
    const vrRes = await syncVendorReturnsToSupabase(client, bundle.vendorReturns);`
  },
  {
    find: `  } catch (e: any) {
    errors.push(\`Vendor Returns: \${e.message}\`);
  }`,
    replace: `  } catch (e: any) {
    errors.push(\`Vendor Returns: \${e.message}\`);
  }
  }`
  },
  {
    find: `  // 7. Quotations
  try {
    const quotRes = await syncQuotationsToSupabase(client, bundle.quotations);`,
    replace: `  // 7. Quotations
  if (bundle.quotations) {
  try {
    const quotRes = await syncQuotationsToSupabase(client, bundle.quotations);`
  },
  {
    find: `  } catch (e: any) {
    errors.push(\`Quotations: \${e.message}\`);
  }`,
    replace: `  } catch (e: any) {
    errors.push(\`Quotations: \${e.message}\`);
  }
  }`
  },
  {
    find: `  // 8. Demands
  try {
    const demRes = await syncDemandsToSupabase(client, bundle.demands);`,
    replace: `  // 8. Demands
  if (bundle.demands) {
  try {
    const demRes = await syncDemandsToSupabase(client, bundle.demands);`
  },
  {
    find: `  } catch (e: any) {
    errors.push(\`Demands: \${e.message}\`);
  }`,
    replace: `  } catch (e: any) {
    errors.push(\`Demands: \${e.message}\`);
  }
  }`
  },
  {
    find: `  // 9. Expenses
  try {
    const expRes = await syncExpensesToSupabase(client, bundle.expenses);`,
    replace: `  // 9. Expenses
  if (bundle.expenses) {
  try {
    const expRes = await syncExpensesToSupabase(client, bundle.expenses);`
  },
  {
    find: `  } catch (e: any) {
    errors.push(\`Expenses: \${e.message}\`);
  }`,
    replace: `  } catch (e: any) {
    errors.push(\`Expenses: \${e.message}\`);
  }
  }`
  },
  {
    find: `  // 10. Employees
  try {
    const empRes = await syncEmployeesToSupabase(client, bundle.employees);`,
    replace: `  // 10. Employees
  if (bundle.employees) {
  try {
    const empRes = await syncEmployeesToSupabase(client, bundle.employees);`
  },
  {
    find: `  } catch (e: any) {
    errors.push(\`Employees: \${e.message}\`);
  }`,
    replace: `  } catch (e: any) {
    errors.push(\`Employees: \${e.message}\`);
  }
  }`
  },
  {
    find: `  // 11. Devices
  try {
    const devRes = await syncDevicesToSupabase(client, bundle.registeredDevices);`,
    replace: `  // 11. Devices
  if (bundle.registeredDevices) {
  try {
    const devRes = await syncDevicesToSupabase(client, bundle.registeredDevices);`
  },
  {
    find: `  } catch (e: any) {
    errors.push(\`Devices: \${e.message}\`);
  }`,
    replace: `  } catch (e: any) {
    errors.push(\`Devices: \${e.message}\`);
  }
  }`
  },
  {
    find: `  // 12. Stock Logs
  try {
    const slRes = await syncStockLogsToSupabase(client, bundle.stockLogs);`,
    replace: `  // 12. Stock Logs
  if (bundle.stockLogs) {
  try {
    const slRes = await syncStockLogsToSupabase(client, bundle.stockLogs);`
  },
  {
    find: `  } catch (e: any) {
    errors.push(\`Stock Logs: \${e.message}\`);
  }`,
    replace: `  } catch (e: any) {
    errors.push(\`Stock Logs: \${e.message}\`);
  }
  }`
  }
];

replacements.forEach(r => {
  code = code.replace(r.find, r.replace);
});

fs.writeFileSync('src/services/supabase.ts', code);
console.log('patched supabase.ts');
