const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf-8');

const wipeFunc = `
export async function wipeAllSupabaseData(client: SupabaseClient): Promise<boolean> {
  const tablesToWipe = [
    'inventory_stock_logs',
    'sales',
    'customer_returns',
    'purchases',
    'purchase_orders',
    'vendor_returns',
    'quotations',
    'demands',
    'expenses',
    'customer_ledger',
    'vendor_ledger',
    'inventory_products',
    'customers',
    'vendors',
    'inventory_brands',
    'inventory_types',
    'inventory_locations'
  ];

  try {
    for (const table of tablesToWipe) {
      const { error } = await client.from(table).delete().not('id', 'is', null);
      if (error && error.code !== '42P01') {
        console.error(\`Failed to wipe table \${table}:\`, error);
      }
    }
    return true;
  } catch (err) {
    console.error('Wipe data failed:', err);
    return false;
  }
}
`;

code = code.replace(
  'export async function syncAllModulesToSupabase(',
  wipeFunc + '\nexport async function syncAllModulesToSupabase('
);

fs.writeFileSync('src/services/supabase.ts', code);
console.log('Added wipeAllSupabaseData');
