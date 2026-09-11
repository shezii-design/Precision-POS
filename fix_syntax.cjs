const fs = require('fs');

const pages = [
  'ProductTable.tsx', 'DashboardPage.tsx', 'SalesPage.tsx', 'ProductCard.tsx',
  'PurchaseOrdersPage.tsx', 'VendorDetailsPage.tsx', 'QuotationsPage.tsx'
];

// Wait, I need to check how to fix `{prop && ({prop ? <button ... : null})}`.
// The easiest way is to use a regex replacement to undo the `{prop ? <button ... : null}` where it's wrapped.
// Or just let's see what exactly was written by replacing `<button` with `{prop ? <button`.

// Actually, I can just use a regex on the entire file content:
// `\{([a-zA-Z]+)\s*&&\s*\(\{\1\s*\?\s*(<button[\s\S]*?<\/button>)\s*:\s*null\}\)\}`
// and replace it with `{\1 && (\2)}`
// Let's test this logic!

for (let file of fs.readdirSync('src/components/')) {
  if (!file.endsWith('.tsx')) continue;
  let code = fs.readFileSync(`src/components/${file}`, 'utf8');

  // Fix 1: {prop && ({prop ? <button ... : null})} -> {prop && (<button ... />)}
  const regex = /\{([a-zA-Z]+)\s*&&\s*\(\{\1\s*\?\s*(<button[\s\S]*?<\/button>)\s*:\s*null\}\)\}/g;
  code = code.replace(regex, '{$1 && ($2)}');
  
  // Fix 2: What about the ones not wrapped in parenthesis? `{prop && {prop ? <button ... : null}}`
  const regex2 = /\{([a-zA-Z]+)\s*&&\s*\{\1\s*\?\s*(<button[\s\S]*?<\/button>)\s*:\s*null\}\}/g;
  code = code.replace(regex2, '{$1 && ($2)}');

  fs.writeFileSync(`src/components/${file}`, code);
}
console.log("Fixed syntax");
