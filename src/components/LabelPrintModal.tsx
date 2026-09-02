import React from 'react';
import { Product } from '../types';
import { formatDimension } from '../services/dimensions';
import { formatPKR } from '../services/pricing';
import { X, Printer, QrCode, Tag, MapPin, Ruler } from 'lucide-react';

interface LabelPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const LabelPrintModal: React.FC<LabelPrintModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  if (!isOpen || !product) return null;

  const handlePrint = () => {
    window.print();
  };

  const dims = product.dimensions;
  const prices = product.sellingPrices || [];
  const wholesale = prices.find(s => s.tierName?.toLowerCase().includes('wholesale'))?.price || prices[0]?.price;
  const retail = prices.find(s => s.tierName?.toLowerCase().includes('retail'))?.price || prices[1]?.price;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-red-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-2 sm:my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 sm:px-6 py-3.5 sm:py-4 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center font-bold text-white border border-white/20 shrink-0">
              <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold tracking-tight truncate">Shelf Cabin Tag & Label</h2>
              <p className="text-[10px] sm:text-xs text-red-100 truncate">Ready-to-print shelf tag for bins and boxes</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1.5 sm:p-2 rounded-lg shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Printable Card Area */}
          <div
            id="printable-label"
            className="border-2 border-dashed border-slate-900 rounded-2xl p-3.5 sm:p-5 bg-white space-y-3 sm:space-y-4 shadow-sm"
          >
            {/* Top Bar */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2.5 sm:pb-3 gap-2">
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-slate-500 uppercase block">
                  KFH INVENTORY • PAKISTAN
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-red-600">
                  {product.internalId}
                </span>
                <h3 className="text-base sm:text-xl font-black text-slate-900 leading-tight truncate">
                  {product.name}
                </h3>
              </div>

              {/* Barcode visual */}
              <div className="text-right flex flex-col items-end shrink-0">
                <div className="flex gap-0.5 h-8 sm:h-10 items-stretch bg-slate-950 p-1 rounded">
                  <div className="w-1 bg-white"></div>
                  <div className="w-0.5 bg-transparent"></div>
                  <div className="w-1.5 bg-white"></div>
                  <div className="w-1 bg-transparent"></div>
                  <div className="w-0.5 bg-white"></div>
                  <div className="w-2 bg-white"></div>
                  <div className="w-1 bg-transparent"></div>
                  <div className="w-1.5 bg-white"></div>
                  <div className="w-0.5 bg-white"></div>
                  <div className="w-2 bg-white"></div>
                </div>
                <span className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-600 tracking-wider mt-0.5">
                  *{product.internalId}*
                </span>
              </div>
            </div>

            {/* Middle Specs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-100 p-2 rounded-lg">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Brand & Type</span>
                <span className="font-bold text-slate-900 truncate block">{product.brandName} • {product.typeName}</span>
              </div>

              <div className="bg-red-50 p-2 rounded-lg border border-red-200">
                <span className="text-[10px] font-bold text-red-700 block uppercase">Shelf Location</span>
                <span className="font-bold font-mono text-red-900 truncate block">
                  Cabin: {product.cabinNumber} ({product.locationName})
                </span>
              </div>
            </div>

            {/* Dimensions & Thread */}
            {dims && (
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-700">
                  <span>DIMENSIONS:</span>
                  <span className="font-normal text-slate-500">Inches / mm</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[10px] sm:text-[11px]">
                  {dims.height !== undefined && (
                    <div>H: <strong>{dims.height}" / {formatDimension(dims.height, 'mm')}</strong></div>
                  )}
                  {dims.outerDia !== undefined && (
                    <div>OD: <strong>{dims.outerDia}" / {formatDimension(dims.outerDia, 'mm')}</strong></div>
                  )}
                  {dims.innerDia !== undefined && (
                    <div>ID: <strong>{dims.innerDia}" / {formatDimension(dims.innerDia, 'mm')}</strong></div>
                  )}
                </div>
                {dims.thread && (
                  <div className="text-[10px] sm:text-[11px] pt-0.5 border-t border-slate-200 text-red-700">
                    Thread: <strong>{dims.thread}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Prices */}
            <div className="flex items-center justify-between pt-1 border-t-2 border-slate-900">
              <div>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 block uppercase">Wholesale (PKR)</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800">{formatPKR(wholesale)}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] sm:text-[10px] font-bold text-red-700 block uppercase">Retail Price</span>
                <span className="text-base sm:text-lg font-black text-red-600">{formatPKR(retail)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 sm:py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-2 sm:py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print Shelf Tag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
