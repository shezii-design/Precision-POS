const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf-8');

const exactSyncHelper = `
async function exactSyncRows(
  client: SupabaseClient,
  tableName: string,
  rows: any[],
  idCol: string = 'id'
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { data: existing, error: selectErr } = await client.from(tableName).select(idCol);
    if (selectErr && selectErr.code !== '42P01') throw selectErr; // Ignore table missing for exact sync
    
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
}
`;

if (!code.includes('exactSyncRows')) {
  // Insert exactly after the imports
  code = code.replace(/import \{.*?\} from '@supabase\/supabase-js';\n/s, match => match + exactSyncHelper + '\n');
}

// Now replace ALL occurrences of the chunking logic with exactSyncRows
// We can use a regex to find:
// const chunkSize = 100;
// for (let i = 0; i < rows.length; i += chunkSize) {
//    ...
//    return { success: true, count: rows.length };

const regex = /const chunkSize = 100;\s*for\s*\([^\{]+\{\s*const chunk = rows\.slice[^\{]+\{\s*const\s*\{\s*error\s*\}\s*=\s*await client\s*\.from\('([^']+)'\)\s*\.upsert\([^,]+,\s*\{\s*onConflict:\s*'([^']+)'\s*\}\);\s*if\s*\(error\)\s*\{\s*return\s*\{\s*success:\s*false,\s*count:\s*i,\s*error:\s*error\.message\s*\};\s*\}\s*\}\s*return\s*\{\s*success:\s*true,\s*count:\s*rows\.length\s*\};/g;

code = code.replace(regex, (match, tableName, idCol) => {
  return `return await exactSyncRows(client, '${tableName}', rows, '${idCol}');`;
});

// There is also customerLedger, etc. which has custom rows variables:
// We need a more general regex if the variable is not named 'rows'.
// Actually, looking at the code, it uses 'rows' for everything except some places it uses 'customerRows' and 'ledgerRows'.
fs.writeFileSync('src/services/supabase.ts', code);
console.log("supabase.ts patched");
