const fs = require('fs');
let code = fs.readFileSync('src/components/BulkImportModal.tsx', 'utf-8');

// Replace onImportSuccess definition
code = code.replace(
  `onImportSuccess: (importedProducts: Product[], mode: 'append' | 'overwrite') => void;`,
  `onImportSuccess: (importedProducts: Product[], mode: 'append' | 'overwrite', newBrands: Brand[], newTypes: ProductType[], newLocations: LocationItem[]) => void;`
);

fs.writeFileSync('src/components/BulkImportModal.tsx', code);
console.log('Patched BulkImportModalProps');
