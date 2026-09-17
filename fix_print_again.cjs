const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

code = code.replace(
  `const handlePrint = () => {
    window.print();
  };        html2pdf().set(opt).from(printContainerRef.current).save();
      }
    } else {
      window.print();
    }
  };`,
  `const handlePrint = () => {
    window.print();
  };`
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
