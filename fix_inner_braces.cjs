const fs = require('fs');

const pages = [
  'PurchaseOrdersPage.tsx', 'SalesPage.tsx', 'VendorDetailsPage.tsx', 'ProductTable.tsx'
];

for (const page of pages) {
  if (!fs.existsSync(`src/components/${page}`)) continue;
  let code = fs.readFileSync(`src/components/${page}`, 'utf8');

  // We are looking for:  `\(\s*\{([a-zA-Z]+)\s*\?\s*(<button[\s\S]*?<\/button>)\s*:\s*null\}\s*\)`
  // And we should replace it with: `( $1 ? $2 : null )`
  
  const regex = /\(\s*\{([a-zA-Z]+)\s*\?\s*(<button[\s\S]*?<\/button>)\s*:\s*null\}\s*\)/g;
  code = code.replace(regex, '( $1 ? $2 : null )');

  fs.writeFileSync(`src/components/${page}`, code);
}
console.log("Fixed inner braces syntax");
