import React, { useState } from 'react';
import { DimensionUnit, GlobalPricingSettings, Product } from '../types';
import { formatDimension } from '../services/dimensions';
import { formatPKR, getTierTheme } from '../services/pricing';
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
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onDuplicate: (product: Product) => void;
  onPrintLabel: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
  onQuickUpdateCost: (productId: string, newCost: number) => void;
  onViewHistory?: (product: Product) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
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
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Table control sub-bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 text-xs font-semibold text-slate-700">
        <div>
          Showing <span className="font-bold text-slate-900">{products.length}</span> items in table view
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] sm:text-xs">Dimensions Unit:</span>
          <div className="flex bg-slate-200/80 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setTableUnit('inch')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                tableUnit === 'inch' ? 'bg-red-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inches (in)
            </button>
            <button
              type="button"
              onClick={() => setTableUnit('mm')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                tableUnit === 'mm' ? 'bg-red-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              mm (Metric)
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-xs">
          <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
            <tr>
              <th className="py-3 px-3.5">ID / Name</th>
              <th className="py-3 px-3">Brand / Type</th>
              <th className="py-3 px-3">Location & Cabin</th>
              <th className="py-3 px-3">Stock</th>
              <th className="py-3 px-3 text-red-600 font-black">Cost (PKR)</th>
              <th className="py-3 px-3 text-amber-600 font-black">Wholesale (PKR)</th>
              <th className="py-3 px-3 text-emerald-700 font-black">Retail (PKR)</th>
              <th className="py-3 px-3">Dimensions ({tableUnit})</th>
              <th className="py-3 px-3">Thread</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => {
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
                <tr key={p.id} className="hover:bg-red-50/30 transition-colors">
                  {/* ID / Name */}
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-2.5">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-400 shrink-0">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="font-mono font-bold text-[11px] text-red-600 block">
                          {p.internalId}
                        </span>
                        <span className="font-bold text-slate-900 text-xs">
                          {p.name}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Brand / Type */}
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-800">{p.brandName}</div>
                    <div className="text-[11px] text-slate-500">{p.typeName}</div>
                  </td>

                  {/* Location & Cabin */}
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-800">{p.locationName}</div>
                    <div className="font-mono text-[11px] font-bold text-red-700">Cabin: {p.cabinNumber}</div>
                  </td>

                  {/* Stock */}
                  <td className="py-3 px-3">
                    <div
                      onClick={() => onAdjustStock(p)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold cursor-pointer hover:opacity-80 ${
                        isOutOfStock
                          ? 'bg-rose-100 text-rose-800'
                          : isLowStock
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                      title="Click to adjust stock"
                    >
                      <span>{p.stockQuantity} {p.unit}</span>
                    </div>
                  </td>

                  {/* Cost Price - RED */}
                  <td className="py-3 px-3">
                    {editingCostId === p.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={tempCostValue}
                          onChange={(e) => setTempCostValue(e.target.value)}
                          className="w-16 px-1.5 py-0.5 border border-red-500 rounded text-xs font-black text-red-600"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveCost(p.id)}
                          className="p-1 bg-red-600 text-white rounded cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleStartCostEdit(p)}
                        className="font-mono font-black text-red-600 cursor-pointer hover:text-red-700 group"
                        title="Click to edit cost (Red)"
                      >
                        <div className="flex items-center gap-1">
                          <span>{formatPKR(p.costPrice)}</span>
                          <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-red-400" />
                        </div>
                        {p.costBatches && p.costBatches.length > 1 && (
                          <div className="text-[9px] font-semibold text-slate-400 font-sans">
                            {p.costBatches.length} FIFO batches
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Wholesale - YELLOW / AMBER */}
                  <td className="py-3 px-3 font-mono font-black text-amber-600">
                    {formatPKR(wholesale)}
                  </td>

                  {/* Retail Tiers - GREEN (Adjusted greenness according to tier level) */}
                  <td className="py-3 px-3">
                    {retailTiers.length > 0 ? (
                      <div className="space-y-1">
                        {retailTiers.map((rt, rtIdx) => {
                          const theme = getTierTheme(rt, rtIdx + 1, activeTiers.length);
                          return (
                            <div key={rt.tierId || rtIdx} className="flex items-center gap-1.5">
                              {retailTiers.length > 1 && (
                                <span className="text-[9px] font-bold text-slate-400 truncate max-w-[65px]">
                                  {rt.tierName}:
                                </span>
                              )}
                              <span className={`font-mono font-black text-xs ${theme.textColor}`}>
                                {formatPKR(rt.price)}
                              </span>
                              <span className={`text-[9px] px-1 rounded ${theme.markupBadge}`}>
                                {rt.markupPercent}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : defaultRetailSp ? (
                      (() => {
                        const theme = getTierTheme(defaultRetailSp, 1, activeTiers.length);
                        return (
                          <div className={`font-mono font-black text-xs ${theme.textColor}`}>
                            {formatPKR(defaultRetailSp.price)}
                          </div>
                        );
                      })()
                    ) : (
                      <span className="text-slate-400 font-mono">—</span>
                    )}
                  </td>

                  {/* Dimensions */}
                  <td className="py-3 px-3 text-[11px] text-slate-700">
                    {dims && (dims.height !== undefined || dims.outerDia !== undefined || dims.innerDia !== undefined) ? (
                      <div className="space-y-0.5">
                        {dims.height !== undefined && (
                          <div>H: <strong>{formatDimension(dims.height, tableUnit)}</strong></div>
                        )}
                        {dims.outerDia !== undefined && (
                          <div>OD: <strong>{formatDimension(dims.outerDia, tableUnit)}</strong></div>
                        )}
                        {dims.innerDia !== undefined && (
                          <div>ID: <strong>{formatDimension(dims.innerDia, tableUnit)}</strong></div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Thread (Never converted) */}
                  <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-800">
                    {dims?.thread || <span className="text-slate-400">—</span>}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onViewHistory && (
                        <button
                          type="button"
                          onClick={() => onViewHistory(p)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="View Purchases & Sales History"
                        >
                          <History className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onPrintLabel(p)}
                        className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Print Label"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicate(p)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(p)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(p.id)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
