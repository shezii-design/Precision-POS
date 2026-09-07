const fs = require('fs');
let code = fs.readFileSync('src/components/BulkImportModal.tsx', 'utf-8');

const target = `      const prod: Product = {
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
      };`;

const replacement = `
      const existingProduct = importMode === 'overwrite' && row.internalId
        ? existingProducts.find(p => p.internalId.toLowerCase() === row.internalId.toLowerCase())
        : undefined;

      const prod: Product = {
        id: existingProduct ? existingProduct.id : \`prod-import-\${Date.now()}-\${index}\`,
        internalId: assignedId,
        name: row.name,
        image: row.image || (existingProduct ? existingProduct.image : undefined),
        typeId: typeMatch.id,
        typeName: typeMatch.name,
        brandId: brandMatch.id,
        brandName: brandMatch.name,
        locationId: locMatch.id,
        locationName: locMatch.name,
        cabinNumber: row.cabinNumber || (existingProduct ? existingProduct.cabinNumber : 'C-01'),
        stockQuantity: row.stockQuantity,
        minStockAlert: existingProduct ? existingProduct.minStockAlert : 5,
        unit: (row.unit as any) || (existingProduct ? existingProduct.unit : 'Pcs'),
        costPrice: row.costPrice,
        sellingPrices: computedSellingPrices,
        dimensions: {
          height: row.height !== undefined ? row.height : existingProduct?.dimensions?.height,
          outerDia: row.outerDia !== undefined ? row.outerDia : existingProduct?.dimensions?.outerDia,
          innerDia: row.innerDia !== undefined ? row.innerDia : existingProduct?.dimensions?.innerDia,
          inputUnit: 'inch',
          thread: row.thread !== undefined ? row.thread : existingProduct?.dimensions?.thread,
          gasket_OD: row.gasket_OD !== undefined ? row.gasket_OD : existingProduct?.dimensions?.gasket_OD,
          gasket_ID: row.gasket_ID !== undefined ? row.gasket_ID : existingProduct?.dimensions?.gasket_ID,
        },
        dimensionLabels: existingProduct ? existingProduct.dimensionLabels : {
          heightName: 'H',
          outerDiaName: 'OD',
          innerDiaName: 'ID',
        },
        machineNames: row.machineNames !== undefined ? row.machineNames : existingProduct?.machineNames,
        crossReferences: row.crossReferences !== undefined ? row.crossReferences : existingProduct?.crossReferences,
        createdAt: existingProduct ? existingProduct.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/BulkImportModal.tsx', code);
console.log('Patched BulkImportModal product merge logic');
