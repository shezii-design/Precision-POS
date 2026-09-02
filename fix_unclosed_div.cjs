const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

code = code.replace(
  '              {/* Direct Lock Button */}',
  '              </div>\n              {/* Direct Lock Button */}'
);

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log('Fixed unclosed div');
