const fs = require('fs');

const components = ['ProductCard.tsx', 'ProductTable.tsx'];

for (const comp of components) {
  if (!fs.existsSync(`src/components/${comp}`)) continue;
  let code = fs.readFileSync(`src/components/${comp}`, 'utf8');

  const restrictedProps = [
    'onEdit', 'onDelete', 'onDuplicate', 'onPrintLabel', 'onAdjustStock'
  ];

  for (const prop of restrictedProps) {
    const regex = new RegExp(`(<button[^>]*onClick=\\{[^}]*\\b${prop}\\b[^}]*\\}[^>]*>[\\s\\S]*?<\\/button>)`, 'g');
    
    code = code.replace(regex, (match) => {
      if (match.includes(`{${prop} &&`)) return match;
      return `{${prop} ? ${match} : null}`;
    });
  }

  fs.writeFileSync(`src/components/${comp}`, code);
}
console.log("Patched ProductCard and Table");
