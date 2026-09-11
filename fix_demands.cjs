const fs = require('fs');

let code = fs.readFileSync('src/components/DemandsPage.tsx', 'utf8');

// The issue is `( \n {onOpenAddDemand ? <button ... /> : null} \n )` 
const regex = /\(\s*\{([a-zA-Z]+)\s*\?\s*(<button[\s\S]*?<\/button>)\s*:\s*null\}\s*\)/g;
code = code.replace(regex, '( $1 ? $2 : null )');

fs.writeFileSync('src/components/DemandsPage.tsx', code);
console.log("Fixed DemandsPage");
