const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

code = code.replace(
  "import html2pdf from 'html2pdf.js';",
  "// @ts-ignore\nimport html2pdf from 'html2pdf.js';"
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
