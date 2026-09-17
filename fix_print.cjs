const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

code = code.replace(
  /const handlePrint = async \(\) => {[\s\S]*?  };/,
  `const handlePrint = () => {
    window.print();
  };`
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
