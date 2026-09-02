const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

code = code.replace(
  /<div className="flex items-center gap-1 sm:gap-1\.5 shrink-0 flex-nowrap overflow-x-auto overflow-y-hidden".*?>/,
  '<div className="flex items-center justify-end gap-1 sm:gap-1.5 flex-1 min-w-0 flex-nowrap overflow-x-auto overflow-y-hidden" style={{ scrollbarWidth: \'none\', msOverflowStyle: \'none\' }}>'
);

fs.writeFileSync('src/components/Navbar.tsx', code);
