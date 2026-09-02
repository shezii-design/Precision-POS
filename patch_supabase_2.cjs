const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf-8');

function replaceChunkLogic(code) {
  // We want to match:
  // const rows = ... (or customerRows)
  // [any number of lines]
  // const chunkSize = 100;
  // ...
  // return { success: true, count: ... };
  
  const blocks = code.split('export async function');
  
  for (let i = 1; i < blocks.length; i++) {
    let block = blocks[i];
    
    // Check if block has chunk logic
    if (block.includes('const chunkSize = 100;')) {
      // Find the table name
      const tableMatch = block.match(/\.from\('([^']+)'\)/);
      if (!tableMatch) continue;
      const tableName = tableMatch[1];
      
      // Find the ID col
      const idMatch = block.match(/onConflict:\s*'([^']+)'/);
      const idCol = idMatch ? idMatch[1] : 'id';
      
      // Find the array being chunked
      const chunkMatch = block.match(/const chunk = ([a-zA-Z]+)\.slice/);
      const arrName = chunkMatch ? chunkMatch[1] : 'rows';
      
      // Replace everything from chunkSize to the end of try block
      const startIdx = block.indexOf('const chunkSize = 100;');
      const endIdx = block.indexOf('} catch (err', startIdx);
      
      if (startIdx !== -1 && endIdx !== -1) {
        const toReplace = block.substring(startIdx, endIdx);
        // Sometimes there's a return before the catch block, we need to find the last return { success: true }
        const returnMatch = toReplace.match(/return\s*\{\s*success:\s*true[^}]+\};/);
        
        let newLogic = `return await exactSyncRows(client, '${tableName}', ${arrName}, '${idCol}');\n  `;
        
        // Let's just be careful not to delete extra stuff if it syncs multiple tables.
        if (tableName === 'inventory_products' || tableName === 'sales' || tableName === 'inventory_demands' || tableName === 'inventory_expenses' || tableName === 'quotations' || tableName === 'vendor_returns' || tableName === 'inventory_stock_logs') {
            blocks[i] = block.replace(toReplace, newLogic);
        }
      }
    }
  }
  
  return blocks.join('export async function');
}

code = replaceChunkLogic(code);
fs.writeFileSync('src/services/supabase.ts', code);
console.log("supabase.ts patched 2");
