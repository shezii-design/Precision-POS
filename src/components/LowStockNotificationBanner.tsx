import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { 
  AlertTriangle, 
  ArrowRight, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ShoppingCart, 
  Boxes, 
  MapPin, 
  Tag, 
  AlertOctagon,
  Eye
} from 'lucide-react';

interface LowStockNotificationBannerProps {
  products: Product[];
  onViewLowStockInventory: () => void;
  onOpenPurchaseOrders?: () => void;
  onDismiss: () => void;
}

export const LowStockNotificationBanner: React.FC<LowStockNotificationBannerProps> = ({
  products,
  onViewLowStockInventory,
  onOpenPurchaseOrders,
  onDismiss,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Compute all products currently at or below their minimum stock alert
  const lowStockProducts = useMemo(() => {
    return products.filter(p => {
      const qty = typeof p.stockQuantity === 'number' && !isNaN(p.stockQuantity) ? p.stockQuantity : 0;
      const alertThreshold = typeof p.minStockAlert === 'number' && !isNaN(p.minStockAlert) ? p.minStockAlert : 5;
      return qty <= alertThreshold;
    });
  }, [products]);

  // Total quantity / units of stock remaining across all low-stock items
  const totalLowStockUnits = useMemo(() => {
    return lowStockProducts.reduce((sum, p) => sum + Math.max(0, typeof p.stockQuantity === 'number' && !isNaN(p.stockQuantity) ? p.stockQuantity : 0), 0);
  }, [lowStockProducts]);

  // Out of stock (0 units) subset count
  const outOfStockCount = useMemo(() => {
    return lowStockProducts.filter(p => (typeof p.stockQuantity === 'number' && !isNaN(p.stockQuantity) ? p.stockQuantity : 0) <= 0).length;
  }, [lowStockProducts]);

  // Total deficiency units required to replenish back up to minimum stock thresholds
  const totalDeficiencyUnits = useMemo(() => {
    return lowStockProducts.reduce((sum, p) => {
      const threshold = typeof p.minStockAlert === 'number' && !isNaN(p.minStockAlert) ? p.minStockAlert : 5;
      const current = Math.max(0, typeof p.stockQuantity === 'number' && !isNaN(p.stockQuantity) ? p.stockQuantity : 0);
      return sum + Math.max(0, threshold - current);
    }, 0);
  }, [lowStockProducts]);

  // Only render if there is at least 1 product with low stock
  if (lowStockProducts.length === 0) {
    return null;
  }

  return (
    <div 
      id="low-stock-login-notification-banner"
      className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-red-500/10 border-2 border-amber-400/80 rounded-2xl p-4 sm:p-5 shadow-lg shadow-amber-900/5 transition-all duration-300 relative overflow-hidden backdrop-blur-xs"
      role="alert"
      aria-live="polite"
    >
      {/* Background visual indicator accents */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-32 h-32 bg-red-400/10 rounded-full blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-3.5">
        {/* Main Banner Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 sm:gap-3.5 flex-1 min-w-0">
            {/* Warning Icon Badge */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30 ring-4 ring-amber-100">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>

            {/* Notification Text & Summaries */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-600 text-white shadow-xs">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  {lowStockProducts.length > 5 ? 'LOGIN ALERT: CRITICAL LOW STOCK (>5 ITEMS)' : 'INVENTORY NOTICE: LOW STOCK DETECTED'}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                  {lowStockProducts.length} Affected Products
                </span>
                {outOfStockCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white shadow-2xs">
                    <AlertOctagon className="w-3 h-3" />
                    {outOfStockCount} Out of Stock
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {lowStockProducts.length > 5 ? 'Critical Inventory Reorder Warning' : 'Low Stock Replenishment Reminder'}
              </h2>
              
              <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed mt-0.5">
                You have <strong className="text-amber-900 font-bold underline decoration-amber-400 decoration-2 underline-offset-2">{lowStockProducts.length} products</strong> that have dropped to or below their reorder thresholds. 
                Summarized inventory count: <strong className="text-slate-950 font-bold">{totalLowStockUnits.toLocaleString()} total units remaining</strong> across these items 
                {totalDeficiencyUnits > 0 && (
                  <span className="text-slate-600"> (need <strong className="text-red-700 font-semibold">{totalDeficiencyUnits.toLocaleString()} units</strong> to restore minimum target buffers)</span>
                )}.
              </p>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            id="dismiss-low-stock-banner-btn"
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss low stock alert notification"
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-amber-100/60 rounded-xl transition-colors shrink-0"
            title="Dismiss notification for this session"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-amber-200/60">
          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Inventory Filter Action */}
            <button
              id="filter-low-stock-inventory-btn"
              type="button"
              onClick={onViewLowStockInventory}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
            >
              <Eye className="w-4 h-4" />
              <span>Review {lowStockProducts.length} Low Stock Items</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>

            {/* Create Purchase Order Action */}
            {onOpenPurchaseOrders && (
              <button
                id="reorder-po-low-stock-btn"
                type="button"
                onClick={onOpenPurchaseOrders}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 active:bg-amber-100 text-amber-900 border border-amber-300 text-xs sm:text-sm font-semibold shadow-2xs hover:shadow-xs transition-all"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-amber-700" />
                <span>Create Purchase Order (PO)</span>
              </button>
            )}

            {/* Quick Accordion Toggle for Inline Inspection */}
            <button
              id="toggle-low-stock-details-btn"
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100/70 hover:bg-amber-200/80 text-amber-900 text-xs font-semibold transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Hide Item List</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Quick Preview ({lowStockProducts.length} Parts)</span>
                </>
              )}
            </button>
          </div>

          <div className="text-[11px] sm:text-xs text-amber-900/80 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>Automatic Reorder Reminder</span>
          </div>
        </div>

        {/* Expandable Preview List Drawer */}
        {isExpanded && (
          <div 
            id="low-stock-preview-drawer"
            className="mt-2 pt-3 border-t border-amber-200/80 max-h-64 overflow-y-auto pr-1 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <div className="text-xs font-bold text-slate-700 flex items-center justify-between pb-1">
              <span>Low Stock Items Breakdown ({lowStockProducts.length} items, {totalLowStockUnits} units total)</span>
              <span className="text-[11px] text-slate-500 font-normal">Sorted by lowest stock</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {lowStockProducts
                .sort((a, b) => (a.stockQuantity ?? 0) - (b.stockQuantity ?? 0))
                .map(product => {
                  const qty = product.stockQuantity ?? 0;
                  const alertThreshold = product.minStockAlert || 5;
                  const isZero = qty <= 0;

                  return (
                    <div
                      key={product.id}
                      id={`low-stock-item-card-${product.id}`}
                      onClick={onViewLowStockInventory}
                      className="group cursor-pointer bg-white/90 hover:bg-white border border-amber-200/90 hover:border-amber-400 rounded-xl p-2.5 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {product.internalId}
                            </span>
                            <span className="text-[10px] text-slate-500 truncate font-medium">
                              {product.brandName}
                            </span>
                          </div>
                          <p className="font-bold text-xs text-slate-900 truncate mt-1 group-hover:text-amber-700 transition-colors">
                            {product.name}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {product.typeName}
                          </p>
                        </div>

                        {/* Stock status badge */}
                        <div className="text-right shrink-0">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-black tracking-tight ${
                            isZero 
                              ? 'bg-red-600 text-white animate-pulse' 
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {qty} / {alertThreshold} {product.unit || 'pcs'}
                          </span>
                          <p className="text-[9px] font-semibold text-slate-400 mt-0.5">
                            {isZero ? '0% Remaining' : `${Math.round((qty / alertThreshold) * 100)}% of Min`}
                          </p>
                        </div>
                      </div>

                      {/* Location & Coordinates */}
                      <div className="flex items-center justify-between gap-1 mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{product.locationName || 'Main Store'}</span>
                          {product.cabinNumber && (
                            <span className="font-mono text-slate-700 font-bold">({product.cabinNumber})</span>
                          )}
                        </span>
                        <span className="text-amber-700 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 shrink-0">
                          Inspect &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
