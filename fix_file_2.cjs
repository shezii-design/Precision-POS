const fs = require('fs');
let code = fs.readFileSync('src/components/NewSaleModal.tsx', 'utf8');

code = code.replace(
  "Stock: {prod.stockQuantity} {prod.unit}\n                            </span>\n                          </div>\n                        </div>",
  "Stock: {prod.stockQuantity} {prod.unit}\n                            </span>\n                          </div>\n                        </button>"
);

fs.writeFileSync('src/components/NewSaleModal.tsx', code);
