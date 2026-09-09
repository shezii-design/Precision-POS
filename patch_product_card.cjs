const fs = require('fs');
let code = fs.readFileSync('src/components/ProductCard.tsx', 'utf8');

code = code.replace(
  /<button\s+onClick=\{\(\) => \{\s*setShowMenu\(false\);\s*onDuplicate\(product\);\s*\}\}[\s\S]*?<\/button>/,
  `{onDuplicate && (<button
                      onClick={() => { setShowMenu(false); onDuplicate(product); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <Copy className="w-3.5 h-3.5" /> Duplicate
                    </button>)}`
);

code = code.replace(
  /<button\s+onClick=\{\(\) => \{\s*setShowMenu\(false\);\s*onEdit\(product\);\s*\}\}[\s\S]*?<\/button>/,
  `{onEdit && (<button
                      onClick={() => { setShowMenu(false); onEdit(product); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit details
                    </button>)}`
);

code = code.replace(
  /<button\s+onClick=\{\(\) => \{\s*setShowMenu\(false\);\s*onDelete\(product\.id\);\s*\}\}[\s\S]*?<\/button>/,
  `{onDelete && (<button
                      onClick={() => { setShowMenu(false); onDelete(product.id); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete product
                    </button>)}`
);

code = code.replace(
  /<button\s+onClick=\{\(\) => \{\s*setShowMenu\(false\);\s*onPrintLabel\(product\);\s*\}\}[\s\S]*?<\/button>/,
  `{onPrintLabel && (<button
                      onClick={() => { setShowMenu(false); onPrintLabel(product); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print barcode
                    </button>)}`
);

code = code.replace(
  /<button\s+onClick=\{\(\) => \{\s*setShowMenu\(false\);\s*onAdjustStock\(product\);\s*\}\}[\s\S]*?<\/button>/,
  `{onAdjustStock && (<button
                      onClick={() => { setShowMenu(false); onAdjustStock(product); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Adjust Stock
                    </button>)}`
);

// We need to also patch the main stock adjust block which might be inline
code = code.replace(
  /onClick=\{\(\) => onAdjustStock\(product\)\}/g,
  `onClick={onAdjustStock ? () => onAdjustStock(product) : undefined}`
);

// We need to patch the main quick edit block which might be inline
code = code.replace(
  /onClick=\{\(\) => onEdit\(product\)\}/g,
  `onClick={onEdit ? () => onEdit(product) : undefined}`
);

fs.writeFileSync('src/components/ProductCard.tsx', code);
console.log("Patched ProductCard.tsx");
