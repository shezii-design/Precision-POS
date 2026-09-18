const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

const htmlTarget = `<h1 class="company">\${activeTab === 'original' ? 'PRECISION INVENTORY' : 'King Filter House'}`;
const htmlReplacement = `<h1 class="company">King Filter House`;
code = code.replace(htmlTarget, htmlReplacement);

const uiTarget = `{activeTab === 'original' ? 'PRECISION INVENTORY' : 'King Filter House'}`;
const uiReplacement = `King Filter House`;
code = code.replace(uiTarget, uiReplacement);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
