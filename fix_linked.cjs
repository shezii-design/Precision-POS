const fs = require('fs');
const file = 'src/components/ConfigureLinkedProductsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `        p.name.toLowerCase().includes(q) ||
        p.internalId.toLowerCase().includes(q) ||`,
  `        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.internalId && p.internalId.toLowerCase().includes(q)) ||`
);

fs.writeFileSync(file, content);
