const fs = require('fs');
let code = fs.readFileSync('src/components/PurchasesPage.tsx', 'utf8');

code = code.replace(/\{\s*onOpenNewPurchase && \(\s*<button/g, 'onOpenNewPurchase ? (<button');
code = code.replace(/<\/span>\s*<\/button>\s*\)\s*\}/g, '</span>\n            </button>\n            ) : null');

fs.writeFileSync('src/components/PurchasesPage.tsx', code);
console.log("Fixed PurchasesPage.tsx syntax");
