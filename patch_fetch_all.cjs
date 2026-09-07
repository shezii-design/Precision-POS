const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf-8');

const targetFetch = `export async function fetchAllFromSupabase(client: SupabaseClient): Promise<{
  success: boolean;
  data?: {
    products: Product[];
    brands: Brand[];
    types: ProductType[];
    locations: LocationItem[];
    customers: Customer[];
    customerLedger: CustomerLedgerEntry[];
    sales: Sale[];
    customerReturns: CustomerReturn[];
    vendors: Vendor[];
    vendorLedger: VendorLedgerEntry[];
    vendorReturns: VendorReturn[];
    purchases: Purchase[];
    purchaseOrders: PurchaseOrder[];
    quotations: Quotation[];
    demands: Demand[];
    expenses: Expense[];
    employees: EmployeeAccount[];
    registeredDevices: RegisteredDevice[];
    stockLogs: StockLog[];
    pricingSettings?: GlobalPricingSettings;
  };
  error?: string;
}> {
  try {`;

const replacementFetch = `export async function fetchAllFromSupabase(client: SupabaseClient): Promise<{
  success: boolean;
  data?: {
    products: Product[];
    brands: Brand[];
    types: ProductType[];
    locations: LocationItem[];
    customers: Customer[];
    customerLedger: CustomerLedgerEntry[];
    sales: Sale[];
    customerReturns: CustomerReturn[];
    vendors: Vendor[];
    vendorLedger: VendorLedgerEntry[];
    vendorReturns: VendorReturn[];
    purchases: Purchase[];
    purchaseOrders: PurchaseOrder[];
    quotations: Quotation[];
    demands: Demand[];
    expenses: Expense[];
    employees: EmployeeAccount[];
    registeredDevices: RegisteredDevice[];
    stockLogs: StockLog[];
    pricingSettings?: GlobalPricingSettings;
  };
  error?: string;
}> {
  try {
    // Quick check to avoid spamming the console with 20x 404s if the tables haven't been created yet
    const { error: healthErr } = await client.from('inventory_products').select('id').limit(1);
    if (healthErr && (healthErr.code === '42P01' || healthErr.code === 'PGRST205')) {
      return { 
        success: true, 
        data: { 
          products: [], brands: [], types: [], locations: [], customers: [], customerLedger: [], 
          sales: [], customerReturns: [], vendors: [], vendorLedger: [], vendorReturns: [], 
          purchases: [], purchaseOrders: [], quotations: [], demands: [], expenses: [], 
          employees: [], registeredDevices: [], stockLogs: [] 
        } 
      };
    }`;

code = code.replace(targetFetch, replacementFetch);

const targetSync = `export async function syncAllModulesToSupabase(
  client: SupabaseClient,
  bundle: FullSyncDataBundle
): Promise<FullSyncResult> {
  const errors: string[] = [];`;

const replacementSync = `export async function syncAllModulesToSupabase(
  client: SupabaseClient,
  bundle: FullSyncDataBundle
): Promise<FullSyncResult> {
  const errors: string[] = [];
  
  // Quick check to avoid spamming the console with 20x 404s if the tables haven't been created yet
  const { error: healthErr } = await client.from('inventory_products').select('id').limit(1);
  if (healthErr && (healthErr.code === '42P01' || healthErr.code === 'PGRST205')) {
    return { success: true, errors: ['Database tables not found. Please run the SQL schema.'], syncedCounts: { products: 0, customers: 0, customerLedger: 0, sales: 0, customerReturns: 0, vendors: 0, vendorLedger: 0, vendorReturns: 0, purchases: 0, purchaseOrders: 0, quotations: 0, demands: 0, expenses: 0, employees: 0, devices: 0, stockLogs: 0, masterData: 0 } };
  }`;

code = code.replace(targetSync, replacementSync);

fs.writeFileSync('src/services/supabase.ts', code);
console.log('Patched supabase.ts to avoid 404 spam');
