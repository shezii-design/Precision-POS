const fs = require('fs');
let code = fs.readFileSync('src/components/BulkImportModal.tsx', 'utf-8');

code = code.replace(`typeId: typeMatch?.id || 't-1'`, `typeId: typeMatch.id`);
code = code.replace(`typeName: row.typeName || typeMatch?.name || 'General Part'`, `typeName: typeMatch.name`);
code = code.replace(`brandId: brandMatch?.id || 'b-1'`, `brandId: brandMatch.id`);
code = code.replace(`brandName: row.brandName || brandMatch?.name || 'Standard'`, `brandName: brandMatch.name`);
code = code.replace(`locationId: locMatch?.id || 'loc-1'`, `locationId: locMatch.id`);
code = code.replace(`locationName: row.locationName || locMatch?.name || 'Main Shop'`, `locationName: locMatch.name`);

fs.writeFileSync('src/components/BulkImportModal.tsx', code);
console.log('Patched BulkImportModal product fields');
