const fs = require('fs');
let code = fs.readFileSync('src/components/ProductCard.tsx', 'utf8');

// Increase Image Size
code = code.replace(/className="w-16 h-16 rounded-xl overflow-hidden/g, 'className="w-24 h-24 rounded-2xl overflow-hidden');
code = code.replace(/className="w-16 h-16 rounded-xl border/g, 'className="w-24 h-24 rounded-2xl border');
code = code.replace(/<ImageIcon className="w-6 h-6/g, '<ImageIcon className="w-8 h-8');

// Increase Product Title Size
code = code.replace(/<h3 className="text-base font-black/g, '<h3 className="text-lg font-black');

// Make Location & Cabin slightly bigger or keep as is? Let's keep as is, it's metadata.

// Increase Prices Size
// Cost Price:
code = code.replace(/<span className="text-xs font-bold text-red-200 uppercase/g, '<span className="text-sm font-bold text-red-200 uppercase');
code = code.replace(/text-xs font-black text-red-100/g, 'text-sm font-black text-red-100');
code = code.replace(/<span className="font-mono text-xs font-black/g, '<span className="font-mono text-sm font-black');

// Tiered Selling Prices
code = code.replace(/<div className={\`font-mono font-black text-xs/g, '<div className={`font-mono font-black text-sm sm:text-base');
code = code.replace(/<div className="flex items-center justify-between text-\[10px\]/g, '<div className="flex items-center justify-between text-xs');
code = code.replace(/<span className={\`px-1\.5 py-0\.2 rounded text-\[10px\]/g, '<span className={`px-1.5 py-0.5 rounded text-[11px]');

fs.writeFileSync('src/components/ProductCard.tsx', code);
console.log("Patched ProductCard UI");
