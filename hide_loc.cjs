const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

// Hide location on print in UI
code = code.replace(
  '<div className="text-[11px] text-blue-700 font-semibold flex items-center gap-1 mt-0.5">',
  '<div className="text-[11px] text-blue-700 font-semibold flex items-center gap-1 mt-0.5 print:hidden">'
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
