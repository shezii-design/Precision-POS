const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

const target = `<h1 class="company">{activeTab === 'original' ? 'PRECISION INVENTORY' : 'King Filter House'}`;
const replacement = `<h1 class="company">\${activeTab === 'original' ? 'PRECISION INVENTORY' : 'King Filter House'}`;
code = code.replace(target, replacement);

const targetSub = `<div class="sub">Your Filteration Solution<br>03226600734, 03222000734</div>`;
const replacementSub = `<div class="sub">\${activeTab === 'original' ? 'Automotive Filters & Precision Machinery Spares' : 'Your Filteration Solution<br>03226600734, 03222000734'}</div>`;
code = code.replace(targetSub, replacementSub);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
