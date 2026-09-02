const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

const oldNavbarRight = `<div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-nowrap">`;
const newNavbarRight = `<div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-nowrap overflow-x-auto overflow-y-hidden no-scrollbar">`;

code = code.replace(oldNavbarRight, newNavbarRight);

// If `no-scrollbar` isn't in tailwind, we can use inline styles, but let's just add `scrollbar-width: none` using style if we want to be safe,
// Actually, let's just do:
const newNavbarRightSafe = `<div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-nowrap overflow-x-auto overflow-y-hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>`;
code = code.replace(newNavbarRight, newNavbarRightSafe);
code = code.replace(oldNavbarRight, newNavbarRightSafe); // just in case

// I noticed the first left side part is also flex-nowrap and might push things. 
// Let's just make the right side max-w for mobile so it scrolls instead of getting pushed out of the viewport.
code = code.replace(`style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>`, `style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', maxWidth: 'calc(100vw - 120px)' }}>`);

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log('patched Navbar mobile scrolling');
