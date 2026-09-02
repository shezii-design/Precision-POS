const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

// Replace the right container to remove justify-end and add ml-auto, but keep overflow-x-auto
code = code.replace(
  '<div className="flex items-center justify-end gap-1 sm:gap-1.5 flex-1 min-w-0 flex-nowrap overflow-x-auto overflow-y-hidden" style={{ scrollbarWidth: \'none\', msOverflowStyle: \'none\' }}>',
  '<div className="flex items-center gap-1 sm:gap-1.5 ml-auto overflow-x-auto overflow-y-hidden shrink-0 max-w-[60vw]" style={{ scrollbarWidth: \'none\', msOverflowStyle: \'none\' }}>'
);

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log('patched Navbar mobile overlapping');
