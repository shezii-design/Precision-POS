const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf-8');

// Function 1: syncMasterDataToSupabase
const oldMaster = `    if (brandRows.length > 0) {
      await client.from('brands').upsert(brandRows, { onConflict: 'id' });
    }
    if (typeRows.length > 0) {
      await client.from('types').upsert(typeRows, { onConflict: 'id' });
    }
    if (locRows.length > 0) {
      await client.from('locations').upsert(locRows, { onConflict: 'id' });
    }`;

const newMaster = `    await exactSyncRows(client, 'brands', brandRows, 'id');
    await exactSyncRows(client, 'types', typeRows, 'id');
    await exactSyncRows(client, 'locations', locRows, 'id');`;
code = code.replace(oldMaster, newMaster);

// Function 2: syncQuotationsToSupabase
const oldQuotation = `    const { error } = await client.from('quotations').upsert(rows, { onConflict: 'id' });
    if (error) return { success: false, count: 0, error: error.message };
    return { success: true, count: rows.length };`;

const newQuotation = `    return await exactSyncRows(client, 'quotations', rows, 'id');`;
code = code.replace(oldQuotation, newQuotation);

// Function 3: syncDemandsToSupabase
const oldDemand = `    const { error } = await client.from('demands').upsert(rows, { onConflict: 'id' });
    if (error) return { success: false, count: 0, error: error.message };
    return { success: true, count: rows.length };`;

const newDemand = `    return await exactSyncRows(client, 'demands', rows, 'id');`;
code = code.replace(oldDemand, newDemand);

// Function 4: syncExpensesToSupabase
const oldExpense = `    const { error } = await client.from('expenses').upsert(rows, { onConflict: 'id' });
    if (error) return { success: false, count: 0, error: error.message };
    return { success: true, count: rows.length };`;

const newExpense = `    return await exactSyncRows(client, 'expenses', rows, 'id');`;
code = code.replace(oldExpense, newExpense);

// Function 5: syncCustomerReturnsToSupabase
const oldCustReturn = `    const { error } = await client.from('customer_returns').upsert(rows, { onConflict: 'id' });
    if (error) return { success: false, count: 0, error: error.message };
    return { success: true, count: rows.length };`;

const newCustReturn = `    return await exactSyncRows(client, 'customer_returns', rows, 'id');`;
code = code.replace(oldCustReturn, newCustReturn);

// Function 6: syncVendorLedgerToSupabase
const oldVenLedger = `    const { error } = await client.from('vendor_ledger').upsert(rows, { onConflict: 'id' });
    if (error) return { success: false, count: 0, error: error.message };
    return { success: true, count: rows.length };`;

const newVenLedger = `    return await exactSyncRows(client, 'vendor_ledger', rows, 'id');`;
code = code.replace(oldVenLedger, newVenLedger);

// Function 7: syncVendorReturnsToSupabase
const oldVenReturn = `    const { error } = await client.from('vendor_returns').upsert(rows, { onConflict: 'id' });
    if (error) return { success: false, count: 0, error: error.message };
    return { success: true, count: rows.length };`;

const newVenReturn = `    return await exactSyncRows(client, 'vendor_returns', rows, 'id');`;
code = code.replace(oldVenReturn, newVenReturn);

// Function 8: syncStockLogsToSupabase
const oldStockLogs = `    const { error } = await client.from('stock_logs').upsert(rows, { onConflict: 'id' });
    if (error) return { success: false, count: 0, error: error.message };
    return { success: true, count: rows.length };`;

const newStockLogs = `    return await exactSyncRows(client, 'stock_logs', rows, 'id');`;
code = code.replace(oldStockLogs, newStockLogs);

fs.writeFileSync('src/services/supabase.ts', code);
console.log('patched other syncs');
