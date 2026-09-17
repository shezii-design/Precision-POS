const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

// Replace the UI table body cell for brand
content = content.replace(/<td className="py-3 px-3\.5 text-slate-700 font-semibold">\s*\{item\.brandName \|\| '-'\}\s*<\/td>/g, '');

fs.writeFileSync('src/components/InvoiceModal.tsx', content);
