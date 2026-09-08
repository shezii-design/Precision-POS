const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

if (pkg.dependencies && pkg.dependencies.vite) {
  delete pkg.dependencies.vite;
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
  console.log("package.json patched");
}
