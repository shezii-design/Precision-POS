const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf-8');

const oldMaster = `    if (brands.length > 0) {
      const brandRows = brands.map(b => ({ id: b.id, name: b.name, item_count: b.itemCount || 0 }));
      await client.from('inventory_brands').upsert(brandRows, { onConflict: 'id' });
    }
    if (types.length > 0) {
      const typeRows = types.map(t => ({ id: t.id, name: t.name, item_count: t.itemCount || 0 }));
      await client.from('inventory_categories').upsert(typeRows, { onConflict: 'id' });
    }
    if (locations.length > 0) {
      const locRows = locations.map(l => ({ id: l.id, name: l.name, cabins: l.cabins || [] }));
      await client.from('inventory_locations').upsert(locRows, { onConflict: 'id' });
    }`;

const newMaster = `    const brandRows = brands.map(b => ({ id: b.id, name: b.name, item_count: b.itemCount || 0 }));
    await exactSyncRows(client, 'inventory_brands', brandRows, 'id');

    const typeRows = types.map(t => ({ id: t.id, name: t.name, item_count: t.itemCount || 0 }));
    await exactSyncRows(client, 'inventory_categories', typeRows, 'id');

    const locRows = locations.map(l => ({ id: l.id, name: l.name, cabins: l.cabins || [] }));
    await exactSyncRows(client, 'inventory_locations', locRows, 'id');`;

code = code.replace(oldMaster, newMaster);
fs.writeFileSync('src/services/supabase.ts', code);
