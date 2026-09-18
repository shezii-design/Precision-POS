const fs = require('fs');
let code = fs.readFileSync('src/components/NewSaleModal.tsx', 'utf8');

const target = `          } else {
            setCustomerMode('new');
            setNewCustomerName(editingSale.customerName || '');
            setNewCustomerPhone(editingSale.customerPhone || '');
          }
        } else {
        } else if (editingSale.customerName && editingSale.customerName !== 'Walk-in Customer') {`;

const replacement = `          } else {
            setCustomerMode('new');
            setNewCustomerName(editingSale.customerName || '');
            setNewCustomerPhone(editingSale.customerPhone || '');
          }
        } else if (editingSale.customerName && editingSale.customerName !== 'Walk-in Customer') {`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/NewSaleModal.tsx', code);
