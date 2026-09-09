const fs = require('fs');
let code = fs.readFileSync('src/components/PurchasesPage.tsx', 'utf8');

code = code.replace(/<\/span>\s*<\/button>\s*\)\s*:\s*null/g, '</span>\n            </button>\n            )}');
code = code.replace(/onOpenNewPurchase \? \(\<button/g, '{onOpenNewPurchase && (<button');

fs.writeFileSync('src/components/PurchasesPage.tsx', code);
console.log("Fixed PurchasesPage.tsx syntax back to original ternary");
