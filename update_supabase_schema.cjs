const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf8');

// 1. Add pdfEdits to syncSalesToSupabase serialization
code = code.replace(
  'invoice_naming_preference: s.invoiceNamingPreference || \'product_name\',',
  'invoice_naming_preference: s.invoiceNamingPreference || \'product_name\',\n      pdf_edits: s.pdfEdits || null,'
);

// 2. Add pdf_edits to fetchSales deserialization
code = code.replace(
  'returnsList: row.returns_list || [],',
  'returnsList: row.returns_list || [],\n        pdfEdits: row.pdf_edits || undefined,'
);

fs.writeFileSync('src/services/supabase.ts', code);
