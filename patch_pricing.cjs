const fs = require('fs');
let code = fs.readFileSync('src/services/pricing.ts', 'utf-8');

// Update activeTierCount default to 3 and add General Price
if (code.includes('activeTierCount: 2,')) {
  code = code.replace(
    'activeTierCount: 2,',
    'activeTierCount: 3,'
  );
}

if (!code.includes("tier-general")) {
  code = code.replace(
    "{ id: 'tier-retail', name: 'Retail', markupPercent: 25, isDefault: true },",
    "{ id: 'tier-retail', name: 'Retail', markupPercent: 25, isDefault: true },\n    { id: 'tier-general', name: 'General Price', markupPercent: 0, isDefault: true },"
  );
}

// Modify generateProductSellingPrices
const genStr = `    // If the price was manually overridden for this specific product, preserve it unless recalculate is forced
    if (existing && existing.isOverridden) {
      return existing;
    }

    const price = calculateSellingPrice(costPrice, tier.markupPercent, settings.roundToNearest);
    return {
      tierId: tier.id,
      tierName: tier.name,
      price,
      markupPercent: tier.markupPercent,
    };`;

const newGenStr = `    // If the price was manually overridden for this specific product, preserve it unless recalculate is forced
    if (existing && existing.isOverridden) {
      return existing;
    }

    const isGeneral = tier.id === 'tier-general' || tier.name.toLowerCase().includes('general');
    
    // If it's the general price, it doesn't follow markup, it stays 0 until edited (or keeps existing)
    if (isGeneral) {
      return {
        tierId: tier.id,
        tierName: tier.name,
        price: existing ? existing.price : 0,
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
    };`;

if (!code.includes("isGeneral")) {
  code = code.replace(genStr, newGenStr);
  fs.writeFileSync('src/services/pricing.ts', code);
  console.log("pricing.ts patched");
} else {
  console.log("pricing.ts already patched");
}
