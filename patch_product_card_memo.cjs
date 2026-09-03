const fs = require('fs');
let code = fs.readFileSync('src/components/ProductCard.tsx', 'utf-8');

// Wrap export const ProductCard with React.memo
code = code.replace(
  "export const ProductCard: React.FC<ProductCardProps> = ({",
  "export const ProductCard: React.FC<ProductCardProps> = React.memo(({"
);

// Close the React.memo at the end
code = code.replace(
  /};\n*$/,
  "});\n"
);

fs.writeFileSync('src/components/ProductCard.tsx', code);
console.log('ProductCard wrapped in React.memo');
