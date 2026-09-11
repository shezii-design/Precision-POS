const fs = require('fs');
let code = fs.readFileSync('src/components/ProductCard.tsx', 'utf8');

// Make tiered pricing grid stand out
code = code.replace(/className={\`p-2 rounded-xl border transition-colors/g, 'className={`p-3 rounded-xl border-2 transition-colors');
code = code.replace(/<span className="truncate flex items-center gap-1">/g, '<span className="truncate flex items-center gap-1.5">');

// Make the product title a bit larger and prominent
code = code.replace(/<h3 className="text-lg font-black/g, '<h3 className="text-xl font-black');

// Improve Cost Price display
code = code.replace(/<span className="text-sm font-bold text-red-200 uppercase/g, '<span className="text-sm font-bold text-red-200 uppercase tracking-widest');

fs.writeFileSync('src/components/ProductCard.tsx', code);
console.log("Patched ProductCard UI 3");
