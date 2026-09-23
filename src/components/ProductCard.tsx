import React, { useState } from 'react';
import { DimensionUnit, GlobalPricingSettings, Product } from '../types';
import { formatDimension, inchToMm } from '../services/dimensions';
import { formatPKR, generateProductSellingPrices, getTierTheme } from '../services/pricing';
import { 
  Ruler, 
  MapPin, 
  Layers, 
  Tag, 
  Box, 
  Cpu, 
  FileCode2, 
  Edit3, 
  Printer, 
  Trash2, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
  ArrowRightLeft,
  Check,
  AlertTriangle,
  Image as ImageIcon,
  MoreVertical,
  Plus,
  Minus,
  History
} from 'lucide-react';

interface ProductCardProps {
  product: Product;
  pricingSettings: GlobalPricingSettings;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (product: Product) => void;
  onPrintLabel?: (product: Product) => void;
  onAdjustStock?: (product: Product) => void;
  onQuickUpdateCost?: (productId: string, newCost: number) => void;
  onViewHistory?: (product: Product) => void;
}


// Helper to find older cost tiers
const getOldCostTiers = (product: Product) => {
  if (!product.costBatches || product.costBatches.length === 0) return [];
  // Sort oldest first
  const sortedBatches = [...product.costBatches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Group remaining quantities by unitCost, but only for costs DIFFERENT from the current costPrice
  const tiers: Record<number, number> = {};
  for (const batch of sortedBatches) {
    if ((batch.remainingQuantity || 0) > 0) {
      if (batch.unitCost !== product.costPrice) {
        tiers[batch.unitCost] = (tiers[batch.unitCost] || 0) + batch.remainingQuantity;
      }
    }
  }
  
  return Object.entries(tiers).map(([costStr, qty]) => ({
    cost: Number(costStr),
    qty,
  }));
};

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  pricingSettings,
  onEdit,
  onDelete,
  onDuplicate,
  onPrintLabel,
  onAdjustStock,
  onQuickUpdateCost,
  onViewHistory,
}) => {
  // Local card dimension unit toggle (inch vs mm)
  const [displayUnit, setDisplayUnit] = useState<DimensionUnit>(product.dimensions?.inputUnit || 'inch');
  const [isEditingCost, setIsEditingCost] = useState<boolean>(false);
  const [costInput, setCostInput] = useState<string>(String(product.costPrice || 0));
  const [showFullMachines, setShowFullMachines] = useState<boolean>(false);
  const [showFullCross, setShowFullCross] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [showImageZoom, setShowImageZoom] = useState<boolean>(false);
  const [showBatches, setShowBatches] = useState<boolean>(false);

  const dims = product.dimensions;
  const labels = product.dimensionLabels || { heightName: 'H', outerDiaName: 'OD', innerDiaName: 'ID' };

  // Calculate stock status
  const stockQty = typeof product.stockQuantity === 'number' && !isNaN(product.stockQuantity) ? product.stockQuantity : 0;
  const alertThreshold = typeof product.minStockAlert === 'number' && !isNaN(product.minStockAlert) ? product.minStockAlert : 5;
  const isOutOfStock = stockQty <= 0;
  const isLowStock = !isOutOfStock && stockQty <= alertThreshold;
  const oldTiers = getOldCostTiers(product);

  const handleSaveCost = () => {
    const val = parseFloat(costInput);
    if (!isNaN(val) && val >= 0) {
      onQuickUpdateCost(product.id, val);
    }
    setIsEditingCost(false);
  };

  // Parse multiline machines & cross references
  const machineList = product.machineNames ? product.machineNames.split('\n').map(m => m.trim()).filter(Boolean) : [];
  const crossRefList = product.crossReferences ? product.crossReferences.split('\n').map(c => c.trim()).filter(Boolean) : [];

  // Active selling prices
  const activeSellingPrices = (product.sellingPrices || []).slice(0, pricingSettings.activeTierCount);

  // Check if any dimension exists to show dimensions section
  const hasDimensions = dims && (
    dims.height !== undefined ||
    dims.outerDia !== undefined ||
    dims.innerDia !== undefined ||
    dims.thread ||
    dims.gasket_OD !== undefined ||
    dims.gasket_ID !== undefined
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-red-300 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group">
      {/* Card Header Bar */}
      <div className="bg-gradient-to-r from-slate-50 to-red-50/40 p-3 sm:p-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
          {/* Internal ID Badge */}
          <span className="px-2.5 py-1 bg-red-600 text-white font-mono font-extrabold text-xs sm:text-sm rounded-lg shadow-sm tracking-wide">
            {product.internalId}
          </span>

          {/* Brand Badge */}
          <span className="px-2 py-0.5 sm:py-1 bg-slate-200 text-slate-800 text-xs sm:text-sm font-extrabold rounded-md flex items-center gap-1 truncate max-w-[140px] border border-slate-300/80">
            <Tag className="w-3 h-3 text-slate-600 shrink-0" />
            <span className="truncate">{product.brandName}</span>
          </span>

          {/* Type Badge */}
          <span className="px-2 py-0.5 sm:py-1 bg-red-100 text-red-900 text-xs sm:text-sm font-bold rounded-md truncate max-w-[130px] border border-red-200">
            {product.typeName}
          </span>
        </div>

        {/* Action Menu dropdown trigger */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer"
            aria-label="Item Actions"
          >
            <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-20 animate-in fade-in">
              {onViewHistory && (
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); onViewHistory(product); }}
                  className="w-full px-3.5 py-2 text-left text-xs sm:text-sm font-semibold text-slate-800 hover:bg-red-50 hover:text-red-700 flex items-center gap-2 cursor-pointer"
                >
                  <History className="w-4 h-4 text-red-600" />
                  View Item History
                </button>
              )}
              {onEdit ? <button
                type="button"
                onClick={() => { setShowMenu(false); onEdit(product); }}
                className="w-full px-3.5 py-2 text-left text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-blue-600" />
                Edit Product
              </button> : null}
              {onAdjustStock ? <button
                type="button"
                onClick={() => { setShowMenu(false); onAdjustStock(product); }}
                className="w-full px-3.5 py-2 text-left text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
              >
                <Box className="w-4 h-4 text-emerald-600" />
                Adjust Stock (+ / -)
              </button> : null}
              {onPrintLabel ? <button
                type="button"
                onClick={() => { setShowMenu(false); onPrintLabel(product); }}
                className="w-full px-3.5 py-2 text-left text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-purple-600" />
                Print Shelf / Tag Label
              </button> : null}
              {onDuplicate ? <button
                type="button"
                onClick={() => { setShowMenu(false); onDuplicate(product); }}
                className="w-full px-3.5 py-2 text-left text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
              >
                <Copy className="w-4 h-4 text-amber-600" />
                Duplicate Item
              </button> : null}
              <div className="border-t border-slate-100 my-1" />
              {onDelete ? <button
                type="button"
                onClick={() => { setShowMenu(false); onDelete(product.id); }}
                className="w-full px-3.5 py-2 text-left text-xs sm:text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                Delete Product
              </button> : null}
            </div>
          )}
        </div>
      </div>

      {/* Main Card Body */}
      <div className="p-4 space-y-4 flex-1">
        {/* Product Title & Image */}
        <div className="flex items-start gap-3.5">
          {/* Image Thumbnail with zoom option */}
          <div className="shrink-0">
            {product.image ? (
              <div
                onClick={() => setShowImageZoom(true)}
                className="w-28 h-28 rounded-2xl overflow-hidden border border-slate-200 bg-slate-200 cursor-pointer relative group/img shadow-sm hover:ring-2 hover:ring-red-400"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                />
              </div>
            ) : (
              <div className="w-28 h-28 rounded-2xl border border-slate-200 bg-slate-200 flex flex-col items-center justify-center text-slate-400">
                <ImageIcon className="w-8 h-8 stroke-1" />
                <span className="text-[10px] font-bold text-slate-500 mt-0.5">NO IMG</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug break-words" title={product.name}>
              {product.name}
            </h3>

            {/* Location & Cabin */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-slate-700 mt-1.5 font-bold">
              <span className="flex items-center gap-1 truncate max-w-[160px]">
                <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                <span className="truncate">{product.locationName}</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="px-2 py-0.5 bg-slate-200 text-slate-800 font-extrabold font-mono rounded-md text-xs sm:text-sm border border-slate-300">
                Cabin: {product.cabinNumber || '—'}
              </span>
            </div>

            {/* Stock Level Badge & Quick Adjust */}
            <div className="flex flex-wrap items-center gap-2.5 mt-2.5">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold ${
                  isOutOfStock
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : isLowStock
                    ? 'bg-amber-100 text-amber-900 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>
                  {product.stockQuantity} {product.unit}
                </span>
                {isOutOfStock ? (
                  <span className="text-xs font-semibold">(Out)</span>
                ) : isLowStock ? (
                  <span className="text-xs font-semibold">(Low)</span>
                ) : null}
              </div>

              {onAdjustStock ? <button
                type="button"
                onClick={onAdjustStock ? () => onAdjustStock(product) : undefined}
                className="text-xs sm:text-sm text-red-600 hover:text-red-700 font-extrabold hover:underline cursor-pointer"
              >
                Adjust (+/-)
              </button> : null}
            </div>
          </div>
        </div>

        {/* DIMENSIONS & SIZES SECTION (With In-Card Unit Switcher) */}
        {hasDimensions && (
          <div className="bg-slate-200/80 rounded-xl p-3 border border-slate-300/70 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-300/60 pb-1.5">
              <span className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-red-600" />
                Dimensions
              </span>

              {/* In-Card Unit Switcher */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-300 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDisplayUnit('inch')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    displayUnit === 'inch' ? 'bg-red-600 text-white font-black' : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Inch
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayUnit('mm')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    displayUnit === 'mm' ? 'bg-red-600 text-white font-black' : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  mm
                </button>
              </div>
            </div>

            {/* Grid of Optional Attributes (ONLY displayed if present) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              {/* Height */}
              {dims?.height !== undefined && (
                <div className="bg-slate-200 p-2 rounded-lg border border-slate-300">
                  <span className="text-[11px] sm:text-xs text-slate-600 font-extrabold block uppercase tracking-wide">
                    {labels.heightName} (Height)
                  </span>
                  <span className="font-black text-sm sm:text-base text-slate-950 mt-0.5 block">
                    {formatDimension(dims.height, displayUnit)}
                  </span>
                </div>
              )}

              {/* Outer Dia / Length */}
              {dims?.outerDia !== undefined && (
                <div className="bg-slate-200 p-2 rounded-lg border border-slate-300">
                  <span className="text-[11px] sm:text-xs text-slate-600 font-extrabold block uppercase tracking-wide">
                    {labels.outerDiaName}
                  </span>
                  <span className="font-black text-sm sm:text-base text-slate-950 mt-0.5 block">
                    {formatDimension(dims.outerDia, displayUnit)}
                  </span>
                </div>
              )}

              {/* Inner Dia / Width */}
              {dims?.innerDia !== undefined && (
                <div className="bg-slate-200 p-2 rounded-lg border border-slate-300">
                  <span className="text-[11px] sm:text-xs text-slate-600 font-extrabold block uppercase tracking-wide">
                    {labels.innerDiaName}
                  </span>
                  <span className="font-black text-sm sm:text-base text-slate-950 mt-0.5 block">
                    {formatDimension(dims.innerDia, displayUnit)}
                  </span>
                </div>
              )}

              {/* Thread (EXCLUDED FROM INCH/MM CONVERSION) */}
              {dims?.thread && (
                <div className="bg-slate-200 p-2 rounded-lg border border-red-300">
                  <span className="text-[11px] sm:text-xs text-red-700 font-extrabold block uppercase tracking-wide">
                    Thread
                  </span>
                  <span className="font-black text-sm sm:text-base text-red-950 font-mono mt-0.5 block">
                    {dims.thread}
                  </span>
                </div>
              )}

              {/* Gasket OD */}
              {dims?.gasket_OD !== undefined && (
                <div className="bg-slate-200 p-2 rounded-lg border border-slate-300">
                  <span className="text-[11px] sm:text-xs text-slate-600 font-extrabold block uppercase tracking-wide">
                    Gasket OD
                  </span>
                  <span className="font-black text-sm sm:text-base text-slate-950 mt-0.5 block">
                    {formatDimension(dims.gasket_OD, displayUnit)}
                  </span>
                </div>
              )}

              {/* Gasket ID */}
              {dims?.gasket_ID !== undefined && (
                <div className="bg-slate-200 p-2 rounded-lg border border-slate-300">
                  <span className="text-[11px] sm:text-xs text-slate-600 font-extrabold block uppercase tracking-wide">
                    Gasket ID
                  </span>
                  <span className="font-black text-sm sm:text-base text-slate-950 mt-0.5 block">
                    {formatDimension(dims.gasket_ID, displayUnit)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Machine Applications (Optional) */}
        {machineList.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-slate-500" />
              Machine Applications ({machineList.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(showFullMachines ? machineList : machineList.slice(0, 2)).map((m, idx) => (
                <span key={idx} className="px-2.5 py-1 bg-slate-200 text-slate-800 font-bold rounded-md text-xs sm:text-sm border border-slate-300">
                  {m}
                </span>
              ))}
              {machineList.length > 2 && (
                <button
                  type="button"
                  onClick={() => setShowFullMachines(!showFullMachines)}
                  className="px-2 py-0.5 text-xs font-extrabold text-red-600 hover:text-red-700 bg-red-50 rounded-md border border-red-200 cursor-pointer"
                >
                  {showFullMachines ? 'Show Less' : `+${machineList.length - 2} More`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Cross References (Optional) */}
        {crossRefList.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
              <FileCode2 className="w-3.5 h-3.5 text-slate-500" />
              Cross References ({crossRefList.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(showFullCross ? crossRefList : crossRefList.slice(0, 3)).map((c, idx) => (
                <span key={idx} className="px-2.5 py-1 bg-red-50 text-red-950 font-mono font-bold rounded-md text-xs sm:text-sm border border-red-200">
                  {c}
                </span>
              ))}
              {crossRefList.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowFullCross(!showFullCross)}
                  className="px-2 py-0.5 text-xs font-extrabold text-red-600 hover:text-red-700 bg-red-50 rounded-md border border-red-200 cursor-pointer"
                >
                  {showFullCross ? 'Show Less' : `+${crossRefList.length - 3} More`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* PRICING SECTION (Cost in Red + Wholesale in Yellow + Retail Tiers in Progressive Green) */}
        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          {oldTiers.length > 0 && (
            <div className="flex flex-col gap-1 px-1">
              {oldTiers.map(t => (
                <div key={t.cost} className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-block w-fit">
                  {t.qty} item{t.qty !== 1 ? 's' : ''} in stock at {formatPKR(t.cost)}
                </div>
              ))}
            </div>
          )}
          {/* Editable Cost Price - Highlighted in Red */}
          <div className="flex items-center justify-between bg-red-950 text-white px-3.5 py-2.5 rounded-xl border border-red-900 shadow-sm">
            <span className="text-xs sm:text-sm font-extrabold text-red-200 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 shadow-xs shadow-red-500"></span>
              Cost Price:
            </span>
            {isEditingCost ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={costInput}
                  onChange={(e) => setCostInput(e.target.value)}
                  className="w-24 px-2 py-1 bg-red-900 border-2 border-red-400 rounded-lg text-base font-black text-white text-right focus:outline-hidden"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveCost}
                  className="p-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-white cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingCost(true)}
                className="flex items-center gap-2 cursor-pointer group/cost hover:opacity-95"
                title="Click to edit cost price (Red)"
              >
                <span className="font-mono font-black text-lg sm:text-xl tracking-tight text-white group-hover/cost:text-red-200 drop-shadow-sm">
                  {formatPKR(product.costPrice)}
                </span>
                <Edit3 className="w-4 h-4 text-red-300 group-hover/cost:text-white" />
              </div>
            )}
          </div>

          {/* Tiered Selling Prices (Wholesale in Yellow, Retail in Progressive Greenness) */}
          <div className="grid grid-cols-2 gap-2.5">
            {activeSellingPrices.map((sp, idx) => {
              const theme = getTierTheme(sp, idx, activeSellingPrices.length);
              return (
                <div
                  key={sp.tierId || idx}
                  className={`p-3 rounded-xl border-2 transition-colors ${theme.cardBg} ${theme.border}`}
                >
                  <div className="flex items-center justify-between text-xs sm:text-sm font-extrabold text-slate-700 mb-1">
                    <span className="truncate flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${theme.dotColor}`}></span>
                      <span className="truncate">{sp.tierName}</span>
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold shrink-0 ${theme.markupBadge}`}>
                      {sp.tierId === 'tier-general' || sp.tierName.toLowerCase().includes('general') ? 'Fix' : `${sp.markupPercent}%`}
                    </span>
                  </div>
                  <div className={`font-mono font-black text-lg sm:text-xl tracking-tight ${theme.textColor}`}>
                    {formatPKR(sp.price)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* FIFO Batches / Purchase History Toggle */}
          {product.costBatches && product.costBatches.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowBatches(!showBatches)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <History className="w-3 h-3 text-red-600" />
                  <span>FIFO Purchase Batches ({product.costBatches.length})</span>
                </span>
                {showBatches ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showBatches && (
                <div className="mt-1.5 p-2 bg-slate-200 rounded-lg border border-slate-200 space-y-1.5 text-[10px]">
                  {product.costBatches.map((batch) => (
                    <div key={batch.id} className="bg-slate-200 p-1.5 rounded border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-red-600">
                          {batch.billNumber ? `#${batch.billNumber}` : 'Initial Stock'}
                        </span>
                        <span className="text-slate-500 ml-1.5 truncate max-w-[100px] inline-block align-bottom">
                          {batch.vendorName || 'Inventory'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900">{formatPKR(batch.unitCost)}</span>
                        <span className="text-red-600 font-bold ml-1.5">({batch.remainingQuantity} left)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Item History (Purchases & Sales) Button */}
          {onViewHistory && (
            <button
              type="button"
              onClick={() => onViewHistory(product)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-red-50/80 to-slate-50 hover:from-red-100 hover:to-slate-100 border border-red-200/90 rounded-xl text-xs font-bold text-red-950 transition-all shadow-sm group/hist"
            >
              <span className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-red-600 group-hover/hist:rotate-45 transition-transform" />
                <span>Purchases & Sales History</span>
              </span>
              <span className="text-[10px] text-red-700 bg-white px-2 py-0.5 rounded-md border border-red-200 font-mono font-bold shadow-sm">
                View All
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="p-3 bg-slate-200/90 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {onPrintLabel ? <button
            type="button"
            onClick={() => onPrintLabel(product)}
            className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            Label
          </button> : null}
          {onViewHistory && (
            <button
              type="button"
              onClick={() => onViewHistory(product)}
              className="px-2.5 py-1.5 bg-slate-200 hover:bg-red-50 text-slate-700 hover:text-red-700 text-xs font-bold rounded-lg border border-slate-200 hover:border-red-200 transition-colors flex items-center gap-1.5 shadow-sm"
              title="View Purchases and Sales History"
            >
              <History className="w-3.5 h-3.5 text-red-600" />
              History
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {onDuplicate && (<button
            type="button"
            onClick={() => onDuplicate(product)}
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-lg border border-slate-200 transition-colors shadow-sm"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>)}
          {onEdit && (<button
            type="button"
            onClick={() => onEdit(product)}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>)}
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {showImageZoom && product.image && (
        <div
          onClick={() => setShowImageZoom(false)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="bg-white p-3 rounded-2xl max-w-lg w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <img
              src={product.image}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full max-h-[70vh] object-contain rounded-xl"
            />
            <div className="mt-3 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-red-600">{product.internalId}</span>
                <h4 className="font-bold text-slate-900">{product.name}</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowImageZoom(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-xs font-bold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
