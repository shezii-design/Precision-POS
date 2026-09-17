const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

code = code.replace(
  '<th className="py-3 px-3.5 text-center w-20">Orig Qty</th>\n                    {hasReturns && <th className="py-3 px-3.5 text-center w-24">Net Billed</th>}',
  '{hasReturns ? (\n                      <>\n                        <th className="py-3 px-3.5 text-center w-20">Orig Qty</th>\n                        <th className="py-3 px-3.5 text-center w-24">Net Billed</th>\n                      </>\n                    ) : (\n                      <th className="py-3 px-3.5 text-center w-20">Qty</th>\n                    )}'
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
