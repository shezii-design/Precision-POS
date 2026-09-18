const fs = require('fs');
const file = 'src/components/CustomerReturnModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/s\.customerName && s\.customerName\.toLowerCase\(\)\.includes\(customerName\.toLowerCase\(\)\)/g, "(s.customerName && customerName && s.customerName.toLowerCase().includes(customerName.toLowerCase()))");

fs.writeFileSync(file, content);
