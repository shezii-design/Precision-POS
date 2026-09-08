const fs = require('fs');
let code = fs.readFileSync('src/components/ProductFormModal.tsx', 'utf-8');

const targetStr = `{allowManualPriceOverride ? (
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                value={sp.price || ''}`;

const replaceStr = `{allowManualPriceOverride || sp.tierName.toLowerCase().includes('general') ? (
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                value={sp.price || ''}`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/components/ProductFormModal.tsx', code);
  console.log("ProductFormModal patched for general price input");
} else {
  console.log("Could not find targetStr");
}
