const fs = require('fs');
const file = 'src/components/VendorReturnModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/p\.vendorName && p\.vendorName\.toLowerCase\(\)\.includes\(vendorName\.toLowerCase\(\)\)/g, "(p.vendorName && vendorName && p.vendorName.toLowerCase().includes(vendorName.toLowerCase()))");

fs.writeFileSync(file, content);
