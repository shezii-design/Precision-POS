const fs = require('fs');
let code = fs.readFileSync('src/services/pricing.ts', 'utf-8');

const targetStr = `    const price = calculateSellingPrice(costPrice, tier.markupPercent, settings.roundToNearest);
    return {
      tierId: tier.id,
      tierName: tier.name,
      price,
      markupPercent: tier.markupPercent,
      isOverridden: false
    };`;

const newStr = `    const isGeneral = tier.id === 'tier-general' || tier.name.toLowerCase().includes('general');
    
    // If it's the general price, it doesn't follow markup, it stays 0 until edited (or keeps existing)
    if (isGeneral) {
      return {
        tierId: tier.id,
        tierName: tier.name,
        price: existing && existing.price !== undefined ? existing.price : 0,
        markupPercent: 0,
        isOverridden: true, // Always allow direct typing for general price
      };
    }

    const price = calculateSellingPrice(costPrice, tier.markupPercent, settings.roundToNearest);
    return {
      tierId: tier.id,
      tierName: tier.name,
      price,
      markupPercent: tier.markupPercent,
      isOverridden: false
    };`;

if (code.includes('const price = calculateSellingPrice')) {
  code = code.replace(targetStr, newStr);
  fs.writeFileSync('src/services/pricing.ts', code);
  console.log("pricing.ts correctly patched!");
}
