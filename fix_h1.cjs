const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

code = code.replace(
  '<h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">\n                  King Filter House\n                </h1>',
  '<h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">\n                  {activeTab === \'original\' ? \'PRECISION INVENTORY\' : \'King Filter House\'}\n                </h1>'
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
