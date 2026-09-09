const fs = require('fs');
let code = fs.readFileSync('src/services/auth.ts', 'utf8');

code = code.replace(
  "pin: '1234',",
  "pin: '1234',\n    password: 'admin',"
);

// We need to also clean up the initial employee load to not overwrite password if we change it here.
// But this is just INITIAL_EMPLOYEES.

fs.writeFileSync('src/services/auth.ts', code);
console.log("Updated auth.ts");
