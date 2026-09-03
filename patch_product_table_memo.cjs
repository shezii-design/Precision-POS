const fs = require('fs');
let code = fs.readFileSync('src/components/ProductTable.tsx', 'utf-8');

// Ensure import React is present (it should be)

code = code.replace(
  "export const ProductTable: React.FC<ProductTableProps> = ({",
  "export const ProductTable: React.FC<ProductTableProps> = React.memo(({"
);

// Close the React.memo at the end
code = code.replace(
  /};\n*$/,
  "});\n"
);

fs.writeFileSync('src/components/ProductTable.tsx', code);
console.log('ProductTable wrapped in React.memo');
