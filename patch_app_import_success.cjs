const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `  const handleImportSuccess = (importedProducts: Product[], mode: 'append' | 'overwrite') => {
    if (mode === 'append') {`;

const replacement = `  const handleImportSuccess = (importedProducts: Product[], mode: 'append' | 'overwrite', newBrands?: Brand[], newTypes?: ProductType[], newLocations?: LocationItem[]) => {
    if (newBrands) setBrands(newBrands);
    if (newTypes) setTypes(newTypes);
    if (newLocations) setLocations(newLocations);
    
    if (mode === 'append') {`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
console.log('Patched App.tsx handleImportSuccess');
