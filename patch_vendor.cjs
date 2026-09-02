const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf-8');

code = code.replace(
`      const { error } = await client.from('vendors').upsert(vendorRows, { onConflict: 'id' });
      if (error) return { success: false, vendorCount: 0, purchaseCount: 0, poCount: 0, error: error.message };`,
`      const vRes = await exactSyncRows(client, 'vendors', vendorRows, 'id');
      if (!vRes.success) return { success: false, vendorCount: 0, purchaseCount: 0, poCount: 0, error: vRes.error };`
);

fs.writeFileSync('src/services/supabase.ts', code);
console.log('patched vendors');
