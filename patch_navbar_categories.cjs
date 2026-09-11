const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

code = code.replace(
  /<button[^>]*onClick=\{\(\) => \{\s*setShowToolsMenu\(false\);\s*onOpenCategories\(\);\s*\}\}[\s\S]*?<\/button>/g,
  (match) => `{canImportExport && ${match}}`
);

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log("Patched Navbar.tsx Categories button");
