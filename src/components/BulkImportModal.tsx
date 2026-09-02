import React, { useState } from 'react';
import { Product, GlobalPricingSettings, Brand, ProductType, LocationItem } from '../types';
import { 
  downloadSampleTemplate, 
  parseFileForImport, 
  ParsedImportRow 
} from '../services/excel';
import { getNextInternalId } from '../services/storage';
import { generateProductSellingPrices } from '../services/pricing';
import confetti from 'canvas-confetti';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  ArrowRight,
  Database
} from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProducts: Product[];
  brands: Brand[];
  types: ProductType[];
  locations: LocationItem[];
  pricingSettings: GlobalPricingSettings;
  onImportSuccess: (importedProducts: Product[], mode: 'append' | 'overwrite') => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  existingProducts,
  brands,
  types,
  locations,
  pricingSettings,
  onImportSuccess,
}) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [importMode, setImportMode] = useState<'append' | 'overwrite'>('append');

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const rows = await parseFileForImport(file);
      if (rows.length === 0) {
        setErrorMsg('No valid product rows found in the uploaded file. Check headers or use template.');
      } else {
        setParsedRows(rows);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Failed to parse file: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedRows || parsedRows.length === 0) return;

    // Convert parsed rows to full Product records
    let currentWorkingList = [...existingProducts];
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
      const locMatch = locations.find(l => l.name.toLowerCase() === row.locationName.toLowerCase()) || locations[0];

      // Selling prices
      const computedSellingPrices = generateProductSellingPrices(row.costPrice, pricingSettings);
      // If row has custom wholesale/retail price, override them
      if (row.wholesalePrice && computedSellingPrices[0]) {
        computedSellingPrices[0].price = row.wholesalePrice;
        computedSellingPrices[0].isOverridden = true;
      }
      if (row.retailPrice && computedSellingPrices[1]) {
        computedSellingPrices[1].price = row.retailPrice;
        computedSellingPrices[1].isOverridden = true;
      }

      const prod: Product = {
        id: `prod-import-${Date.now()}-${index}`,
        internalId: assignedId,
        name: row.name,
        image: row.image || undefined,
        typeId: typeMatch?.id || 't-1',
        typeName: row.typeName || typeMatch?.name || 'General Part',
        brandId: brandMatch?.id || 'b-1',
        brandName: row.brandName || brandMatch?.name || 'Standard',
        locationId: locMatch?.id || 'loc-1',
        locationName: row.locationName || locMatch?.name || 'Main Shop',
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
          inputUnit: 'inch', // strictly standard in inches for import
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

    onImportSuccess(newProducts, importMode);

    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#DC2626', '#EF4444', '#FFFFFF', '#10B981'],
      });
    } catch (_) {}

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-red-100 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-2 sm:my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 sm:px-6 py-3.5 sm:py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center font-bold text-white border border-white/20 shrink-0">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold tracking-tight truncate">Bulk Import Products</h2>
              <p className="text-[10px] sm:text-xs text-red-100 truncate">Upload Excel (.xlsx, .xls) or CSV files into inventory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 sm:p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Download Template Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 block mb-0.5">Need a formatted template?</span>
              <span className="text-[11px] text-slate-500">
                Dimensions in template are in Inches (Height, OD, ID, Gasket_OD, Gasket_ID).
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <button
                type="button"
                onClick={() => downloadSampleTemplate('xlsx')}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => downloadSampleTemplate('csv')}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload Drop Zone */}
          {!parsedRows ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
                dragActive
                  ? 'border-red-600 bg-red-50/50 scale-[0.99]'
                  : 'border-slate-300 hover:border-red-400 bg-slate-50/50'
              }`}
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-3">
                <Upload className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 mb-1">
                Drag and drop your Excel or CSV file here
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mb-4">
                Supports .xlsx, .xls, and .csv files
              </p>

              <label className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md inline-flex items-center gap-2 transition-all">
                <FileSpreadsheet className="w-4 h-4" />
                Select File from Device
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            /* Parsed Preview Table */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-900 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Found {parsedRows.length} valid product items ready to import!</span>
                </div>
                <button
                  type="button"
                  onClick={() => setParsedRows(null)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 underline text-left sm:text-right"
                >
                  Choose Different File
                </button>
              </div>

              {/* Mode Selector */}
              <div className="bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Import Action Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode('append')}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      importMode === 'append'
                        ? 'border-red-600 bg-white shadow-xs'
                        : 'border-slate-200 bg-slate-100/60 text-slate-600'
                    }`}
                  >
                    <span className="font-bold text-slate-900 block">Append as New Items</span>
                    <span className="text-[11px] text-slate-500">
                      Auto-assigns new KFH IDs (e.g. KFH-2506 onwards)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('overwrite')}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      importMode === 'overwrite'
                        ? 'border-red-600 bg-white shadow-xs'
                        : 'border-slate-200 bg-slate-100/60 text-slate-600'
                    }`}
                  >
                    <span className="font-bold text-slate-900 block">Match & Overwrite</span>
                    <span className="text-[11px] text-slate-500">
                      Updates items matching existing KFH IDs or appends if new
                    </span>
                  </button>
                </div>
              </div>

              {/* Sample 5 rows preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                  Data Preview (First 5 items)
                </div>
                <div className="overflow-x-auto max-h-48 divide-y divide-slate-100">
                  {parsedRows.slice(0, 5).map((row, idx) => (
                    <div key={idx} className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 hover:bg-slate-50">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-red-600">{row.internalId || `Auto-ID`}</span>
                        <span className="font-bold text-slate-900">{row.name}</span>
                        <span className="text-slate-400 text-[11px]">({row.brandName} • {row.typeName})</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-600 font-medium text-[11px] sm:text-xs">
                        <span>Cabin: {row.cabinNumber}</span>
                        <span>Stock: {row.stockQuantity} {row.unit}</span>
                        <span className="font-bold text-slate-900">Cost: ₨ {row.costPrice}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors order-2 sm:order-1"
          >
            Cancel
          </button>

          {parsedRows && (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 order-1 sm:order-2"
            >
              <Database className="w-4 h-4" />
              Import {parsedRows.length} Items into Inventory
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
