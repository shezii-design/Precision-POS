const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `p.name.toLowerCase() === demand.itemName.toLowerCase()`,
  `(p.name && demand.itemName && p.name.toLowerCase() === demand.itemName.toLowerCase())`
);

content = content.replace(
  `const existingMap = new Map(products.map(p => [p.internalId.toLowerCase(), p]));`,
  `const existingMap = new Map(products.map(p => [p.internalId ? p.internalId.toLowerCase() : p.id, p]));`
);

content = content.replace(
  `existingMap.set(imp.internalId.toLowerCase(), imp);`,
  `existingMap.set(imp.internalId ? imp.internalId.toLowerCase() : imp.id, imp);`
);

fs.writeFileSync(file, content);
