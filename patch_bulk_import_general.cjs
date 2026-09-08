const fs = require('fs');
let code = fs.readFileSync('src/components/BulkImportModal.tsx', 'utf-8');

const targetStr = `      if (row.retailPrice && computedSellingPrices[1]) {
        computedSellingPrices[1].price = row.retailPrice;
        computedSellingPrices[1].isOverridden = true;
      }`;

const replaceStr = `      if (row.retailPrice && computedSellingPrices[1]) {
        computedSellingPrices[1].price = row.retailPrice;
        computedSellingPrices[1].isOverridden = true;
      }
      const generalTier = computedSellingPrices.find(t => t.tierId === 'tier-general');
      if (row.generalPrice !== undefined && row.generalPrice !== null && generalTier) {
        generalTier.price = row.generalPrice;
        generalTier.isOverridden = true;
      }`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/components/BulkImportModal.tsx', code);
  console.log("BulkImportModal patched for generalPrice");
} else {
  console.log("Could not find targetStr");
}
