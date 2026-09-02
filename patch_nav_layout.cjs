const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

const oldHeaderContainer = `<div className="flex items-center justify-between w-full h-13 sm:h-14 gap-1.5 sm:gap-2 min-w-0">`;
const newHeaderContainer = `<div className="flex flex-col sm:flex-row sm:items-center justify-between w-full min-w-0 gap-2 sm:gap-0 py-2 sm:py-0 sm:h-14">`;
code = code.replace(oldHeaderContainer, newHeaderContainer);

const oldLeft = `<div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">`;
const newLeft = `<div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 min-w-0 shrink-0 w-full sm:w-auto">`;
code = code.replace(oldLeft, newLeft);

const oldRight = `<div className="flex items-center gap-1 sm:gap-1.5 ml-auto flex-nowrap overflow-x-auto overflow-y-hidden shrink-0 max-w-[55vw] sm:max-w-none mask-fade-edges" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>`;
const newRight = `<div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap overflow-x-auto overflow-y-hidden shrink-0 w-full sm:w-auto pb-0.5 sm:pb-0 mask-fade-edges" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>`;
code = code.replace(oldRight, newRight);

// Ensure mask-fade-edges class doesn't cause issues if it's cutting off. It shouldn't, but let's remove it from mobile just in case.
// Actually mask-fade-edges might be fine. 

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log('patched Navbar layout');
