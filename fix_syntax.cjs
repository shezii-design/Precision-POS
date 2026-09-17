const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

// The error happened because I replaced `{displayName}` indiscriminately.
// Let's restore the broken template string literal:
code = code.replace(
  'const key = `$<span contentEditable={isEditMode} suppressContentEditableWarning className={`outline-none px-1 -mx-1 rounded ${isEditMode ? "bg-amber-50 ring-1 ring-amber-300" : ""}`}>{displayName}</span>|${item.unitPrice}|${item.unit}`;',
  'const key = `${displayName}|${item.unitPrice}|${item.unit}`;'
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
