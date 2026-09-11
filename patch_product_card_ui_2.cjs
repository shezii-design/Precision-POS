const fs = require('fs');
let code = fs.readFileSync('src/components/ProductCard.tsx', 'utf8');

// Change cost price to text-base
code = code.replace(/<span className="font-mono font-black text-sm tracking-tight text-red-400/g, '<span className="font-mono font-black text-base tracking-tight text-white');

// Change selling price to text-base or text-lg
code = code.replace(/<div className={\`font-mono font-black text-sm sm:text-base/g, '<div className={`font-mono font-black text-base sm:text-lg');

// Ensure image container keeps its proportion, but maybe make it larger 28 (112px)?
code = code.replace(/className="w-24 h-24 rounded-2xl overflow-hidden/g, 'className="w-28 h-28 rounded-2xl overflow-hidden');
code = code.replace(/className="w-24 h-24 rounded-2xl border/g, 'className="w-28 h-28 rounded-2xl border');

fs.writeFileSync('src/components/ProductCard.tsx', code);
console.log("Patched ProductCard UI 2");
