const fs = require('fs');
let code = fs.readFileSync('src/services/pricing.ts', 'utf-8');

const targetStr = `const existing = existingPrices?.find(p => p.tierId === tier.id);`;
const replaceStr = `const existing = existingPrices?.find(p => p.tierId === tier.id || (tier.id === 'tier-general' && p.tierId === 'tier-3'));`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/services/pricing.ts', code);
  console.log("pricing.ts fallback patched");
}
