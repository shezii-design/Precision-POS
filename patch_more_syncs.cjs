const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf-8');

// purchase_orders
code = code.replace(
  `      const { error } = await client.from('purchase_orders').upsert(poRows, { onConflict: 'id' });
      if (error) return { success: false, vendorCount: vendors.length, purchaseCount: 0, poCount: 0, error: error.message };`,
  `      const res = await exactSyncRows(client, 'purchase_orders', poRows, 'id');
      if (!res.success) return { success: false, vendorCount: vendors.length, purchaseCount: 0, poCount: 0, error: res.error };`
);

// purchases
code = code.replace(
  `      const { error } = await client.from('purchases').upsert(purchaseRows, { onConflict: 'id' });
      if (error) return { success: false, vendorCount: vendors.length, purchaseCount: 0, poCount: purchaseOrders.length, error: error.message };`,
  `      const res = await exactSyncRows(client, 'purchases', purchaseRows, 'id');
      if (!res.success) return { success: false, vendorCount: vendors.length, purchaseCount: 0, poCount: purchaseOrders.length, error: res.error };`
);

// We should also remove the "if (purchase_orders.length > 0)" block wrapper, or just leave it?
// Wait, I already removed "if (x.length === 0) return". But there are still "if (purchaseOrders.length > 0)" wrappers around the map/upsert.
// If I leave them, then an empty array will NOT run exactSyncRows, so it will never delete all!
