const fs = require('fs');
let code = fs.readFileSync('src/components/SwitchUserModal.tsx', 'utf8');

code = code.replace(
  'if (pinToTest === targetEmployee.pin) {',
  'if (String(pinToTest) === String(targetEmployee.pin)) {'
);

code = code.replace(
  'if (selectedEmployee && next.length === selectedEmployee.pin.length) {',
  'if (selectedEmployee && next.length === String(selectedEmployee.pin || "").length) {'
);

code = code.replace(
  'length: selectedEmployee.pin.length || 4',
  'length: String(selectedEmployee.pin || "").length || 4'
);

fs.writeFileSync('src/components/SwitchUserModal.tsx', code);
console.log("Patched SwitchUserModal");
