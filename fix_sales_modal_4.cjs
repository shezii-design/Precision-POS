const fs = require('fs');
const file = 'src/components/NewSaleModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `t.tierName.toLowerCase().includes('retail') || t.tierId.includes('retail')`,
  `(t.tierName && t.tierName.toLowerCase().includes('retail')) || t.tierId.includes('retail')`
);

content = content.replace(
  `l.locationName.toLowerCase() === sourceLocName.toLowerCase()`,
  `(l.locationName && sourceLocName && l.locationName.toLowerCase() === sourceLocName.toLowerCase())`
);

content = content.replace(
  `{(vendors || []).filter(v => (v.name && (v.name && v.name.toLowerCase().includes(vendorSearch.toLowerCase())))).map((vend) => (`,
  `{(vendors || []).filter(v => (v.name && vendorSearch != null && v.name.toLowerCase().includes(vendorSearch.toLowerCase()))).map((vend) => (`
);

content = content.replace(
  `{(vendors || []).filter(v => v.name.toLowerCase().includes(vendorSearch.toLowerCase())).length === 0 && (`,
  `{(vendors || []).filter(v => (v.name && vendorSearch != null && v.name.toLowerCase().includes(vendorSearch.toLowerCase()))).length === 0 && (`
);

content = content.replace(
  `tier.tierName.toLowerCase().includes('general')`,
  `(tier.tierName && tier.tierName.toLowerCase().includes('general'))`
);

content = content.replace(
  `l.locationName.toLowerCase() === item.locationName.toLowerCase()`,
  `(l.locationName && item.locationName && l.locationName.toLowerCase() === item.locationName.toLowerCase())`
);

fs.writeFileSync(file, content);
