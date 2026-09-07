const fs = require('fs');
let code = fs.readFileSync('src/services/storage.ts', 'utf-8');

// Patch recordSaleAndUpdateInventory
code = code.replace(
  `    const nextSellingPrices = nextActiveCost > 0
      ? generateProductSellingPrices(nextActiveCost, pricingSettings, prod.sellingPrices)
      : prod.sellingPrices;`,
  `    const nextSellingPrices = prod.sellingPrices;`
);

code = code.replace(
  `      costPrice: nextActiveCost > 0 ? nextActiveCost : prod.costPrice,`,
  `      costPrice: prod.costPrice,`
);


// Patch deleteSaleAndUpdateAll
code = code.replace(
  `    const nextSellingPrices = activeFifoCost > 0
      ? generateProductSellingPrices(activeFifoCost, pricingSettings, prod.sellingPrices)
      : prod.sellingPrices;`,
  `    const nextSellingPrices = prod.sellingPrices;`
);

code = code.replace(
  `      costPrice: activeFifoCost > 0 ? activeFifoCost : prod.costPrice,`,
  `      costPrice: prod.costPrice,`
);

fs.writeFileSync('src/services/storage.ts', code);
console.log("Patched storage.ts");
