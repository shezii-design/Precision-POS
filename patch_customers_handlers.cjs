const fs = require('fs');
let code = fs.readFileSync('src/components/CustomersPage.tsx', 'utf-8');

const functionsToPatch = [
  'handleSaveCustomer',
  'handleDeleteCustomer',
  'handleSavePayment'
];

let injected = false;
functionsToPatch.forEach(fn => {
  const regex = new RegExp(`(const ${fn} = \\([^)]*\\)(?: *: *[^=]+)? *=> *{)`);
  if (regex.test(code)) {
    if (!code.includes('useOnlineStatus')) {
       code = `import { useOnlineStatus } from '../hooks/useOnlineStatus';\n` + code;
    }
    if (!injected) {
       // Insert the hook inside the component
       code = code.replace(`const [searchQuery, setSearchQuery] = useState('');`, `const [searchQuery, setSearchQuery] = useState('');\n  const isOnline = useOnlineStatus();`);
       injected = true;
    }
    code = code.replace(regex, `$1\n    if (!isOnline) { alert('Offline Mode (Read-Only)\\nCannot perform write/edit actions while offline.'); return; }`);
  }
});

fs.writeFileSync('src/components/CustomersPage.tsx', code);
console.log('patched CustomersPage.tsx handlers');
