const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

const uiTarget = `<p className="text-xs text-slate-500 font-medium mt-0.5">\n                {activeTab === 'original' ? 'Automotive Filters & Precision Machinery Spares' : <span dangerouslySetInnerHTML={{ __html: 'Your Filteration Solution<br />03226600734, 03222000734' }} />}\n              </p>`;
const uiReplacement = `<p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed" dangerouslySetInnerHTML={{ __html: 'Your Filteration Solution<br />03226600734, 03222000734<br />125-C Shoaib Bilal Market, Opp General Bus Stand Faisalabad' }} />`;

if (!code.includes(uiTarget)) {
  console.log('UI target not found!');
  console.log(code.substring(code.indexOf('<p className="text-xs text-slate-500'), code.indexOf('<p className="text-xs text-slate-500') + 300));
}

code = code.replace(uiTarget, uiReplacement);

const htmlTarget = `<div class="sub">\${activeTab === 'original' ? 'Automotive Filters & Precision Machinery Spares' : 'Your Filteration Solution<br>03226600734, 03222000734'}</div>`;
const htmlReplacement = `<div class="sub">Your Filteration Solution<br>03226600734, 03222000734<br>125-C Shoaib Bilal Market, Opp General Bus Stand Faisalabad</div>`;

if (!code.includes(htmlTarget)) {
  console.log('HTML target not found!');
}

code = code.replace(htmlTarget, htmlReplacement);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
