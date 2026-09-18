const fs = require('fs');
const file = 'src/components/DemandFormModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/customerName\.toLowerCase\(\)/g, "(customerName ? customerName.toLowerCase() : '')");
content = content.replace(/c\.name\.toLowerCase\(\)/g, "(c.name && c.name.toLowerCase())");
content = content.replace(/itemName\.toLowerCase\(\)/g, "(itemName ? itemName.toLowerCase() : '')");

fs.writeFileSync(file, content);
