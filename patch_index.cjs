const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf-8');

const headTags = `<meta name="theme-color" content="#b91c1c" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="PrecisionPOS" />
    <link rel="apple-touch-icon" href="/favicon.svg" />`;
code = code.replace(/<title>/, headTags + '\n    <title>');

fs.writeFileSync('index.html', code);
console.log('patched index.html');
