const fs = require('fs');

// Fix index.html
let html = fs.readFileSync('index.html', 'utf-8');
html = html.replace(/href="\/favicon\.svg"/g, 'href="favicon.svg"');
html = html.replace(/href="\/favicon\.ico"/g, 'href="favicon.ico"');
fs.writeFileSync('index.html', html);

// Fix vite.config.ts
let vite = fs.readFileSync('vite.config.ts', 'utf-8');
vite = vite.replace(/src: '\/favicon\.svg'/g, "src: 'favicon.svg'");
fs.writeFileSync('vite.config.ts', vite);
console.log('Fixed favicon paths');
