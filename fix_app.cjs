const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\{\/\* 26\. Switch User \/ Operator Modal \*\/\}\s*<SwitchUserModal[\s\S]*?\/>/g;
code = code.replace(regex, '');

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed App.tsx");
