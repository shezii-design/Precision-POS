const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes("const [stockBreaches, setStockBreaches]")) {
  const insertIndex = code.indexOf("const [showLowStockBanner");
  if (insertIndex !== -1) {
    const newState = `const [stockBreaches, setStockBreaches] = useState<{ product: Product, eoq: number }[]>([]);\n  `;
    code = code.substring(0, insertIndex) + newState + code.substring(insertIndex);
    fs.writeFileSync('src/App.tsx', code);
    console.log("State patched");
  } else {
    console.log("Could not find insert index");
  }
} else {
  console.log("Already has stockBreaches");
}
