const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /<button\s+type="button"\s+onClick=\{handleOpenAddProduct\}[\s\S]*?<\/button>/,
  `{isActionAllowed(currentEmployee, 'canAddProducts') && (<button
                  type="button"
                  onClick={handleOpenAddProduct}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Product ({nextInternalId})
                </button>)}`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx add product");
