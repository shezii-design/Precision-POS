const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf-8');
code = code.replace(
  '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />'
);
fs.writeFileSync('index.html', code);
console.log('patched index');
