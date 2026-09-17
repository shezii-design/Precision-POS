const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

code = code.replace(
  /\/\/ @ts-ignore\nimport html2pdf from 'html2pdf.js';\n/,
  ''
);
code = code.replace(
  /import html2pdf from 'html2pdf.js';\n/,
  ''
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
