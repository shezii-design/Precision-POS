const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const functionsToPatch = [
  'handleCompleteSale',
  'handleDeleteSale'
];

functionsToPatch.forEach(fn => {
  const regex = new RegExp(`(const ${fn} = \\([^)]*\\)(?: *: *[^=]+)? *=> *{)`);
  if (regex.test(code)) {
    code = code.replace(regex, `$1\n    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', 'error'); return; }`);
  }
});

fs.writeFileSync('src/App.tsx', code);
console.log('patched handleCompleteSale');
