const fs = require('fs');
const file = 'src/components/CustomersPage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/cust\.name\.toLowerCase\(\)/g, "(cust.name ? cust.name.toLowerCase() : '')");
content = content.replace(/searchTerm\.toLowerCase\(\)/g, "(searchTerm ? searchTerm.toLowerCase() : '')");
content = content.replace(/cityFilter\.toLowerCase\(\)/g, "(cityFilter ? cityFilter.toLowerCase() : '')");
content = content.replace(/m\.machineName\.toLowerCase\(\)/g, "(m.machineName ? m.machineName.toLowerCase() : '')");

fs.writeFileSync(file, content);
