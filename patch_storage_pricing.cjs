const fs = require('fs');
let code = fs.readFileSync('src/services/storage.ts', 'utf-8');

const targetStr = `export function getStoredPricingSettings(): GlobalPricingSettings {
  try {
    const raw = localStorage.getItem(PRICING_SETTINGS_KEY);
    if (!raw) {
      saveStoredPricingSettings(DEFAULT_PRICING_SETTINGS);
      return DEFAULT_PRICING_SETTINGS;
    }
    return JSON.parse(raw);
  } catch (err) {
    return DEFAULT_PRICING_SETTINGS;
  }
}`;

const replaceStr = `export function getStoredPricingSettings(): GlobalPricingSettings {
  try {
    const raw = localStorage.getItem(PRICING_SETTINGS_KEY);
    if (!raw) {
      saveStoredPricingSettings(DEFAULT_PRICING_SETTINGS);
      return DEFAULT_PRICING_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    
    // Inject General Price if missing
    if (!parsed.tiers.some(t => t.id === 'tier-general')) {
       parsed.tiers.splice(2, 0, { id: 'tier-general', name: 'General Price', markupPercent: 0, isDefault: true });
       if (parsed.activeTierCount < 3) {
           parsed.activeTierCount = 3;
       }
       saveStoredPricingSettings(parsed);
    }
    
    return parsed;
  } catch (err) {
    return DEFAULT_PRICING_SETTINGS;
  }
}`;

if (code.includes('export function getStoredPricingSettings(): GlobalPricingSettings {')) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/services/storage.ts', code);
  console.log("storage.ts pricing patched");
}
