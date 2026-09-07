const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Fix the require statement
code = code.replace(
  "const { calculateSmartROP, buildProductSalesMap } = require('./services/analytics');",
  ""
);

// Add to top imports if missing
if (!code.includes("calculateSmartROP, buildProductSalesMap")) {
  code = code.replace(
    "import { autoUpdateProductsROP }",
    "import { autoUpdateProductsROP, calculateSmartROP, buildProductSalesMap }"
  );
}

fs.writeFileSync('src/App.tsx', code);
console.log("App.tsx imports patched");
