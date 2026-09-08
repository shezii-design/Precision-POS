const fs = require('fs');
let code = fs.readFileSync('src/components/ProductFormModal.tsx', 'utf-8');

const target = "setSellingPrices(productToEdit.sellingPrices || []);";
const replacement = `const existingTiers = productToEdit.sellingPrices || [];
      const mergedTiers = generateProductSellingPrices(productToEdit.costPrice || 0, pricingSettings, existingTiers);
      setSellingPrices(mergedTiers);`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/ProductFormModal.tsx', code);
  console.log("ProductFormModal patched for missing tiers");
} else {
  console.log("Could not find target in ProductFormModal");
}
