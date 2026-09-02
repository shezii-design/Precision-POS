import * as XLSX from 'xlsx';
import { Product, ProductSellingPrice, StockLog } from '../types';
import { getNextInternalId } from './storage';

/**
 * Sanitizes string cell values against CSV / Excel Formula Injection (CWE-1236).
 * If a value starts with dangerous characters (=, +, -, @, \t, \r), prepends a single quote (').
 */
export function sanitizeFormulaCell(val: unknown): unknown {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.length > 0 && /^[=+\-@\t\r]/.test(trimmed)) {
      return `'${val}`;
    }
  }
  return val;
}

export function exportProductsToExcel(products: Product[], fileName: string = 'inventory_export.xlsx'): void {
  const rows = products.map(p => {
    // Find tier prices safely
    const sellingPrices = Array.isArray(p.sellingPrices) ? p.sellingPrices : [];
    const wholesale = sellingPrices.find(s => s?.tierName?.toLowerCase()?.includes('wholesale'))?.price || '';
    const retail = sellingPrices.find(s => s?.tierName?.toLowerCase()?.includes('retail'))?.price || '';
    const tier3 = sellingPrices[2]?.price || '';
    const tier4 = sellingPrices[3]?.price || '';
    const tier5 = sellingPrices[4]?.price || '';

    return {
      'Internal ID': sanitizeFormulaCell(p.internalId),
      'Product Name': sanitizeFormulaCell(p.name),
      'Type / Category': sanitizeFormulaCell(p.typeName),
      'Brand': sanitizeFormulaCell(p.brandName),
      'Location': sanitizeFormulaCell(p.locationName),
      'Cabin Number': sanitizeFormulaCell(p.cabinNumber),
      'Stock Quantity': p.stockQuantity,
      'Unit': sanitizeFormulaCell(p.unit),
      'Cost Price (PKR)': p.costPrice,
      'Wholesale Price (PKR)': wholesale,
      'Retail Price (PKR)': retail,
      'Tier 3 Price (PKR)': tier3,
      'Tier 4 Price (PKR)': tier4,
      'Tier 5 Price (PKR)': tier5,
      // Dimensions fixed in INCHES for export
      'Height (Inches)': p.dimensions?.height !== undefined ? p.dimensions.height : '',
      'OD or Length (Inches)': p.dimensions?.outerDia !== undefined ? p.dimensions.outerDia : '',
      'ID or Width (Inches)': p.dimensions?.innerDia !== undefined ? p.dimensions.innerDia : '',
      'Thread': sanitizeFormulaCell(p.dimensions?.thread || ''),
      'Gasket OD (Inches)': p.dimensions?.gasket_OD !== undefined ? p.dimensions.gasket_OD : '',
      'Gasket ID (Inches)': p.dimensions?.gasket_ID !== undefined ? p.dimensions.gasket_ID : '',
      'Machine Applications': sanitizeFormulaCell(p.machineNames || ''),
      'Cross References': sanitizeFormulaCell(p.crossReferences || ''),
      'Image URL': sanitizeFormulaCell(p.image || ''),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');

  // Auto column widths
  const colWidths = [
    { wch: 12 }, // Internal ID
    { wch: 18 }, // Name
    { wch: 20 }, // Type
    { wch: 16 }, // Brand
    { wch: 16 }, // Location
    { wch: 14 }, // Cabin
    { wch: 14 }, // Stock
    { wch: 8 },  // Unit
    { wch: 16 }, // Cost
    { wch: 18 }, // Wholesale
    { wch: 18 }, // Retail
    { wch: 16 }, // Tier 3
    { wch: 16 }, // Tier 4
    { wch: 16 }, // Tier 5
    { wch: 15 }, // H
    { wch: 20 }, // OD
    { wch: 20 }, // ID
    { wch: 15 }, // Thread
    { wch: 18 }, // Gasket OD
    { wch: 18 }, // Gasket ID
    { wch: 30 }, // Machines
    { wch: 30 }, // Cross refs
    { wch: 30 }, // Image
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, fileName);
}

export function exportProductsToCSV(products: Product[], fileName: string = 'inventory_export.csv'): void {
  const rows = products.map(p => {
    const sellingPrices = Array.isArray(p.sellingPrices) ? p.sellingPrices : [];
    const wholesale = sellingPrices.find(s => s?.tierName?.toLowerCase()?.includes('wholesale'))?.price || '';
    const retail = sellingPrices.find(s => s?.tierName?.toLowerCase()?.includes('retail'))?.price || '';

    return {
      'Internal ID': sanitizeFormulaCell(p.internalId),
      'Product Name': sanitizeFormulaCell(p.name),
      'Type': sanitizeFormulaCell(p.typeName),
      'Brand': sanitizeFormulaCell(p.brandName),
      'Location': sanitizeFormulaCell(p.locationName),
      'Cabin Number': sanitizeFormulaCell(p.cabinNumber),
      'Stock Quantity': p.stockQuantity,
      'Unit': sanitizeFormulaCell(p.unit),
      'Cost Price (PKR)': p.costPrice,
      'Wholesale Price (PKR)': wholesale,
      'Retail Price (PKR)': retail,
      'Height (Inches)': p.dimensions?.height !== undefined ? p.dimensions.height : '',
      'OD or Length (Inches)': p.dimensions?.outerDia !== undefined ? p.dimensions.outerDia : '',
      'ID or Width (Inches)': p.dimensions?.innerDia !== undefined ? p.dimensions.innerDia : '',
      'Thread': sanitizeFormulaCell(p.dimensions?.thread || ''),
      'Gasket OD (Inches)': p.dimensions?.gasket_OD !== undefined ? p.dimensions.gasket_OD : '',
      'Gasket ID (Inches)': p.dimensions?.gasket_ID !== undefined ? p.dimensions.gasket_ID : '',
      'Machine Applications': sanitizeFormulaCell((p.machineNames || '').replace(/\n/g, '; ')),
      'Cross References': sanitizeFormulaCell((p.crossReferences || '').replace(/\n/g, '; ')),
      'Image URL': sanitizeFormulaCell(p.image || ''),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Formats a stock log row for spreadsheet export with full formula sanitization (CWE-1236)
 */
function mapAuditLogToExportRow(log: StockLog) {
  const dateObj = new Date(log.timestamp);
  const formattedDate = isNaN(dateObj.getTime())
    ? log.timestamp
    : dateObj.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

  const deltaFormatted = log.change > 0 ? `+${log.change}` : `${log.change}`;

  return {
    'Timestamp': sanitizeFormulaCell(formattedDate),
    'Internal ID': sanitizeFormulaCell(log.internalId || ''),
    'Product Name': sanitizeFormulaCell(log.productName || ''),
    'Type / Category': sanitizeFormulaCell(log.typeName || ''),
    'Brand': sanitizeFormulaCell(log.brandName || ''),
    'Movement Type': sanitizeFormulaCell(log.movementType || log.reason || ''),
    'Reason': sanitizeFormulaCell(log.reason || ''),
    'Ref Document #': sanitizeFormulaCell(log.referenceNumber || log.referenceId || ''),
    'Customer / Vendor / Auditor': sanitizeFormulaCell(log.entityName || ''),
    'Previous Stock': log.previousStock,
    'Stock Change (Delta)': deltaFormatted,
    'New Stock Snapshot': log.newStock,
    'Unit': sanitizeFormulaCell(log.unit || 'Pcs'),
    'Unit Rate (PKR)': log.unitRate !== undefined ? log.unitRate : '',
    'Total Movement Value (PKR)': log.totalMovementValue !== undefined ? log.totalMovementValue : '',
    'Location': sanitizeFormulaCell(log.locationName || ''),
    'Cabin Number': sanitizeFormulaCell(log.cabinNumber || ''),
    'Notes / Details': sanitizeFormulaCell(log.notes || ''),
  };
}

export function exportAuditLogsToExcel(logs: StockLog[], fileName: string = 'inventory_audit_log.xlsx'): void {
  const rows = logs.map(mapAuditLogToExportRow);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Log');

  const colWidths = [
    { wch: 20 }, // Timestamp
    { wch: 14 }, // Internal ID
    { wch: 20 }, // Product Name
    { wch: 20 }, // Type
    { wch: 16 }, // Brand
    { wch: 18 }, // Movement Type
    { wch: 20 }, // Reason
    { wch: 18 }, // Ref Document #
    { wch: 26 }, // Entity
    { wch: 14 }, // Prev Stock
    { wch: 16 }, // Change
    { wch: 16 }, // New Stock
    { wch: 8 },  // Unit
    { wch: 16 }, // Unit Rate
    { wch: 22 }, // Total Value
    { wch: 16 }, // Location
    { wch: 14 }, // Cabin
    { wch: 38 }, // Notes
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, fileName);
}

export function exportAuditLogsToCSV(logs: StockLog[], fileName: string = 'inventory_audit_log.csv'): void {
  const rows = logs.map(mapAuditLogToExportRow);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadSampleTemplate(format: 'xlsx' | 'csv' = 'xlsx'): void {
  const sampleData = [
    {
      'Internal ID': 'KFH-2501',
      'Product Name': 'sfc-5706',
      'Type / Category': 'Fuel Water Separator',
      'Brand': 'Sure Filter',
      'Location': 'Warehouse A',
      'Cabin Number': 'C-12',
      'Stock Quantity': 50,
      'Unit': 'Pcs',
      'Cost Price (PKR)': 3200,
      'Wholesale Price (PKR)': 3520,
      'Retail Price (PKR)': 4000,
      'Height (Inches)': 7.85,
      'OD or Length (Inches)': 3.75,
      'ID or Width (Inches)': '',
      'Thread': '1"-14',
      'Gasket OD (Inches)': 3.55,
      'Gasket ID (Inches)': 3.15,
      'Machine Applications': 'Perkins 1104D Engine; CAT 320D Excavator',
      'Cross References': 'FS19732; P550909; 361-9554',
      'Image URL': 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=400&q=80',
    },
    {
      'Internal ID': 'KFH-2502',
      'Product Name': 'LF16015',
      'Type / Category': 'Oil Filter',
      'Brand': 'Fleetguard',
      'Location': 'Main Shop',
      'Cabin Number': 'Rack-04',
      'Stock Quantity': 100,
      'Unit': 'Pcs',
      'Cost Price (PKR)': 1850,
      'Wholesale Price (PKR)': 2035,
      'Retail Price (PKR)': 2315,
      'Height (Inches)': 6.85,
      'OD or Length (Inches)': 3.66,
      'ID or Width (Inches)': '',
      'Thread': 'M20 x 1.5',
      'Gasket OD (Inches)': 2.83,
      'Gasket ID (Inches)': '',
      'Machine Applications': 'Cummins 6BT 5.9L; Dongfeng Truck',
      'Cross References': 'BD7317; 3937736; P550425',
      'Image URL': '',
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory_Template');

  if (format === 'xlsx') {
    XLSX.writeFile(workbook, 'inventory_import_template.xlsx');
  } else {
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'inventory_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export interface ParsedImportRow {
  internalId?: string;
  name: string;
  typeName: string;
  brandName: string;
  locationName: string;
  cabinNumber: string;
  stockQuantity: number;
  unit: string;
  costPrice: number;
  wholesalePrice?: number;
  retailPrice?: number;
  height?: number;
  outerDia?: number;
  innerDia?: number;
  thread?: string;
  gasket_OD?: number;
  gasket_ID?: number;
  machineNames?: string;
  crossReferences?: string;
  image?: string;
}

export async function parseFileForImport(file: File): Promise<ParsedImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: Array<Record<string, unknown>> = XLSX.utils.sheet_to_json(worksheet);

        const parsedRows: ParsedImportRow[] = [];

        for (const row of rawJson) {
          // Normalize keys (lower, trim)
          const normalized: Record<string, unknown> = {};
          for (const key of Object.keys(row)) {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            normalized[cleanKey] = row[key];
          }

          const name = String(normalized['productname'] || normalized['name'] || normalized['itemname'] || normalized['partnumber'] || '').trim();
          if (!name) continue; // skip blank rows

          const internalId = String(normalized['internalid'] || normalized['id'] || normalized['kfhid'] || '').trim();
          const typeName = String(normalized['typecategory'] || normalized['type'] || normalized['category'] || 'General Part').trim();
          const brandName = String(normalized['brand'] || normalized['brandname'] || 'Standard').trim();
          const locationName = String(normalized['location'] || normalized['locationname'] || 'Main Shop').trim();
          const cabinNumber = String(normalized['cabinnumber'] || normalized['cabin'] || normalized['rack'] || 'C-01').trim();
          const stockQuantity = Number(normalized['stockquantity'] || normalized['stock'] || normalized['qty'] || normalized['quantity'] || 0);
          const unit = String(normalized['unit'] || normalized['quantityunit'] || 'Pcs').trim();
          const costPrice = Number(normalized['costpricepkr'] || normalized['costprice'] || normalized['cost'] || 0);
          const wholesalePrice = Number(normalized['wholesalepricepkr'] || normalized['wholesaleprice'] || normalized['wholesale'] || 0);
          const retailPrice = Number(normalized['retailpricepkr'] || normalized['retailprice'] || normalized['retail'] || 0);

          // Dimensions (in inches for import)
          const height = normalized['heightinches'] || normalized['heightin'] || normalized['height'] || normalized['h'] ? Number(normalized['heightinches'] || normalized['heightin'] || normalized['height'] || normalized['h']) : undefined;
          const outerDia = normalized['odorlengthinches'] || normalized['odorlength'] || normalized['outerdiameter'] || normalized['od'] || normalized['length'] || normalized['l'] ? Number(normalized['odorlengthinches'] || normalized['odorlength'] || normalized['outerdiameter'] || normalized['od'] || normalized['length'] || normalized['l']) : undefined;
          const innerDia = normalized['idorwidthinches'] || normalized['idorwidth'] || normalized['innerdiameter'] || normalized['id'] || normalized['width'] || normalized['w'] ? Number(normalized['idorwidthinches'] || normalized['idorwidth'] || normalized['innerdiameter'] || normalized['id'] || normalized['width'] || normalized['w']) : undefined;
          const thread = String(normalized['thread'] || normalized['threadsize'] || normalized['threads'] || '').trim();
          const gasket_OD = normalized['gasketodinches'] || normalized['gasketod'] ? Number(normalized['gasketodinches'] || normalized['gasketod']) : undefined;
          const gasket_ID = normalized['gasketidinches'] || normalized['gasketid'] ? Number(normalized['gasketidinches'] || normalized['gasketid']) : undefined;

          // Multiline fields
          const rawMachines = String(normalized['machineapplications'] || normalized['machines'] || normalized['engines'] || '');
          const machineNames = rawMachines.replace(/;/g, '\n').trim();

          const rawCross = String(normalized['crossreferences'] || normalized['crossreference'] || normalized['interchange'] || '');
          const crossReferences = rawCross.replace(/;/g, '\n').trim();

          const image = String(normalized['imageurl'] || normalized['image'] || '').trim();

          parsedRows.push({
            internalId: internalId || undefined,
            name,
            typeName,
            brandName,
            locationName,
            cabinNumber,
            stockQuantity: isNaN(stockQuantity) ? 0 : stockQuantity,
            unit,
            costPrice: isNaN(costPrice) ? 0 : costPrice,
            wholesalePrice: !isNaN(wholesalePrice) && wholesalePrice > 0 ? wholesalePrice : undefined,
            retailPrice: !isNaN(retailPrice) && retailPrice > 0 ? retailPrice : undefined,
            height: height && !isNaN(height) ? height : undefined,
            outerDia: outerDia && !isNaN(outerDia) ? outerDia : undefined,
            innerDia: innerDia && !isNaN(innerDia) ? innerDia : undefined,
            thread: thread || undefined,
            gasket_OD: gasket_OD && !isNaN(gasket_OD) ? gasket_OD : undefined,
            gasket_ID: gasket_ID && !isNaN(gasket_ID) ? gasket_ID : undefined,
            machineNames: machineNames || undefined,
            crossReferences: crossReferences || undefined,
            image: image || undefined,
          });
        }

        resolve(parsedRows);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
