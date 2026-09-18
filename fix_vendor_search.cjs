const fs = require('fs');
const file = 'src/components/NewSaleModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /\{\(vendors \|\| \[\]\)\.filter\(v => \(v\.name && vendorSearch != null && v\.name\.toLowerCase\(\)\.includes\(vendorSearch\.toLowerCase\(\)\)\)\)\.map\(\(vend\) => \(/g,
  "{(vendors || []).filter(v => (v.name && (vendorSearch == null || v.name.toLowerCase().includes(vendorSearch.toLowerCase())))).map((vend) => ("
);

content = content.replace(
  /\{\(vendors \|\| \[\]\)\.filter\(v => \(v\.name && vendorSearch != null && v\.name\.toLowerCase\(\)\.includes\(vendorSearch\.toLowerCase\(\)\)\)\)\.length === 0 && \(/g,
  "{(vendors || []).filter(v => (v.name && (vendorSearch == null || v.name.toLowerCase().includes(vendorSearch.toLowerCase())))).length === 0 && ("
);

fs.writeFileSync(file, content);
