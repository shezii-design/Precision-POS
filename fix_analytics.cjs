const fs = require('fs');
const file = 'src/components/AnalyticsPage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.internalId && p.internalId.toLowerCase().includes(searchTerm.toLowerCase()))`,
  `    (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (p.internalId && p.internalId.toLowerCase().includes(searchTerm.toLowerCase()))`
);

content = content.replace(
  `    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.internalId && p.internalId.toLowerCase().includes(searchTerm.toLowerCase()))`,
  `    (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (p.internalId && p.internalId.toLowerCase().includes(searchTerm.toLowerCase()))`
);

content = content.replace(
  `    i.product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.product.internalId && i.product.internalId.toLowerCase().includes(searchTerm.toLowerCase()))`,
  `    (i.product.name && i.product.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (i.product.internalId && i.product.internalId.toLowerCase().includes(searchTerm.toLowerCase()))`
);

fs.writeFileSync(file, content);
