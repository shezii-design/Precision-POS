const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf-8');

code = code.replace(
  `globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],`,
  `globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB`
);

fs.writeFileSync('vite.config.ts', code);
console.log('patched vite config maximumFileSizeToCacheInBytes');
