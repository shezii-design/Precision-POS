import React, { useState } from 'react';
import { DimensionUnit, GlobalPricingSettings, Product } from '../types';
import { formatDimension } from '../services/dimensions';
import { formatPKR, getTierTheme } from '../services/pricing';
import { TableVirtuoso } from 'react-virtuoso';
import { 
  Edit3, 
  Trash2, 
  Printer, 
  Copy, 
  MapPin, 
  Box, 
  ArrowRightLeft,
  Check,
  Tag,
  History
} from 'lucide-react';

interface ProductTableProps {
  products: Product[];
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
  const sortedBatches = [...product.costBatches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
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

export const ProductTable: React.FC<ProductTableProps> = React.memo(({
  products,
  pricingSettings,
  onEdit,
  onDelete,
  onDuplicate,
  onPrintLabel,
  onAdjustStock,
  onQuickUpdateCost,
  onViewHistory,
}) => {
  const [tableUnit, setTableUnit] = useState<DimensionUnit>('inch');
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [tempCostValue, setTempCostValue] = useState<string>('');

  const handleStartCostEdit = (p: Product) => {
    setEditingCostId(p.id);
    setTempCostValue(String(p.costPrice || 0));
  };

  const handleSaveCost = (productId: string) => {
    const val = parseFloat(tempCostValue);
    if (!isNaN(val) && val >= 0) {
      onQuickUpdateCost(productId, val);
    }
    setEditingCostId(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Table control sub-bar */}
      <div className="p-3.5 bg-slate-200 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm font-bold text-slate-700">
        <div className="flex items-center gap-2">
          <span>
            Showing <span className="font-black text-slate-900">{products.length}</span> items in table view
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs sm:text-sm font-bold text-slate-600">Dimensions Unit:</span>
          <div className="flex bg-slate-300/80 p-0.5 rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => setTableUnit('inch')}
              className={`px-3 py-1 rounded-md text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                tableUnit === 'inch' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Inches (in)
            </button>
            <button
              type="button"
              onClick={() => setTableUnit('mm')}
              className={`px-3 py-1 rounded-md text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                tableUnit === 'mm' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              mm (Metric)
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <TableVirtuoso
          style={{ height: '70vh' }}
          data={products}
          components={{
            Table: (props) => <table className="w-full min-w-[1040px] text-left text-sm" {...props} />,
            TableHead: React.forwardRef((props, ref) => <thead className="bg-slate-200/90 text-slate-700 font-extrabold uppercase tracking-wide text-xs border-b border-slate-300" {...props} ref={ref} />),
            TableBody: React.forwardRef((props, ref) => <tbody className="divide-y divide-slate-100" {...props} ref={ref} />)
          }}
          fixedHeaderContent={() => (
            <tr>
              <th className="py-3.5 px-4 bg-slate-200/95">ID / Name</th>
              <th className="py-3.5 px-3 bg-slate-200/95">Brand / Type</th>
              <th className="py-3.5 px-3 bg-slate-200/95">Location & Cabin</th>
              <th className="py-3.5 px-3 bg-slate-200/95">Stock</th>
              <th className="py-3.5 px-3 text-red-700 font-black bg-slate-200/95">Cost (PKR)</th>
              <th className="py-3.5 px-3 text-amber-700 font-black bg-slate-200/95">Wholesale (PKR)</th>
              <th className="py-3.5 px-3 text-emerald-800 font-black bg-slate-200/95">Retail (PKR)</th>
              <th className="py-3.5 px-3 bg-slate-200/95">Dimensions ({tableUnit})</th>
              <th className="py-3.5 px-3 bg-slate-200/95">Thread</th>
              <th className="py-3.5 px-4 text-right bg-slate-200/95">Actions</th>
            </tr>
          )}
          itemContent={(index, p) => {
            const dims = p.dimensions;
            const stockQty = typeof p.stockQuantity === 'number' && !isNaN(p.stockQuantity) ? p.stockQuantity : 0;
            const alertThreshold = typeof p.minStockAlert === 'number' && !isNaN(p.minStockAlert) ? p.minStockAlert : 5;
            const isOutOfStock = stockQty <= 0;
            const isLowStock = !isOutOfStock && stockQty <= alertThreshold;
            const activeTiers = (p.sellingPrices || []).slice(0, pricingSettings.activeTierCount);
            const wholesaleSp = activeTiers.find(s => s?.tierName && s.tierName.toLowerCase().includes('wholesale')) || activeTiers[0];
            const wholesale = wholesaleSp?.price || 0;
            
            // All non-wholesale / retail tiers
            const retailTiers = activeTiers.filter(s => s?.tierId !== wholesaleSp?.tierId);
            const defaultRetailSp = retailTiers.find(s => s?.tierName && s.tierName.toLowerCase().includes('retail')) || retailTiers[0] || activeTiers[1];

            return (
              <>
                  {/* ID & Name */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs sm:text-sm font-extrabold text-slate-800 tracking-wide">
                        {p.internalId}
                      </span>
                      <span className="font-bold text-sm sm:text-base text-slate-900 mt-0.5 max-w-[220px] truncate" title={p.name}>
                        {p.name}
                      </span>
                    </div>
                  </td>

                  {/* Brand & Type */}
                  <td className="py-3.5 px-3">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="bg-slate-200 text-slate-800 border border-slate-300 px-2 py-0.5 rounded-md text-xs font-extrabold">
                        {p.brandName}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 truncate max-w-[130px]" title={p.typeName}>
                        {p.typeName}
                      </span>
                    </div>
                  </td>

                  {/* Location & Cabin */}
                  <td className="py-3.5 px-3 text-slate-700 text-xs sm:text-sm">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 font-bold truncate max-w-[130px]" title={p.locationName}>
                        <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>{p.locationName}</span>
                      </div>
                      {p.cabinNumber && (
                        <div className="flex items-center gap-1 text-xs font-mono font-bold text-slate-600">
                          <Box className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Cabin: {p.cabinNumber}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Stock */}
                  <td className="py-3.5 px-3">
                    <div
                      onClick={onAdjustStock ? () => onAdjustStock(p) : undefined}
                      className={`inline-flex font-mono text-xs sm:text-sm font-black px-2.5 py-1 rounded-lg cursor-pointer hover:opacity-85 transition-opacity ${
                        isOutOfStock
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : isLowStock
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                      title="Click to adjust stock"
                    >
                      <span>{p.stockQuantity} {p.unit}</span>
                    </div>
                  </td>

                  {/* Cost Price - RED */}
                  <td className="py-3.5 px-3">
                    {editingCostId === p.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={tempCostValue}
                          onChange={(e) => setTempCostValue(e.target.value)}
                          className="w-20 px-2 py-1 border-2 border-red-500 rounded text-sm font-black text-red-600"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveCost(p.id)}
                          className="p-1 bg-red-600 text-white rounded cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleStartCostEdit(p)}
                        className="font-mono font-black text-sm sm:text-base text-red-600 cursor-pointer hover:text-red-700 group"
                        title="Click to edit cost (Red)"
                      >
                        <div className="flex items-center gap-1">
                          <span>{formatPKR(p.costPrice)}</span>
                          <Edit3 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-red-400" />
                        </div>
                        {getOldCostTiers(p).map(t => (
                          <div key={t.cost} className="text-[10px] sm:text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 w-fit mt-0.5 whitespace-nowrap">
                            {t.qty} @ {formatPKR(t.cost)}
                          </div>
                        ))}
                        {p.costBatches && p.costBatches.length > 1 && getOldCostTiers(p).length === 0 && (
                          <div className="text-[10px] sm:text-xs font-semibold text-slate-500 font-sans mt-0.5">
                            {p.costBatches.length} FIFO batches
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Wholesale - YELLOW / AMBER */}
                  <td className="py-3.5 px-3 font-mono font-black text-sm sm:text-base text-amber-600">
                    {formatPKR(wholesale)}
                  </td>

                  {/* Retail Tiers - GREEN */}
                  <td className="py-3.5 px-3 min-w-[150px]">
                    {retailTiers.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {retailTiers.map((rt, rtIdx) => {
                          const theme = getTierTheme(rt, rtIdx, activeTiers.length);
                          return (
                            <div key={rt.tierId || rtIdx} className="flex items-center gap-1.5">
                              {retailTiers.length > 1 && (
                                <span className="text-[10px] sm:text-xs font-bold text-slate-500 truncate max-w-[70px]">
                                  {rt.tierName}:
                                </span>
                              )}
                              <span className={`font-mono font-black text-sm ${theme.textColor}`}>
                                {formatPKR(rt.price)}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${theme.markupBadge}`}>
                                {rt.tierId === 'tier-general' || rt.tierName.toLowerCase().includes('general') ? 'Fix' : `${rt.markupPercent}%`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : defaultRetailSp ? (
                      (() => {
                        const theme = getTierTheme(defaultRetailSp, 1, activeTiers.length);
                        return (
                          <div className={`font-mono font-black text-sm sm:text-base ${theme.textColor}`}>
                            {formatPKR(defaultRetailSp.price)}
                          </div>
                        );
                      })()
                    ) : (
                      <span className="text-slate-400 font-mono">—</span>
                    )}
                  </td>

                  {/* Dimensions */}
                  <td className="py-3.5 px-3 text-xs sm:text-sm text-slate-800">
                    {dims && (dims.height !== undefined || dims.outerDia !== undefined || dims.innerDia !== undefined) ? (
                      <div className="space-y-0.5">
                        {dims.height !== undefined && (
                          <div>H: <strong className="font-bold text-slate-900">{formatDimension(dims.height, tableUnit)}</strong></div>
                        )}
                        {dims.outerDia !== undefined && (
                          <div>OD: <strong className="font-bold text-slate-900">{formatDimension(dims.outerDia, tableUnit)}</strong></div>
                        )}
                        {dims.innerDia !== undefined && (
                          <div>ID: <strong className="font-bold text-slate-900">{formatDimension(dims.innerDia, tableUnit)}</strong></div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Thread (Never converted) */}
                  <td className="py-3.5 px-3 font-mono text-xs sm:text-sm font-bold text-slate-900">
                    {dims?.thread || <span className="text-slate-400">—</span>}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onViewHistory && (
                        <button
                          type="button"
                          onClick={() => onViewHistory(p)}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="View Purchases & Sales History"
                        >
                          <History className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                      {onPrintLabel && (<button
                        type="button"
                        onClick={() => onPrintLabel(p)}
                        className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Print Barcode Label"
                      >
                        <Printer className="w-4 h-4" />
                      </button>)}
                      {onDuplicate && (<button
                        type="button"
                        onClick={() => onDuplicate(p)}
                        className="p-1.5 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>)}
                      {onEdit && (<button
                        type="button"
                        onClick={() => onEdit(p)}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>)}
                      {onDelete && (<button
                        type="button"
                        onClick={() => onDelete(p.id)}
                        className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>)}
                    </div>
                  </td>
              </>
            );
          }}
        />
      </div>
    </div>
  );
});
