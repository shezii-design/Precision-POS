import { calculateProductStockValue } from "../services/storage";
import React, { useMemo, useState } from 'react';
import { Product, Sale, Purchase } from '../types';
import { calculateSmartROP, buildProductSalesMap } from '../services/analytics';
import { formatPKR } from '../services/pricing';
import { exportAnalyticsToExcel } from '../services/excel';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AlertTriangle, PackageX, TrendingUp, Search, Calendar, ChevronRight, Lightbulb, ArrowRight, Truck, Sparkles, Download } from 'lucide-react';
import { format, subDays, subMonths, isAfter, startOfMonth, endOfMonth, parseISO } from 'date-fns';

interface AnalyticsPageProps {
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  onOpenProductHistory: (product: Product) => void;
  onOpenCreatePO?: (presets: Array<{ productId: string, orderedQuantity: number }>) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  products,
  sales,
  purchases,
  onOpenProductHistory,
  onOpenCreatePO
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});

  const toggleSelection = (productId: string, qty: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItems(prev => {
      const next = { ...prev };
      if (next[productId]) {
        delete next[productId];
      } else {
        next[productId] = qty;
      }
      return next;
    });
  };

  const handleCreatePO = () => {
    if (onOpenCreatePO) {
      const presets = Object.entries(selectedItems).map(([productId, orderedQuantity]) => ({ productId, orderedQuantity }));
      onOpenCreatePO(presets);
      setSelectedItems({});
    }
  };

  // 1. Seasonality Data (Overall Sales per Month for last 12 months)
  const seasonalityData = useMemo(() => {
    const data: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = endOfMonth(monthStart);
      
      const monthlySales = sales.filter(s => {
        const d = new Date(s.date || new Date());
        return d >= monthStart && d <= monthEnd;
      });

      const revenue = monthlySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const units = monthlySales.reduce((sum, s) => sum + s.items.reduce((acc, it) => acc + (it.quantity || 1), 0), 0);

      data.push({
        month: format(monthStart, 'MMM yyyy'),
        revenue,
        units
      });
    }
    return data;
  }, [sales]);

  // 2. Restock Needed (Low Stock)
  const restockNeeded = useMemo(() => {
    return products.filter(p => {
      const stock = p.stockQuantity || 0;
      const minAlert = typeof p.minStockAlert === 'number' && !isNaN(p.minStockAlert) ? p.minStockAlert : 5;
      return stock <= minAlert;
    }).sort((a, b) => (a.stockQuantity || 0) - (b.stockQuantity || 0));
  }, [products]);

  // 3. Dead Stock (No sales in last 90 days, but we have stock)
  const deadStock = useMemo(() => {
    const ninetyDaysAgo = subDays(new Date(), 90);
    return products.filter(p => {
      if ((p.stockQuantity || 0) <= 0) return false;
      // Has it been sold in last 90 days?
      const recentSales = sales.some(s => {
        const d = new Date(s.date || new Date());
        return isAfter(d, ninetyDaysAgo) && s.items.some(it => it.productId === p.id);
      });
      return !recentSales;
    }).sort((a, b) => calculateProductStockValue(b) - calculateProductStockValue(a));
  }, [products, sales]);

  // 4. Smart Reorder Point (ROP), EOQ & Seasonal Insights (Now AI Managed Thresholds)
  const smartReorderInsights = useMemo(() => {
    const insights = [];
    const salesMap = buildProductSalesMap(sales);
    
    for (const p of products) {
      const insight = calculateSmartROP(p, salesMap);
      if (insight) {
        insights.push({
          ...insight,
          type: insight.suggestedROP > 15 ? 'increase' : 'decrease'
        });
      }
    }
    return insights.sort((a, b) => b.suggestedROP - a.suggestedROP);
  }, [products, sales]);

  const filteredRestock = restockNeeded.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.internalId && p.internalId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredDeadStock = deadStock.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.internalId && p.internalId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSmartInsights = smartReorderInsights.filter(i => 
    i.product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.product.internalId && i.product.internalId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-emerald-600" />
            Analytics & Reordering
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Global seasonality tracking, smart restock alerts, and dead stock identification.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-72 hidden sm:block">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>
          <button
            onClick={() => exportAnalyticsToExcel(products, sales)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 shadow-xs rounded-xl font-bold text-sm transition-all"
            title="Export AI Reorder Data & EOQ to Excel"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Analytics</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {Object.keys(selectedItems).length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4">
            <div className="font-bold">
              <span className="text-emerald-400">{Object.keys(selectedItems).length}</span> items selected
            </div>
            <div className="w-px h-6 bg-slate-700"></div>
            <button
              onClick={handleCreatePO}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-4 py-1.5 rounded-full font-black text-sm transition-colors flex items-center gap-2"
            >
              <Truck className="w-4 h-4" />
              Create PO
            </button>
          </div>
        </div>
      )}
        {/* Seasonality Chart */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-emerald-600" />
            12-Month Sales Seasonality
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seasonalityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  dy={10}
                />
                <YAxis 
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  tickFormatter={(val) => `₨ ${(val/1000).toFixed(0)}k`}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748B' }}
                />
                <Tooltip 
                  cursor={{ fill: '#F1F5F9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'revenue') return [formatPKR(value), 'Revenue'];
                    return [value, 'Units Sold'];
                  }}
                />
                <Bar yAxisId="left" dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} name="revenue" />
                <Bar yAxisId="right" dataKey="units" fill="#38BDF8" radius={[4, 4, 0, 0]} name="units" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Restock Needed */}
        <div className="lg:col-span-1 bg-rose-50 border border-rose-200 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 bg-white border-b border-rose-100 flex items-center justify-between shrink-0">
            <h3 className="font-bold text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Restock Needed
            </h3>
            <span className="bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full text-xs font-black">
              {filteredRestock.length} items
            </span>
          </div>
          <div className="p-2 overflow-y-auto flex-1 space-y-2">
            {filteredRestock.length === 0 ? (
              <div className="text-center text-rose-400 p-8 text-sm font-medium">No items need restocking!</div>
            ) : (
              filteredRestock.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => onOpenProductHistory(p)}
                  className="bg-white p-3 rounded-xl border border-rose-100 cursor-pointer hover:border-rose-300 transition-colors group flex items-center gap-3"
                >
                  <input 
                    type="checkbox" 
                    checked={!!selectedItems[p.id]}
                    onClick={(e) => {
                      const qty = typeof p.minStockAlert === 'number' && p.minStockAlert > 0 ? p.minStockAlert : 10;
                      toggleSelection(p.id, qty, e);
                    }}
                    onChange={() => {}}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                  />
                  <div className="flex-1 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-800 text-sm group-hover:text-rose-600 transition-colors">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{p.internalId}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-rose-600">
                      {p.stockQuantity} {p.unit}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Min: {p.minStockAlert || 5}
                    </div>
                  </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Smart Reorder Point Insights */}
        <div className="lg:col-span-1 bg-indigo-50 border border-indigo-200 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 bg-white border-b border-indigo-100 flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-bold text-indigo-800 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-indigo-500" />
                Smart ROP Insights
              </h3>
              <div className="text-[10px] text-slate-500 mt-0.5">AI suggested Reorder Points</div>
            </div>
            <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-black">
              {filteredSmartInsights.length} suggestions
            </span>
          </div>
          <div className="p-2 overflow-y-auto flex-1 space-y-2">
            {filteredSmartInsights.length === 0 ? (
              <div className="text-center text-indigo-400 p-8 text-sm font-medium">Your reorder thresholds look optimal!</div>
            ) : (
              filteredSmartInsights.map(insight => (
                <div 
                  key={insight.product.id} 
                  onClick={() => onOpenProductHistory(insight.product)}
                  className="bg-white p-3 rounded-xl border border-indigo-100 cursor-pointer hover:border-indigo-300 transition-colors group"
                >
                  <div className="flex justify-between items-start mb-2 gap-3">
                    <input 
                      type="checkbox" 
                      checked={!!selectedItems[insight.product.id]}
                      onClick={(e) => toggleSelection(insight.product.id, insight.eoq, e)}
                      onChange={() => {}}
                      className="w-4 h-4 mt-0.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <div className="flex-1 pr-2">
                      <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {insight.product.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                      <div className="text-[10px] text-slate-500">Proj ADS: <span className="font-semibold text-slate-700">{insight.forecastedAds.toFixed(2)}/day</span></div>
                      {insight.seasonIndicator && (
                        <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${insight.seasonColor}`}>
                          {insight.seasonIndicator}
                        </div>
                      )}
                    </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-semibold text-indigo-500">Cycle / EOQ</div>
                      <div className="font-black text-slate-700 text-xs">{insight.reorderCycle}d / {insight.eoq}u</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-emerald-50 p-2 rounded-lg border border-emerald-100 mt-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <div className="text-[10px] font-semibold text-emerald-700">AI Auto-Set Min:</div>
                    </div>
                    <div className="font-black text-emerald-700">{insight.suggestedROP}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dead Stock */}
        <div className="lg:col-span-1 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <PackageX className="w-5 h-5 text-slate-500" />
                Dead Stock (90+ Days)
              </h3>
              <div className="text-[10px] text-slate-500 mt-0.5">Capital tied up in non-moving items</div>
            </div>
            <span className="bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-black">
              {filteredDeadStock.length} items
            </span>
          </div>
          <div className="p-2 overflow-y-auto flex-1">
            <div className="space-y-2">
              {filteredDeadStock.length === 0 ? (
                <div className="text-center text-slate-400 p-8 text-sm font-medium">No dead stock detected!</div>
              ) : (
                filteredDeadStock.map(p => {
                  const lockedCapital = (p.stockQuantity || 0) * (p.costPrice || 0);
                  return (
                    <div 
                      key={p.id} 
                      onClick={() => onOpenProductHistory(p)}
                      className="bg-white p-3 rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                          {p.image ? (
                            <img src={p.image} className="w-full h-full object-cover rounded-lg opacity-70 group-hover:opacity-100 transition-opacity" alt="" />
                          ) : (
                            <PackageX className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm group-hover:text-slate-900">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">{p.internalId} • {p.brandName}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <div className="text-xs font-semibold text-slate-600">Stock</div>
                          <div className="font-black text-slate-800">{p.stockQuantity} {p.unit}</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-rose-500">Locked Capital</div>
                          <div className="font-black text-rose-600 font-mono">{formatPKR(lockedCapital)}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
