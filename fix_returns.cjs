const fs = require('fs');
const file = 'src/components/ReturnsPage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/searchQuery\.toLowerCase\(\)/g, "(searchQuery ? searchQuery.toLowerCase() : '')");

fs.writeFileSync(file, content);
