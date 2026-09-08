const fs = require('fs');
let code = fs.readFileSync('src/services/excel.ts', 'utf-8');

// 1. exportProductsToExcel - Find the pricing block and add generalPrice
const exportBlock1 = `    const retail = sellingPrices.find(s => s?.tierName?.toLowerCase()?.includes('retail'))?.price || '';`;
const newExportBlock1 = `    const retail = sellingPrices.find(s => s?.tierName?.toLowerCase()?.includes('retail'))?.price || '';
    const generalPrice = sellingPrices.find(s => s?.tierId === 'tier-general' || s?.tierName?.toLowerCase()?.includes('general'))?.price || '';`;

if (code.includes(exportBlock1) && !code.includes('const generalPrice')) {
  code = code.replace(exportBlock1, newExportBlock1);
}

const exportBlock2 = `      'Retail Price (PKR)': retail,`;
const newExportBlock2 = `      'Retail Price (PKR)': retail,
      'General Price (PKR)': generalPrice,`;

if (code.includes(exportBlock2) && !code.includes("'General Price (PKR)': generalPrice,")) {
  code = code.replace(exportBlock2, newExportBlock2);
}

const exportCols1 = `    { wch: 18 }, // Retail`;
const newExportCols1 = `    { wch: 18 }, // Retail
    { wch: 18 }, // General Price`;

if (code.includes(exportCols1) && !code.includes('// General Price')) {
  code = code.replace(exportCols1, newExportCols1);
}

// 2. exportProductsToCSV
const csvBlock1 = `    const retail = sellingPrices.find(s => s?.tierName?.toLowerCase()?.includes('retail'))?.price || '';`;
const newCsvBlock1 = `    const retail = sellingPrices.find(s => s?.tierName?.toLowerCase()?.includes('retail'))?.price || '';
    const generalPrice = sellingPrices.find(s => s?.tierId === 'tier-general' || s?.tierName?.toLowerCase()?.includes('general'))?.price || '';`;

if (code.includes(csvBlock1) && code.indexOf(csvBlock1) !== code.lastIndexOf(csvBlock1)) {
  // It occurs twice (Excel and CSV), so we can just replace globally if needed, or target the second one.
  // We'll just replace all instances that haven't been replaced.
  code = code.split(csvBlock1).join(newCsvBlock1);
}

const csvBlock2 = `      'Retail Price (PKR)': retail,`;
const newCsvBlock2 = `      'Retail Price (PKR)': retail,
      'General Price (PKR)': generalPrice,`;

if (code.includes(csvBlock2) && code.indexOf(csvBlock2) !== code.lastIndexOf(csvBlock2)) {
  code = code.split(csvBlock2).join(newCsvBlock2);
}

// 3. ParsedImportRow interface
const interfaceBlock = `  retailPrice?: number;`;
const newInterfaceBlock = `  retailPrice?: number;
  generalPrice?: number;`;

if (code.includes(interfaceBlock) && !code.includes('generalPrice?: number;')) {
  code = code.replace(interfaceBlock, newInterfaceBlock);
}

// 4. parseFileForImport
const parseBlock = `          const retailPrice = Number(normalized['retailpricepkr'] || normalized['retailprice'] || normalized['retail'] || 0);`;
const newParseBlock = `          const retailPrice = Number(normalized['retailpricepkr'] || normalized['retailprice'] || normalized['retail'] || 0);
          const generalPrice = Number(normalized['generalpricepkr'] || normalized['generalprice'] || normalized['general'] || 0);`;

if (code.includes(parseBlock) && !code.includes('const generalPrice = Number(')) {
  code = code.replace(parseBlock, newParseBlock);
}

const parseObjBlock = `            wholesalePrice,
            retailPrice,`;
const newParseObjBlock = `            wholesalePrice,
            retailPrice,
            generalPrice,`;

if (code.includes(parseObjBlock) && !code.includes('generalPrice,')) {
  code = code.replace(parseObjBlock, newParseObjBlock);
}

// 5. downloadSampleTemplate
const templateBlock = `      'Retail Price (PKR)': 4000,`;
const newTemplateBlock = `      'Retail Price (PKR)': 4000,
      'General Price (PKR)': 0,`;

if (code.includes(templateBlock) && !code.includes("'General Price (PKR)': 0,")) {
  code = code.replace(templateBlock, newTemplateBlock);
}

const templateBlock2 = `      'Retail Price (PKR)': 2315,`;
const newTemplateBlock2 = `      'Retail Price (PKR)': 2315,
      'General Price (PKR)': 0,`;

if (code.includes(templateBlock2) && !code.includes("'General Price (PKR)': 0,")) {
  // It occurs once or more, replace globally if needed
  code = code.replace(templateBlock2, newTemplateBlock2);
}

fs.writeFileSync('src/services/excel.ts', code);
console.log("excel.ts patched for general price");
