const fs = require('fs');
let code = fs.readFileSync('src/services/auth.ts', 'utf8');

code = code.replace(
  'matched = employees.find(e => e.pin === identifierOrPin.trim() && e.status === \'active\');',
  'matched = employees.find(e => String(e.pin) === identifierOrPin.trim() && e.status === \'active\');'
);

code = code.replace(
  'const inactive = employees.find(e => e.pin === identifierOrPin.trim());',
  'const inactive = employees.find(e => String(e.pin) === identifierOrPin.trim());'
);

code = code.replace(
  '(e.pin === pin.trim() || e.password === pin.trim())',
  '(String(e.pin) === pin.trim() || e.password === pin.trim())'
);

fs.writeFileSync('src/services/auth.ts', code);
console.log("Patched auth.ts");
