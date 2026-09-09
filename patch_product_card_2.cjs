const fs = require('fs');
let code = fs.readFileSync('src/components/ProductCard.tsx', 'utf8');

code = code.replace(
  /<button\s+type="button"\s+onClick=\{\(\) => onDuplicate\(product\)\}[\s\S]*?<\/button>/,
  `{onDuplicate && (<button
            type="button"
            onClick={() => onDuplicate(product)}
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shadow-2xs"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>)}`
);

code = code.replace(
  /<button\s+type="button"\s+onClick=\{onEdit \? \(\) => onEdit\(product\) \: undefined\}[\s\S]*?<\/button>/,
  `{onEdit && (<button
            type="button"
            onClick={() => onEdit(product)}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>)}`
);

fs.writeFileSync('src/components/ProductCard.tsx', code);
console.log("Patched ProductCard.tsx - part 2");
