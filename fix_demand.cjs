const fs = require('fs');
const file = 'src/components/DemandFormModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `        p.name.toLowerCase().includes(q) || \n        p.internalId.toLowerCase().includes(q) || `,
  `        (p.name && p.name.toLowerCase().includes(q)) || \n        (p.internalId && p.internalId.toLowerCase().includes(q)) || `
);

fs.writeFileSync(file, content);
