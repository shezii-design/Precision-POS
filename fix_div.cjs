const fs = require('fs');
let code = fs.readFileSync('src/components/NewSaleModal.tsx', 'utf8');

code = code.replace(
  "                            </div>\n                          </div>\n\n                          <div className=\"text-right",
  "                            </div>\n\n                          <div className=\"text-right"
);

fs.writeFileSync('src/components/NewSaleModal.tsx', code);
