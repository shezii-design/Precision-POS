const fs = require('fs');
let code = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');

// Replace the hardcoded helper text on the pin screen
code = code.replace(
  '<span className="text-[11px] text-slate-400">Default PIN: 1234</span>',
  '{(!authState.pin || authState.pin === "1234") && <span className="text-[11px] text-slate-400">Default PIN: 1234</span>}'
);

fs.writeFileSync('src/components/AuthModal.tsx', code);
console.log("Patched AuthModal UI");
