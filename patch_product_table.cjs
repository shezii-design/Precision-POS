const fs = require('fs');
let code = fs.readFileSync('src/components/ProductTable.tsx', 'utf8');

code = code.replace(
  /<button\s+type="button"\s+onClick=\{\(\) => onDuplicate\(p\)\}[\s\S]*?<\/button>/,
  `{onDuplicate && (<button
                        type="button"
                        onClick={() => onDuplicate(p)}
                        className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>)}`
);

code = code.replace(
  /<button\s+type="button"\s+onClick=\{\(\) => onEdit\(p\)\}[\s\S]*?<\/button>/,
  `{onEdit && (<button
                        type="button"
                        onClick={() => onEdit(p)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>)}`
);

code = code.replace(
  /<button\s+type="button"\s+onClick=\{\(\) => onDelete\(p\.id\)\}[\s\S]*?<\/button>/,
  `{onDelete && (<button
                        type="button"
                        onClick={() => onDelete(p.id)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>)}`
);

code = code.replace(
  /<button\s+type="button"\s+onClick=\{\(\) => onPrintLabel\(p\)\}[\s\S]*?<\/button>/,
  `{onPrintLabel && (<button
                        type="button"
                        onClick={() => onPrintLabel(p)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Print Barcode Label"
                      >
                        <Printer className="w-4 h-4" />
                      </button>)}`
);


fs.writeFileSync('src/components/ProductTable.tsx', code);
console.log("Patched ProductTable.tsx");
