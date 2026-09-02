const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

const importStatement = `import { useOnlineStatus } from '../hooks/useOnlineStatus';\n`;
if (!code.includes('useOnlineStatus')) {
  code = code.replace(`import { isActionAllowed`, importStatement + `import { isActionAllowed`);
}

const hookStatement = `  const [menuSearchQuery, setMenuSearchQuery] = useState<string>('');
  const isOnline = useOnlineStatus();`;
code = code.replace(`  const [menuSearchQuery, setMenuSearchQuery] = useState<string>('');`, hookStatement);

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log('patched navbar with useOnlineStatus hook');
