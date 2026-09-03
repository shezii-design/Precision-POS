const fs = require('fs');
let code = fs.readFileSync('src/components/BulkImportModal.tsx', 'utf-8');

const targetRegex = /const handleConfirmImport = \(\) => \{[\s\S]*?\/\/ Confetti celebration/m;

const replacement = `const handleConfirmImport = () => {
    if (!parsedRows || parsedRows.length === 0) return;

    let currentWorkingList = [...existingProducts];
    const newProducts: Product[] = [];
    
    const currentBrands = [...brands];
    const currentTypes = [...types];
    const currentLocations = [...locations];

    parsedRows.forEach((row, index) => {
      let assignedId = row.internalId;
      if (!assignedId || importMode === 'append') {
        assignedId = getNextInternalId([...currentWorkingList, ...newProducts]);
      }

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
      }

      const computedSellingPrices = generateProductSellingPrices(row.costPrice, pricingSettings);
      if (row.wholesalePrice && computedSellingPrices[0]) {
        computedSellingPrices[0].price = row.wholesalePrice;
        computedSellingPrices[0].isOverridden = true;
      }
      if (row.retailPrice && computedSellingPrices[1]) {
        computedSellingPrices[1].price = row.retailPrice;
        computedSellingPrices[1].isOverridden = true;
      }

      const prod: Product = {
        id: \`prod-import-\${Date.now()}-\${index}\`,
        internalId: assignedId,
        name: row.name,
        image: row.image || undefined,
        typeId: typeMatch.id,
        typeName: typeMatch.name,
        brandId: brandMatch.id,
        brandName: brandMatch.name,
        locationId: locMatch.id,
        locationName: locMatch.name,
        cabinNumber: row.cabinNumber || 'C-01',
        stockQuantity: row.stockQuantity,
        minStockAlert: 5,
        unit: (row.unit as any) || 'Pcs',
        costPrice: row.costPrice,
        sellingPrices: computedSellingPrices,
        dimensions: {
          height: row.height,
          outerDia: row.outerDia,
          innerDia: row.innerDia,
          inputUnit: 'inch',
          thread: row.thread,
          gasket_OD: row.gasket_OD,
          gasket_ID: row.gasket_ID,
        },
        dimensionLabels: {
          heightName: 'H',
          outerDiaName: 'OD',
          innerDiaName: 'ID',
        },
        machineNames: row.machineNames,
        crossReferences: row.crossReferences,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      newProducts.push(prod);
    });

    onImportSuccess(newProducts, importMode, currentBrands, currentTypes, currentLocations);

    // Confetti celebration`;

code = code.replace(targetRegex, replacement);
fs.writeFileSync('src/components/BulkImportModal.tsx', code);
console.log('Fixed BulkImportModal');
