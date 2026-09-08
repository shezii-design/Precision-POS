const fs = require('fs');
let code = fs.readFileSync('src/services/excel.ts', 'utf-8');

const analyticsBlock = `      'Cost Price (PKR)': p.costPrice,`;
const newAnalyticsBlock = `      'Cost Price (PKR)': p.costPrice,
      'General Price (PKR)': p.sellingPrices?.find(s => s.tierId === 'tier-general' || s.tierName?.toLowerCase()?.includes('general'))?.price || 0,`;

if (code.includes(analyticsBlock) && !code.includes("'General Price (PKR)': p.sellingPrices")) {
  code = code.replace(analyticsBlock, newAnalyticsBlock);
  fs.writeFileSync('src/services/excel.ts', code);
  console.log("analytics excel patched");
}
