const fs = require('fs');
let code = fs.readFileSync('src/components/SalesPage.tsx', 'utf8');

code = code.replace(
  /<button\s+type="button"\s+onClick=\{\(\) => onOpenNewSale\(\)\}[\s\S]*?<\/button>/,
  `{onOpenNewSale && (<button
              type="button"
              onClick={() => onOpenNewSale()}
              className="flex-1 sm:flex-initial justify-center px-3.5 sm:px-5 py-2 sm:py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs sm:text-sm font-black rounded-2xl shadow-xs transition-colors flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none"
              title="Record a Sale (Shortcut: F5)"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="whitespace-nowrap">New Sale</span>
            </button>)}`
);

fs.writeFileSync('src/components/SalesPage.tsx', code);
console.log("Patched SalesPage.tsx - New Sale");
