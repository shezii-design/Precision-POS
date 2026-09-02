const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

const oldTextWrapper = `<div className="hidden sm:block leading-tight">`;
const newTextWrapper = `<div className="block leading-tight">`;
code = code.replace(oldTextWrapper, newTextWrapper);

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log('patched Navbar text visibility');
