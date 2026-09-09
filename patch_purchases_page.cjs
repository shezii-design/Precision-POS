const fs = require('fs');
let code = fs.readFileSync('src/components/PurchasesPage.tsx', 'utf8');

code = code.replace(/onOpenNewPurchase: \(vendorId\?: string\) => void;/g, 'onOpenNewPurchase?: (vendorId?: string) => void;');
code = code.replace(/onEditPurchase: \(purchase: Purchase\) => void;/g, 'onEditPurchase?: (purchase: Purchase) => void;');
code = code.replace(/onDeletePurchase: \(purchaseId: string\) => void;/g, 'onDeletePurchase?: (purchaseId: string) => void;');

code = code.replace(
  /<button\s+type="button"\s+onClick=\{\(\) => onOpenNewPurchase\(\)\}[\s\S]*?<\/button>/g,
  `{onOpenNewPurchase && (<button
              type="button"
              onClick={() => onOpenNewPurchase()}
              className="flex-1 sm:flex-initial justify-center px-4 sm:px-6 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs sm:text-sm font-black rounded-xl sm:rounded-2xl shadow-xs sm:shadow-sm transition-colors flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none"
              title="Record a New Purchase / Bill"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
              <span className="whitespace-nowrap">New Purchase</span>
            </button>)}`
);

code = code.replace(
  /<button\s+onClick=\{\(\) => onEditPurchase\(purchase\)\}[\s\S]*?<\/button>/g,
  `{onEditPurchase && (<button
                              onClick={() => onEditPurchase(purchase)}
                              className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4 text-slate-400" />
                              Edit Bill
                            </button>)}`
);

code = code.replace(
  /<button\s+onClick=\{\(\) => onDeletePurchase\(purchase\.id\)\}[\s\S]*?<\/button>/g,
  `{onDeletePurchase && (<button
                              onClick={() => onDeletePurchase(purchase.id)}
                              className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                              Delete Bill
                            </button>)}`
);

fs.writeFileSync('src/components/PurchasesPage.tsx', code);
console.log("Patched PurchasesPage.tsx");
