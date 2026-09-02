const fs = require('fs');
let code = fs.readFileSync('src/vite-env.d.ts', 'utf-8');

code = code.replace(
  '/// <reference types="vite/client" />',
  '/// <reference types="vite/client" />\n/// <reference types="vite-plugin-pwa/client" />'
);

fs.writeFileSync('src/vite-env.d.ts', code);
console.log('patched vite-env');
