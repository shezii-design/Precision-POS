const fs = require('fs');
let code = fs.readFileSync('src/components/PurchasesPage.tsx', 'utf8');

code = code.replace(
  /\(\s*\{onOpenNewPurchase && \(\<button[\s\S]*?<\/span>\n\s*<\/button>\n\s*\)\}\s*\)/,
  '( onOpenNewPurchase ? <button type="button" onClick={() => onOpenNewPurchase()} className="flex-1 sm:flex-initial justify-center px-4 sm:px-6 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs sm:text-sm font-black rounded-xl sm:rounded-2xl shadow-xs sm:shadow-sm transition-colors flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none" title="Record a New Purchase / Bill"><Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" /><span className="whitespace-nowrap">New Purchase</span></button> : null )'
);

fs.writeFileSync('src/components/PurchasesPage.tsx', code);
console.log("Fixed PurchasesPage.tsx empty state syntax");
