const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf-8');

const targetCustomers = `    if (customers.length > 0) {
      const customerRows = customers.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type || 'customer',
        contact_person: c.contactPerson || null,
        phone: c.phone || null,
        secondary_phone: c.secondaryPhone || null,
        email: c.email || null,
        address: c.address || null,
        city: c.city || null,
        ntn: c.ntn || null,
        strn: c.strn || null,
        opening_balance: Number(c.openingBalance) || 0,
        total_purchases: Number(c.totalPurchases) || 0,
        machines: c.machines || [],
        notes: c.notes || null,
        updated_at: new Date().toISOString(),
      }));

      const { error: custErr } = await client
        .from('customers')
        .upsert(customerRows, { onConflict: 'id' });

      if (custErr) return { success: false, customerCount: 0, ledgerCount: 0, error: custErr.message };
    }`;

const newCustomers = `
      const customerRows = customers.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type || 'customer',
        contact_person: c.contactPerson || null,
        phone: c.phone || null,
        secondary_phone: c.secondaryPhone || null,
        email: c.email || null,
        address: c.address || null,
        city: c.city || null,
        ntn: c.ntn || null,
        strn: c.strn || null,
        opening_balance: Number(c.openingBalance) || 0,
        total_purchases: Number(c.totalPurchases) || 0,
        machines: c.machines || [],
        notes: c.notes || null,
        updated_at: new Date().toISOString(),
      }));

      const custRes = await exactSyncRows(client, 'customers', customerRows, 'id');
      if (!custRes.success) return { success: false, customerCount: 0, ledgerCount: 0, error: custRes.error };
`;

code = code.replace(targetCustomers, newCustomers);
fs.writeFileSync('src/services/supabase.ts', code);
console.log('patched customers');
