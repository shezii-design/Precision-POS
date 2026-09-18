const fs = require('fs');
let code = fs.readFileSync('src/components/NewSaleModal.tsx', 'utf8');

const target = "}, [isOpen, editingSale?.id, initialCustomerId, initialCustomerName, initialItems?.length]);";
const replacement = "}, [isOpen, editingSale, initialCustomerId, initialCustomerName, initialItems]);";

code = code.replace(target, replacement);
fs.writeFileSync('src/components/NewSaleModal.tsx', code);
