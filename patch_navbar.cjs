const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

code = code.replace(
  /\{canManageSettings && \(\s*<button\s+type="button"\s+onClick=\{\(\) => \{\s*setShowToolsMenu\(false\);\s*onOpenWipeData\(\);\s*\}\}/,
  `{isActionAllowed(currentEmployee, 'canClearRecords') && (
                      <button
                        type="button"
                        onClick={() => { setShowToolsMenu(false); onOpenWipeData(); }}`
);

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log("Patched Navbar.tsx wipe data");
