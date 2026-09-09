const fs = require('fs');
let code = fs.readFileSync('src/components/SalesPage.tsx', 'utf8');

code = code.replace(/onOpenNewSale: \(\) => void;/g, 'onOpenNewSale?: () => void;');
code = code.replace(/onEditSale: \(sale: Sale\) => void;/g, 'onEditSale?: (sale: Sale) => void;');
code = code.replace(/onOpenCustomerReturn: \(sale: Sale\) => void;/g, 'onOpenCustomerReturn?: (sale: Sale) => void;');

// Now hide buttons if they are not provided
code = code.replace(
  /<button\s+onClick=\{\(\) => onOpenNewSale\(\)\}[\s\S]*?<\/button>/,
  `{onOpenNewSale && (<button
            onClick={() => onOpenNewSale()}
            className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Sale
          </button>)}`
);

code = code.replace(
  /<button\s+onClick=\{\(\) => \{\s*setShowActions\(false\);\s*onEditSale\(sale\);\s*\}\}[\s\S]*?<\/button>/,
  `{onEditSale && (<button
                            onClick={() => { setShowActions(false); onEditSale(sale); }}
                            className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                          >
                            <Edit3 className="w-4 h-4 text-slate-400" />
                            Edit details
                          </button>)}`
);

code = code.replace(
  /<button\s+onClick=\{\(\) => \{\s*setShowActions\(false\);\s*onOpenCustomerReturn\(sale\);\s*\}\}[\s\S]*?<\/button>/,
  `{onOpenCustomerReturn && (<button
                            onClick={() => { setShowActions(false); onOpenCustomerReturn(sale); }}
                            className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <RotateCcw className="w-4 h-4 text-red-500" />
                            Process Return
                          </button>)}`
);

fs.writeFileSync('src/components/SalesPage.tsx', code);
console.log("Patched SalesPage.tsx");
