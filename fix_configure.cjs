const fs = require('fs');
const file = 'src/components/ConfigureLinkedProductsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/searchTerm\.toLowerCase\(\)/g, "(searchTerm ? searchTerm.toLowerCase() : '')");

fs.writeFileSync(file, content);
