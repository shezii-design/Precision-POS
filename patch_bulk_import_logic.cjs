const fs = require('fs');
let code = fs.readFileSync('src/components/BulkImportModal.tsx', 'utf-8');

// The replacement code:
const target = `    const currentWorkingList = [...existingProducts];
    const newProducts: Product[] = [];

    parsedRows.forEach((row, index) => {
      // Find or assign internal ID
      let assignedId = row.internalId;
      if (!assignedId || importMode === 'append') {
        assignedId = getNextInternalId([...currentWorkingList, ...newProducts]);
      }

      // Match or use provided brand/type/location
      const brandMatch = brands.find(b => b.name.toLowerCase() === row.brandName.toLowerCase()) || brands[0];
      const typeMatch = types.find(t => t.name.toLowerCase() === row.typeName.toLowerCase()) || types[0];
      const locMatch = locations.find(l => l.name.toLowerCase() === row.locationName.toLowerCase()) || locations[0];`;

const replacement = `    const currentWorkingList = [...existingProducts];
    const newProducts: Product[] = [];

    const currentBrands = [...brands];
    const currentTypes = [...types];
    const currentLocations = [...locations];

    parsedRows.forEach((row, index) => {
      // Find or assign internal ID
      let assignedId = row.internalId;
      if (!assignedId || importMode === 'append') {
        assignedId = getNextInternalId([...currentWorkingList, ...newProducts]);
      }

      // Match or auto-create brand/type/location
      let brandMatch = currentBrands.find(b => b.name.toLowerCase() === (row.brandName || '').toLowerCase());
      if (!brandMatch) {
        brandMatch = { id: \`b-\${Date.now()}-\${index}\`, name: row.brandName || 'Standard' };
        currentBrands.push(brandMatch);
      }

      let typeMatch = currentTypes.find(t => t.name.toLowerCase() === (row.typeName || '').toLowerCase());
      if (!typeMatch) {
        typeMatch = { id: \`t-\${Date.now()}-\${index}\`, name: row.typeName || 'General Part' };
        currentTypes.push(typeMatch);
      }

      let locMatch = currentLocations.find(l => l.name.toLowerCase() === (row.locationName || '').toLowerCase());
      if (!locMatch) {
        locMatch = { id: \`loc-\${Date.now()}-\${index}\`, name: row.locationName || 'Main Shop', cabins: [row.cabinNumber || 'C-01'] };
        currentLocations.push(locMatch);
      } else {
        if (row.cabinNumber && !locMatch.cabins.includes(row.cabinNumber)) {
          locMatch.cabins.push(row.cabinNumber);
        }
      }`;

code = code.replace(target, replacement);

const target2 = `    onImportSuccess(newProducts, importMode);

    // Confetti celebration`;

const replacement2 = `    onImportSuccess(newProducts, importMode, currentBrands, currentTypes, currentLocations);

    // Confetti celebration`;

code = code.replace(target2, replacement2);

fs.writeFileSync('src/components/BulkImportModal.tsx', code);
console.log('Patched BulkImportModal logic');
