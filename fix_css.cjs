const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

if (!code.includes('@page {')) {
  code = code.replace(
    '@media print {',
    '@media print {\n    @page { margin: 0; }\n    body { margin: 1.6cm; }\n'
  );
  fs.writeFileSync('src/index.css', code);
}
