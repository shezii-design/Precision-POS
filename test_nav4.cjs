const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

code = code.replace(
  '<div className="flex items-center gap-1 sm:gap-1.5 ml-auto overflow-x-auto overflow-y-hidden shrink-0 max-w-[60vw]" style={{ scrollbarWidth: \'none\', msOverflowStyle: \'none\' }}>',
  '<div className="flex items-center gap-1 sm:gap-1.5 ml-auto flex-nowrap overflow-x-auto overflow-y-hidden shrink-0 max-w-[55vw] sm:max-w-none mask-fade-edges" style={{ scrollbarWidth: \'none\', msOverflowStyle: \'none\' }}>'
);

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log('patched Navbar flex-nowrap');
