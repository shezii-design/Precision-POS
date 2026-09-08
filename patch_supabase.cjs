const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf-8');

const targetStr = `  if (row.tier3_name || (row.tier3_price !== null && row.tier3_price !== undefined && row.tier3_price > 0)) {
    sellingPrices.push({
      tierId: 'tier-3',
      tierName: row.tier3_name || 'Tier 3',
      price: Number(row.tier3_price) || 0,
      markupPercent: Number(row.tier3_markup) || 0,
    });
  }`;

const replaceStr = `  if (row.tier3_name || (row.tier3_price !== null && row.tier3_price !== undefined && row.tier3_price > 0)) {
    const isGen = row.tier3_name && row.tier3_name.toLowerCase().includes('general');
    sellingPrices.push({
      tierId: isGen ? 'tier-general' : 'tier-3',
      tierName: row.tier3_name || (isGen ? 'General Price' : 'Tier 3'),
      price: Number(row.tier3_price) || 0,
      markupPercent: Number(row.tier3_markup) || 0,
      isOverridden: isGen ? true : false,
    });
  }`;

if (code.includes("tierId: 'tier-3',") || code.includes('tierId: "tier-3",')) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/services/supabase.ts', code);
  console.log("Supabase tier-3 mapping patched");
} else {
  console.log("Could not find tier-3 mapping");
}
