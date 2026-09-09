const fs = require('fs');
let code = fs.readFileSync('src/components/ProductTable.tsx', 'utf8');

code = code.replace(
  /onClick=\{\(\) => onAdjustStock\(p\)\}/,
  `onClick={onAdjustStock ? () => onAdjustStock(p) : undefined}`
);

fs.writeFileSync('src/components/ProductTable.tsx', code);
console.log("Patched ProductTable.tsx - onAdjustStock");
