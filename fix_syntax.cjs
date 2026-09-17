const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

code = code.replace(
  "{activeTab === \\'original\\' ? \\'Automotive Filters & Precision Machinery Spares\\' : <span dangerouslySetInnerHTML={{ __html: \\'Your Filteration Solution<br />03226600734, 03222000734\\' }} />}\\n",
  "{activeTab === 'original' ? 'Automotive Filters & Precision Machinery Spares' : <span dangerouslySetInnerHTML={{ __html: 'Your Filteration Solution<br />03226600734, 03222000734' }} />}\n"
);
code = code.replace(
  "{activeTab === \\'original\\' ? \\'PRECISION INVENTORY\\' : \\'King Filter House\\'}\\n",
  "{activeTab === 'original' ? 'PRECISION INVENTORY' : 'King Filter House'}\n"
);


fs.writeFileSync('src/components/InvoiceModal.tsx', code);
