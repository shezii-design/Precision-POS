const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf-8');

// 1. Fix exactSyncRows to fetch ALL IDs, not just the first 1000, and handle 0 rows properly.
const oldExactSync = `async function exactSyncRows(
  client: SupabaseClient,
  tableName: string,
  rows: any[],
  idCol: string = 'id'
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { data: existing, error: selectErr } = await client.from(tableName).select(idCol);
    if (selectErr && selectErr.code !== '42P01') throw selectErr; // Ignore table missing
    
    const existingIds = new Set((existing || []).map(r => r[idCol]));
    const currentIds = new Set(rows.map(r => r[idCol]));
    const idsToDelete = [...existingIds].filter(id => !currentIds.has(id));
    
    if (idsToDelete.length > 0) {
      for (let i = 0; i < idsToDelete.length; i += 100) {
        await client.from(tableName).delete().in(idCol, idsToDelete.slice(i, i + 100));
      }
    }
    
    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i += 100) {
        const { error: upsertErr } = await client.from(tableName).upsert(rows.slice(i, i + 100), { onConflict: idCol });
        if (upsertErr) throw upsertErr;
      }
    }
    
    return { success: true, count: rows.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || String(err) };
  }
}`;

const newExactSync = `async function exactSyncRows(
  client: SupabaseClient,
  tableName: string,
  rows: any[],
  idCol: string = 'id'
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let existing: any[] = [];
    let hasMore = true;
    let from = 0;
    const step = 1000;

    while (hasMore) {
      const { data, error: selectErr } = await client.from(tableName).select(idCol).range(from, from + step - 1);
      if (selectErr && selectErr.code !== '42P01') throw selectErr; // Ignore table missing if it doesn't exist yet
      if (selectErr && selectErr.code === '42P01') {
        hasMore = false;
        break;
      }
      if (data && data.length > 0) {
        existing = existing.concat(data);
        from += step;
        if (data.length < step) hasMore = false;
      } else {
        hasMore = false;
      }
    }
    
    const existingIds = new Set(existing.map(r => r[idCol]));
    const currentIds = new Set(rows.map(r => r[idCol]));
    const idsToDelete = [...existingIds].filter(id => !currentIds.has(id));
    
    if (idsToDelete.length > 0) {
      for (let i = 0; i < idsToDelete.length; i += 100) {
        await client.from(tableName).delete().in(idCol, idsToDelete.slice(i, i + 100));
      }
    }
    
    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i += 100) {
        const { error: upsertErr } = await client.from(tableName).upsert(rows.slice(i, i + 100), { onConflict: idCol });
        if (upsertErr) throw upsertErr;
      }
    }
    
    return { success: true, count: rows.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || String(err) };
  }
}`;

code = code.replace(oldExactSync, newExactSync);

// 2. Remove "if (length === 0) return ..." from all functions
code = code.replace(/    if \([a-zA-Z]+\.length === 0\) return \{ success: true, count: 0 \};\n/g, '');

fs.writeFileSync('src/services/supabase.ts', code);
console.log('patched exactSyncRows');
