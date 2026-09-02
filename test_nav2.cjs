const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

code = code.replace(
  '<div className="flex items-center justify-between h-13 sm:h-14 gap-1.5 sm:gap-2">',
  '<div className="flex items-center justify-between w-full h-13 sm:h-14 gap-1.5 sm:gap-2 min-w-0">'
);

fs.writeFileSync('src/components/Navbar.tsx', code);
