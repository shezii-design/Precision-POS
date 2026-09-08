const fs = require('fs');
let code = fs.readFileSync('src/components/BulkImportModal.tsx', 'utf-8');

const targetStr = `      const generalTier = computedSellingPrices.find(t => t.tierId === 'tier-general');
      if (row.generalPrice !== undefined && row.generalPrice !== null && generalTier) {
        generalTier.price = row.generalPrice;
        generalTier.isOverridden = true;
      }`;

const replaceStr = `      let generalTier = computedSellingPrices.find(t => t.tierId === 'tier-general');
      if (!generalTier) {
        generalTier = { tierId: 'tier-general', tierName: 'General Price', price: 0, markupPercent: 0, isOverridden: true };
        computedSellingPrices.push(generalTier);
      }
      if (row.generalPrice !== undefined && row.generalPrice !== null) {
        generalTier.price = row.generalPrice;
        generalTier.isOverridden = true;
      }`;

if (code.includes('const generalTier = computedSellingPrices.find(')) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/components/BulkImportModal.tsx', code);
  console.log("BulkImportModal tier fixed");
}
