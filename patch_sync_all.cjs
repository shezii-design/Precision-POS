const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf-8');

// Remove wrapper 1
code = code.replace(/  if \(bundle\.sales && bundle\.sales\.length > 0\) \{\n    try \{\n      const salesRes = await syncSalesToSupabase\(client, bundle\.sales\);\n      if \(salesRes\.success\) syncedCounts\.sales = salesRes\.count;\n      else if \(salesRes\.error\) errors\.push\(\`Sales: \$\{salesRes\.error\}\`\);\n    \} catch \(e: any\) \{\n      errors\.push\(\`Sales: \$\{e\.message\}\`\);\n    \}\n  \}/, `  try {
    const salesRes = await syncSalesToSupabase(client, bundle.sales || []);
    if (salesRes.success) syncedCounts.sales = salesRes.count;
    else if (salesRes.error) errors.push(\`Sales: \${salesRes.error}\`);
  } catch (e: any) {
    errors.push(\`Sales: \${e.message}\`);
  }`);

// Remove wrapper 2
code = code.replace(/  if \(bundle\.customerReturns && bundle\.customerReturns\.length > 0\) \{\n    try \{\n      const crRes = await syncCustomerReturnsToSupabase\(client, bundle\.customerReturns\);\n      if \(crRes\.success\) syncedCounts\.customerReturns = crRes\.count;\n      else if \(crRes\.error\) errors\.push\(\`Customer Returns: \$\{crRes\.error\}\`\);\n    \} catch \(e: any\) \{\n      errors\.push\(\`Customer Returns: \$\{e\.message\}\`\);\n    \}\n  \}/, `  try {
    const crRes = await syncCustomerReturnsToSupabase(client, bundle.customerReturns || []);
    if (crRes.success) syncedCounts.customerReturns = crRes.count;
    else if (crRes.error) errors.push(\`Customer Returns: \${crRes.error}\`);
  } catch (e: any) {
    errors.push(\`Customer Returns: \${e.message}\`);
  }`);

// Remove wrapper 3
code = code.replace(/  if \(bundle\.vendorLedger && bundle\.vendorLedger\.length > 0\) \{\n    try \{\n      const vlRes = await syncVendorLedgerToSupabase\(client, bundle\.vendorLedger\);\n      if \(vlRes\.success\) syncedCounts\.vendorLedger = vlRes\.count;\n      else if \(vlRes\.error\) errors\.push\(\`Vendor Ledger: \$\{vlRes\.error\}\`\);\n    \} catch \(e: any\) \{\n      errors\.push\(\`Vendor Ledger: \$\{e\.message\}\`\);\n    \}\n  \}/, `  try {
    const vlRes = await syncVendorLedgerToSupabase(client, bundle.vendorLedger || []);
    if (vlRes.success) syncedCounts.vendorLedger = vlRes.count;
    else if (vlRes.error) errors.push(\`Vendor Ledger: \${vlRes.error}\`);
  } catch (e: any) {
    errors.push(\`Vendor Ledger: \${e.message}\`);
  }`);

// Remove wrapper 4
code = code.replace(/  if \(bundle\.vendorReturns && bundle\.vendorReturns\.length > 0\) \{\n    try \{\n      const vrRes = await syncVendorReturnsToSupabase\(client, bundle\.vendorReturns\);\n      if \(vrRes\.success\) syncedCounts\.vendorReturns = vrRes\.count;\n      else if \(vrRes\.error\) errors\.push\(\`Vendor Returns: \$\{vrRes\.error\}\`\);\n    \} catch \(e: any\) \{\n      errors\.push\(\`Vendor Returns: \$\{e\.message\}\`\);\n    \}\n  \}/, `  try {
    const vrRes = await syncVendorReturnsToSupabase(client, bundle.vendorReturns || []);
    if (vrRes.success) syncedCounts.vendorReturns = vrRes.count;
    else if (vrRes.error) errors.push(\`Vendor Returns: \${vrRes.error}\`);
  } catch (e: any) {
    errors.push(\`Vendor Returns: \${e.message}\`);
  }`);

// Remove wrapper 5
code = code.replace(/  if \(bundle\.stockLogs && bundle\.stockLogs\.length > 0\) \{\n    try \{\n      const slRes = await syncStockLogsToSupabase\(client, bundle\.stockLogs\);\n      if \(slRes\.success\) syncedCounts\.stockLogs = slRes\.count;\n      else if \(slRes\.error\) errors\.push\(\`Stock Logs: \$\{slRes\.error\}\`\);\n    \} catch \(e: any\) \{\n      errors\.push\(\`Stock Logs: \$\{e\.message\}\`\);\n    \}\n  \}/, `  try {
    const slRes = await syncStockLogsToSupabase(client, bundle.stockLogs || []);
    if (slRes.success) syncedCounts.stockLogs = slRes.count;
    else if (slRes.error) errors.push(\`Stock Logs: \${slRes.error}\`);
  } catch (e: any) {
    errors.push(\`Stock Logs: \${e.message}\`);
  }`);

fs.writeFileSync('src/services/supabase.ts', code);
console.log('patched syncAllModulesToSupabase');
