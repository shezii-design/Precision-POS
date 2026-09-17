const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf8');

// There are probably multiple fetch methods, let's find the main one
code = code.replace(
  'invoiceNamingPreference: row.invoice_naming_preference || \'product_name\',',
  'invoiceNamingPreference: row.invoice_naming_preference || \'product_name\',\n        pdfEdits: row.pdf_edits || undefined,'
);

fs.writeFileSync('src/services/supabase.ts', code);
