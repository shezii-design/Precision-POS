const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

// Update company info in handleDownloadHTML
code = code.replace(
  '<h1 class="company">PRECISION PARTS & INVENTORY</h1>',
  '<h1 class="company">King Filter House</h1>'
);
code = code.replace(
  '<div class="sub">Automotive Filters & Machinery Spare Parts | Pakistan</div>',
  '<div class="sub">Your Filteration Solution<br>03226600734, 03222000734</div>'
);

// Update company info in UI
code = code.replace(
  '<h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">\n                  PRECISION INVENTORY\n                </h1>',
  '<h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">\n                  King Filter House\n                </h1>'
);
code = code.replace(
  '<p className="text-xs text-slate-500 font-medium mt-0.5">\n                Automotive Filters & Precision Machinery Spares\n              </p>',
  '<p className="text-xs text-slate-500 font-medium mt-0.5">\n                Your Filteration Solution<br />03226600734, 03222000734\n              </p>'
);


fs.writeFileSync('src/components/InvoiceModal.tsx', code);
