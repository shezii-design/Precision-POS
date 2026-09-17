const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  'syncSalesToSupabase(updatedSales).catch(console.error);',
  `const client = getSupabaseClient();
          if (client) {
            syncSalesToSupabase(client, updatedSales).catch(console.error);
          }
          setActiveSaleForInvoice(updatedSales.find(s => s.id === saleId) || null);`
);

fs.writeFileSync('src/App.tsx', code);
