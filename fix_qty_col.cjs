const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

code = code.replace(
  '<th class="text-center">Orig Qty</th>\n        ${hasReturns ? \'<th class="text-center">Return / Net</th>\' : \'<th class="text-right">Qty</th>\'}',
  '${hasReturns ? \'<th class="text-center">Orig Qty</th>\\n        <th class="text-center">Return / Net</th>\' : \'<th class="text-center">Qty</th>\'}'
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
