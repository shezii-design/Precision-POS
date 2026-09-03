const fs = require('fs');

let appTsx = fs.readFileSync('src/App.tsx', 'utf-8');
appTsx = appTsx.replace(/'error'\); return; }/g, `); return; }`);
fs.writeFileSync('src/App.tsx', appTsx);
console.log('Fixed showToast in App.tsx');

function fixIsOnline(file) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/\n\s*if \(!isOnline\) \{ alert\('Offline Mode \(Read-Only\)\\nCannot perform write\/edit actions while offline.'\); return; \}/g, '');
  const regex = /(const handle(?:Save|Delete|Payment)[a-zA-Z]* = \([^)]*\)(?: *: *[^=]+)? *=> *{)/g;
  content = content.replace(regex, `$1\n    if (typeof window !== 'undefined' && !window.navigator.onLine) { alert('Offline Mode (Read-Only)\\nCannot perform write/edit actions while offline.'); return; }`);
  fs.writeFileSync(file, content);
}

fixIsOnline('src/components/CustomersPage.tsx');
fixIsOnline('src/components/CustomerDetailsPage.tsx');
console.log('Fixed offline checks in customer pages');
