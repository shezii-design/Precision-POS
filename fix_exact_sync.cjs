const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf-8');

code = code.replace(
  /}ess: boolean; count: number; error\?: string }> {/,
  `}

export async function exactSyncRows(
  client: SupabaseClient,
  tableName: string,
  rows: any[],
  idCol: string = 'id'
): Promise<{ success: boolean; count: number; error?: string }> {`
);

fs.writeFileSync('src/services/supabase.ts', code);
console.log('Fixed exactSyncRows');
