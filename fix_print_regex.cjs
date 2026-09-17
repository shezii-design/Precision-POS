const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

const regex = /const handlePrint = \(\) => {[\s\S]*?\} else \{[\s\S]*?window.print\(\);[\s\S]*?\}[\s\S]*?\};/;
code = code.replace(regex, `const handlePrint = () => {\n    window.print();\n  };`);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
