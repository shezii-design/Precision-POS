const fs = require('fs');
let code = fs.readFileSync('.github/workflows/deploy.yml', 'utf-8');

const regex = /      # Check for Android directory and print SHA fingerprints if it exists[\s\S]*?fi\n\n/g;
code = code.replace(regex, '');

fs.writeFileSync('.github/workflows/deploy.yml', code);
console.log('patched deploy');
