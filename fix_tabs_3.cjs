const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

code = code.replace(
  /King Filter House[\s\S]*?<\/h1>/,
  '{activeTab === \\\'original\\\' ? \\\'PRECISION INVENTORY\\\' : \\\'King Filter House\\\'}\\n                </h1>'
);

code = code.replace(
  /Your Filteration Solution<br \/>03226600734, 03222000734[\s\S]*?<\/p>/,
  '{activeTab === \\\'original\\\' ? \\\'Automotive Filters & Precision Machinery Spares\\\' : <span dangerouslySetInnerHTML={{ __html: \\\'Your Filteration Solution<br />03226600734, 03222000734\\\' }} />}\\n              </p>'
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
console.log('Tabs logic 3 applied');
