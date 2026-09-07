const fs = require('fs');
let code = fs.readFileSync('src/services/excel.ts', 'utf-8');

if (!code.includes("exportAnalyticsToExcel")) {
  const newFunc = `
import { calculateSmartROP, buildProductSalesMap } from './analytics';
import { Sale } from '../types';

export function exportAnalyticsToExcel(products: Product[], sales: Sale[], fileName: string = 'analytics_eoq_export.xlsx'): void {
  const salesMap = buildProductSalesMap(sales);
  const now = new Date();

  const rows = products.map(p => {
    const insight = calculateSmartROP(p, salesMap, now);
    
    return {
      'Internal ID': sanitizeFormulaCell(p.internalId),
      'Part Number (Name)': sanitizeFormulaCell(p.name),
      'Brand': sanitizeFormulaCell(p.brandName),
      'Type / Category': sanitizeFormulaCell(p.typeName),
      'Location': sanitizeFormulaCell(p.locationName),
      'Cabin / Shelf': sanitizeFormulaCell(p.cabinNumber),
      'Current Stock': p.stockQuantity,
      'Min Stock Alert (Current)': p.minStockAlert,
      'Unit': p.unit,
      'Cost Price (PKR)': p.costPrice,
      '30-Day Sales': insight ? insight.avgDailySales * 30 : 0,
      'Daily Sales Avg': insight ? Number(insight.avgDailySales.toFixed(2)) : 0,
      'Smart ROP (Suggested Min)': insight ? insight.suggestedROP : p.minStockAlert,
      'Calculated EOQ (Order Qty)': insight ? insight.eoq : 0,
      'Stock Status': p.stockQuantity <= (insight ? insight.suggestedROP : p.minStockAlert) ? 'LOW STOCK' : 'Healthy',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics & EOQ');
  
  // Auto-size columns roughly
  const colWidths = [
    { wch: 12 }, // ID
    { wch: 25 }, // Name
    { wch: 15 }, // Brand
    { wch: 15 }, // Type
    { wch: 15 }, // Location
    { wch: 12 }, // Cabin
    { wch: 15 }, // Stock
    { wch: 25 }, // Min Stock
    { wch: 8 },  // Unit
    { wch: 15 }, // Cost Price
    { wch: 15 }, // 30-Day Sales
    { wch: 15 }, // Daily Avg
    { wch: 25 }, // Smart ROP
    { wch: 25 }, // Calculated EOQ
    { wch: 15 }, // Stock Status
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, fileName);
}
`;
  
  // We need to inject imports carefully
  if (!code.includes("import { calculateSmartROP")) {
      code = code.replace(
        "import { getNextInternalId } from './storage';",
        "import { getNextInternalId } from './storage';\nimport { calculateSmartROP, buildProductSalesMap } from './analytics';\nimport { Sale } from '../types';"
      );
  }

  code += newFunc.replace(/import \{ calculateSmartROP.*?Sale \}.*?;/s, '');
  fs.writeFileSync('src/services/excel.ts', code);
  console.log("excel.ts patched");
}
