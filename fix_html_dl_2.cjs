const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

// 1. Remove Location string from HTML download
code = code.replace(
  '${(it.locationName || it.cabinNumber) ? `<div style="font-size:11px;color:#1e40af;margin-top:2px;">📍 Location: <strong>${it.locationName || \'Main Shop\'}</strong>${it.cabinNumber ? ` (Cabin: ${it.cabinNumber})` : \'\'}</div>` : \'\'}',
  ''
);

// 2. Add @media print to hide browser headers/footers in the print view of the downloaded HTML
code = code.replace(
  '.footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }\n  </style>',
  '.footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }\n    @media print { @page { margin: 0; } body { margin: 1.6cm; } }\n  </style>'
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
