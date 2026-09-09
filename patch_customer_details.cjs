const fs = require('fs');
let code = fs.readFileSync('src/components/CustomerDetailsPage.tsx', 'utf8');

code = code.replace(/onOpenNewSaleForCustomer: \(customerId: string, presetItems\?: InitialSaleItemPreset\[\]\) => void;/g, 
  "onOpenNewSaleForCustomer?: (customerId: string, presetItems?: InitialSaleItemPreset[]) => void;");

code = code.replace(
  /<button\s+onClick=\{\(\) => onOpenNewSaleForCustomer\(currentCustomer\.id\)\}[\s\S]*?<\/button>/,
  `{onOpenNewSaleForCustomer && (<button
            onClick={() => onOpenNewSaleForCustomer(currentCustomer.id)}
            className="flex-1 sm:flex-initial justify-center px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <ShoppingCart className="w-4 h-4 stroke-[3]" />
            New Sale
          </button>)}`
);

code = code.replace(
  /<button\s+onClick=\{\(\) => onOpenNewSaleForCustomer\(currentCustomer\.id\)\}[\s\S]*?<\/button>/,
  `{onOpenNewSaleForCustomer && (<button
              onClick={() => onOpenNewSaleForCustomer(currentCustomer.id)}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-black shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer select-none"
            >
              <ShoppingCart className="w-4 h-4 stroke-[3]" />
              New Sale Invoice
            </button>)}`
);

code = code.replace(
  /onOpenNewSaleForCustomer\(currentCustomer\.id, selectedItemsToRecord\);/g,
  "if (onOpenNewSaleForCustomer) onOpenNewSaleForCustomer(currentCustomer.id, selectedItemsToRecord);"
);

code = code.replace(
  /onOpenNewSaleForCustomer\(currentCustomer\.id, itemsList\);/g,
  "if (onOpenNewSaleForCustomer) onOpenNewSaleForCustomer(currentCustomer.id, itemsList);"
);

fs.writeFileSync('src/components/CustomerDetailsPage.tsx', code);
console.log("Patched CustomerDetailsPage.tsx");
