const fs = require('fs');

for (let file of fs.readdirSync('src/components/')) {
  if (!file.endsWith('.tsx')) continue;
  let code = fs.readFileSync(`src/components/${file}`, 'utf8');

  const regex = /\{([a-zA-Z]+)\s*&&\s*\(\s*\{\1\s*\?\s*(<button[\s\S]*?<\/button>)\s*:\s*null\}\s*\)\}/g;
  code = code.replace(regex, '{$1 && ($2)}');
  
  const regex2 = /\{([a-zA-Z]+)\s*&&\s*\{\s*\1\s*\?\s*(<button[\s\S]*?<\/button>)\s*:\s*null\s*\}\s*\}/g;
  code = code.replace(regex2, '{$1 && ($2)}');

  // Let's also check for `{onOpenCreatePO && ( \n {onOpenCreatePO ?`
  // \s* will match newlines as well. Let's see if this fixes it.
  
  fs.writeFileSync(`src/components/${file}`, code);
}
console.log("Fixed syntax 2");
