import React, { useMemo, useState } from 'react';
import { Product, Sale, Purchase, ProductVelocityMetrics, InventoryVelocitySummary } from '../types';
import { 
  calculateSmartROP, 
  buildProductSalesMap, 
  calculateAllInventoryVelocity, 
  calculateInventoryVelocitySummary,
  SmartROPInsight 
} from '../services/analytics';
import { formatPKR, formatPKRShort } from '../services/pricing';
import { exportAnalyticsToExcel, exportInventoryVelocityToExcel } from '../services/excel';
import { calculateProductStockValue } from "../services/storage";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  AlertTriangle, 
  PackageX, 
  TrendingUp, 
  Search, 
  Calendar, 
  ChevronRight, 
  Lightbulb, 
  ArrowRight, 
  Truck, 
  Sparkles, 
  Download,
  Flame,
  Zap,
  Clock,
  ShieldAlert,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Tag,
  MapPin,
  Box,
  Layers,
  RotateCcw,
  PackageCheck
} from 'lucide-react';
import { format, subDays, subMonths, isAfter, startOfMonth, endOfMonth } from 'date-fns';

interface AnalyticsPageProps {
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  velocityMap?: Map<string, ProductVelocityMetrics>;
  velocitySummary?: InventoryVelocitySummary;
  onOpenProductHistory: (product: Product) => void;
  onOpenCreatePO?: (presets: Array<{ productId: string, orderedQuantity: number }>) => void;
}

export type AnalyticsTab = 
  | 'fast_movers' 
  | 'dead_stock' 
  | 'slow_movers' 
  | 'smart_rop' 
  | 'seasonality';

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  products,
  sales,
  purchases,
  velocityMap: propVelocityMap,
  velocitySummary: propVelocitySummary,
  onOpenProductHistory,
  onOpenCreatePO
}) => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('fast_movers');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [deadStockWindowFilter, setDeadStockWindowFilter] = useState<'all' | '60d' | '90d' | '180d' | 'never_sold'>('all');

  // Compute velocity metrics if not passed from parent
  const velocityMap = useMemo(() => {
    return propVelocityMap || calculateAllInventoryVelocity(products, sales);
  }, [propVelocityMap, products, sales]);

  const velocitySummary = useMemo(() => {
    return propVelocitySummary || calculateInventoryVelocitySummary(products, velocityMap);
  }, [propVelocitySummary, products, velocityMap]);

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

  const handleSelectAllInTab = (itemsToSelect: Array<{ id: string; qty: number }>) => {
    setSelectedItems(prev => {
      const allSelected = itemsToSelect.every(it => prev[it.id]);
      if (allSelected) {
        const next = { ...prev };
        itemsToSelect.forEach(it => delete next[it.id]);
        return next;
      } else {
        const next = { ...prev };
        itemsToSelect.forEach(it => {
          next[it.id] = it.qty;
        });
        return next;
      }
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
      const units = monthlySales.reduce((sum, s) => sum + (s.items || []).reduce((acc, it) => acc + (it.netQuantity !== undefined ? it.netQuantity : (it.quantity || 1)), 0), 0);

      data.push({
        month: format(monthStart, 'MMM yyyy'),
        revenue,
        units
      });
    }
    return data;
  }, [sales]);

  // 2. Fast-Selling Movers List (Ranked by 30-day volume & revenue)
  const fastMovers = useMemo(() => {
    return products
      .map(p => ({
        product: p,
        metrics: velocityMap.get(p.id)!
      }))
      .filter(item => item.metrics && (item.metrics.velocityTier === 'fast' || item.metrics.isStockoutRisk))
      .sort((a, b) => {
        // High stockout risk first, then 30d units
        if (a.metrics.isStockoutRisk && !b.metrics.isStockoutRisk) return -1;
        if (!a.metrics.isStockoutRisk && b.metrics.isStockoutRisk) return 1;
        return (b.metrics.unitsLast30Days || 0) - (a.metrics.unitsLast30Days || 0);
      });
  }, [products, velocityMap]);

  // 3. Dead Stock List (No sales in 60+ days with physical stock)
  const deadStockItems = useMemo(() => {
    return products
      .map(p => ({
        product: p,
        metrics: velocityMap.get(p.id)!
      }))
      .filter(item => {
        if (!item.metrics || (item.product.stockQuantity || 0) <= 0) return false;
        if (item.metrics.velocityTier !== 'dead') return false;

        if (deadStockWindowFilter === 'never_sold') {
          return item.metrics.daysSinceLastSale === null;
        }
        if (deadStockWindowFilter === '180d') {
          return item.metrics.daysSinceLastSale === null || item.metrics.daysSinceLastSale >= 180;
        }
        if (deadStockWindowFilter === '90d') {
          return item.metrics.daysSinceLastSale === null || item.metrics.daysSinceLastSale >= 90;
        }
        if (deadStockWindowFilter === '60d') {
          return item.metrics.daysSinceLastSale === null || item.metrics.daysSinceLastSale >= 60;
        }
        return true;
      })
      .sort((a, b) => (b.metrics.tiedUpCapital || 0) - (a.metrics.tiedUpCapital || 0));
  }, [products, velocityMap, deadStockWindowFilter]);

  // 4. Slow-Moving Stock List
  const slowMovers = useMemo(() => {
    return products
      .map(p => ({
        product: p,
        metrics: velocityMap.get(p.id)!
      }))
      .filter(item => item.metrics && item.metrics.velocityTier === 'slow' && (item.product.stockQuantity || 0) > 0)
      .sort((a, b) => (b.metrics.tiedUpCapital || 0) - (a.metrics.tiedUpCapital || 0));
  }, [products, velocityMap]);

  // 5. Smart Reorder Point (ROP) Insights
  const smartReorderInsights = useMemo(() => {
    const insights: Array<SmartROPInsight & { type: 'increase' | 'decrease' }> = [];
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

  // Text filtering across active tabs
  const filteredFastMovers = useMemo(() => {
    if (!searchTerm.trim()) return fastMovers;
    const q = searchTerm.toLowerCase();
    return fastMovers.filter(i => 
      (i.product.name && i.product.name.toLowerCase().includes(q)) || 
      (i.product.internalId && i.product.internalId.toLowerCase().includes(q)) ||
      (i.product.brandName && i.product.brandName.toLowerCase().includes(q))
    );
  }, [fastMovers, searchTerm]);

  const filteredDeadStock = useMemo(() => {
    if (!searchTerm.trim()) return deadStockItems;
    const q = searchTerm.toLowerCase();
    return deadStockItems.filter(i => 
      (i.product.name && i.product.name.toLowerCase().includes(q)) || 
      (i.product.internalId && i.product.internalId.toLowerCase().includes(q)) ||
      (i.product.brandName && i.product.brandName.toLowerCase().includes(q)) ||
      (i.product.cabinNumber && i.product.cabinNumber.toLowerCase().includes(q))
    );
  }, [deadStockItems, searchTerm]);

  const filteredSlowMovers = useMemo(() => {
    if (!searchTerm.trim()) return slowMovers;
    const q = searchTerm.toLowerCase();
    return slowMovers.filter(i => 
      (i.product.name && i.product.name.toLowerCase().includes(q)) || 
      (i.product.internalId && i.product.internalId.toLowerCase().includes(q)) ||
      (i.product.brandName && i.product.brandName.toLowerCase().includes(q))
    );
  }, [slowMovers, searchTerm]);

  const filteredSmartInsights = useMemo(() => {
    if (!searchTerm.trim()) return smartReorderInsights;
    const q = searchTerm.toLowerCase();
    return smartReorderInsights.filter(i => 
      (i.product.name && i.product.name.toLowerCase().includes(q)) || 
      (i.product.internalId && i.product.internalId.toLowerCase().includes(q))
    );
  }, [smartReorderInsights, searchTerm]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              SALES VELOCITY & INVENTORY INTELLIGENCE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <span>Inventory Movement & Sales Tracking</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time classification into Fast Movers, Steady Turners, Slow Moving, and Dormant Dead Stock with locked capital auditing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative w-64 sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter part name, ID, brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>

          <button
            onClick={() => exportInventoryVelocityToExcel(products, velocityMap)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
            title="Download full Velocity & Dead Stock Excel audit file"
          >
            <Download className="w-4 h-4" />
            <span>Export Velocity Excel</span>
          </button>
        </div>
      </div>

      {/* Floating Batch Actions Bar when items are selected */}
      {Object.keys(selectedItems).length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-slate-900 text-white px-5 sm:px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 border border-slate-700">
            <div className="font-bold text-sm">
              <span className="text-emerald-400 font-black">{Object.keys(selectedItems).length}</span> items selected
            </div>
            <div className="w-px h-6 bg-slate-700"></div>
            <button
              onClick={handleCreatePO}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-1.5 rounded-full font-black text-xs sm:text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>Create Purchase Order</span>
            </button>
            <button
              onClick={() => setSelectedItems({})}
              className="text-xs text-slate-400 hover:text-white font-semibold cursor-pointer underline"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* EXECUTIVE KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Fast Movers */}
        <div 
          onClick={() => setActiveTab('fast_movers')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            activeTab === 'fast_movers'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/30 shadow-sm'
              : 'bg-white border-slate-200 hover:border-emerald-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-800 uppercase tracking-wide flex items-center gap-1">
              <Flame className="w-4 h-4 text-emerald-600 fill-emerald-600" /> Fast Selling
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
              {velocitySummary.fastMoversCount} items
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {velocitySummary.fastMoversUnits30d} <span className="text-xs font-semibold text-slate-500">units/30d</span>
            </div>
            <div className="text-xs font-bold text-emerald-700 mt-1 truncate">
              ₨ {formatPKR(velocitySummary.fastMoversRevenue30d)} (30d revenue)
            </div>
            {velocitySummary.stockoutRiskCount > 0 ? (
              <div className="mt-2 text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                {velocitySummary.stockoutRiskCount} at Stockout Danger!
              </div>
            ) : (
              <div className="mt-2 text-[10px] font-semibold text-slate-400">
                Safe replenishment buffers
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Steady Turners */}
        <div 
          className="p-4 rounded-2xl border bg-white border-slate-200 shadow-2xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-blue-800 uppercase tracking-wide flex items-center gap-1">
              <Zap className="w-4 h-4 text-blue-600" /> Steady Movers
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-100 text-blue-900 border border-blue-200">
              {velocitySummary.moderateCount} items
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-800">
              Healthy Stock
            </div>
            <div className="text-xs text-slate-500 font-semibold mt-1">
              Balanced inventory coverage
            </div>
            <div className="mt-2 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              Consistent monthly sales turnover
            </div>
          </div>
        </div>

        {/* Card 3: Slow Moving */}
        <div 
          onClick={() => setActiveTab('slow_movers')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            activeTab === 'slow_movers'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/30 shadow-sm'
              : 'bg-white border-slate-200 hover:border-amber-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-900 uppercase tracking-wide flex items-center gap-1">
              <Clock className="w-4 h-4 text-amber-600" /> Slow Moving
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200">
              {velocitySummary.slowMoversCount} items
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-amber-900 font-mono truncate">
              ₨ {formatPKRShort(velocitySummary.slowMoversTiedUpCapital)}
            </div>
            <div className="text-xs text-slate-500 font-semibold mt-1">
              Overstocked capital exposure
            </div>
            <div className="mt-2 text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
              Holding &gt; 90–180 days of cover
            </div>
          </div>
        </div>

        {/* Card 4: Dead Stock Audit */}
        <div 
          onClick={() => setActiveTab('dead_stock')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            activeTab === 'dead_stock'
              ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-500/30 shadow-sm'
              : 'bg-white border-slate-200 hover:border-purple-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-purple-900 uppercase tracking-wide flex items-center gap-1">
              <PackageX className="w-4 h-4 text-purple-600" /> Dead Stock
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-black bg-purple-100 text-purple-900 border border-purple-300">
              {velocitySummary.deadStockCount} items
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono truncate">
              ₨ {formatPKRShort(velocitySummary.deadStockTiedUpCapital)}
            </div>
            <div className="text-xs text-purple-900 font-bold mt-1">
              Locked Idle Working Capital
            </div>
            <div className="mt-2 text-[10px] font-black text-purple-800 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
              Click to view liquidation desk
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS BAR */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-1 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('fast_movers')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'fast_movers'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flame className="w-4 h-4 text-emerald-600 fill-emerald-600" />
            <span>Fast Movers ({fastMovers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dead_stock')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'dead_stock'
                ? 'bg-white text-purple-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PackageX className="w-4 h-4 text-purple-600" />
            <span>Dead Stock Audit ({deadStockItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('slow_movers')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'slow_movers'
                ? 'bg-white text-amber-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Slow Moving ({slowMovers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('smart_rop')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'smart_rop'
                ? 'bg-white text-indigo-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lightbulb className="w-4 h-4 text-indigo-600" />
            <span>Smart ROP & EOQ ({smartReorderInsights.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('seasonality')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'seasonality'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-slate-600" />
            <span>12-Month Sales Chart</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Showing {activeTab === 'fast_movers' ? filteredFastMovers.length : activeTab === 'dead_stock' ? filteredDeadStock.length : activeTab === 'slow_movers' ? filteredSlowMovers.length : filteredSmartInsights.length} items
        </div>
      </div>

      {/* TAB CONTENT 1: FAST-SELLING CHAMPIONS */}
      {activeTab === 'fast_movers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Flame className="w-5 h-5 text-emerald-600 fill-emerald-600" />
                <span>Fast-Moving Revenue Champions (Top Velocity)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Items with highest sales volume, daily run rate, and frequent customer orders in the last 30–60 days.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const items = filteredFastMovers.map(i => ({
                    id: i.product.id,
                    qty: i.product.minStockAlert || 10
                  }));
                  handleSelectAllInTab(items);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                {filteredFastMovers.every(i => selectedItems[i.product.id]) ? 'Deselect All' : 'Select All Fast Movers'}
              </button>
            </div>
          </div>

          {filteredFastMovers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm font-semibold">
              No fast-selling items match your search. Make more sales invoices to build velocity tracking!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[850px]">
                <thead className="bg-slate-50 text-slate-700 text-xs font-black uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-10">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="py-3 px-3">Part Name & ID</th>
                    <th className="py-3 px-3">Brand & Type</th>
                    <th className="py-3 px-3">Current Stock</th>
                    <th className="py-3 px-3 text-emerald-800">30d Sales</th>
                    <th className="py-3 px-3 text-emerald-800">30d Revenue</th>
                    <th className="py-3 px-3">ADS Rate</th>
                    <th className="py-3 px-3">Days of Cover</th>
                    <th className="py-3 px-3">Stockout Risk</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredFastMovers.map(({ product: p, metrics: m }) => {
                    const isSelected = !!selectedItems[p.id];
                    const isRisk = m.isStockoutRisk;

                    return (
                      <tr 
                        key={p.id}
                        onClick={() => onOpenProductHistory(p)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isRisk ? 'bg-rose-50/40' : ''
                        }`}
                      >
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(e) => toggleSelection(p.id, p.minStockAlert || 10, e)}
                            onChange={() => {}}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-black text-slate-900">{p.name}</div>
                          <div className="text-xs font-mono font-bold text-slate-500">{p.internalId}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-xs font-bold text-slate-700">{p.brandName}</div>
                          <div className="text-[11px] text-slate-500">{p.typeName}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-md font-mono font-black text-xs ${
                            (p.stockQuantity || 0) <= (p.minStockAlert || 5)
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {p.stockQuantity} {p.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-black text-emerald-700">
                          {m.unitsLast30Days} pcs
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800 font-mono">
                          {formatPKR(m.revenueLast30Days)}
                        </td>
                        <td className="py-3 px-3 text-xs font-semibold text-slate-600 font-mono">
                          {m.dailySalesRate} pcs/day
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-xs font-extrabold ${
                            m.stockDaysOfCover <= 14 ? 'text-rose-600' : 'text-slate-700'
                          }`}>
                            {m.stockDaysOfCover < 1000 ? `~${Math.round(m.stockDaysOfCover)} days` : 'Adequate'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {isRisk ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                              Critical (&lt;14d)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              Healthy Buffer
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenCreatePO) {
                                onOpenCreatePO([{ productId: p.id, orderedQuantity: p.minStockAlert || 10 }]);
                              }
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <Truck className="w-3 h-3" />
                            <span>Reorder</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: DEAD STOCK AUDIT & LIQUIDATION DESK */}
      {activeTab === 'dead_stock' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <PackageX className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-black text-slate-900">
                  Dead Stock Liquidation & Working Capital Recovery Desk
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Items holding physical inventory with zero customer sales in 60+ days. Sorted by highest tied-up idle capital first.
              </p>
            </div>

            {/* Dormancy Window Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold overflow-x-auto">
              <button
                type="button"
                onClick={() => setDeadStockWindowFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  deadStockWindowFilter === 'all' ? 'bg-white text-purple-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All (60d+)
              </button>
              <button
                type="button"
                onClick={() => setDeadStockWindowFilter('90d')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  deadStockWindowFilter === '90d' ? 'bg-white text-purple-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                90+ Days
              </button>
              <button
                type="button"
                onClick={() => setDeadStockWindowFilter('180d')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  deadStockWindowFilter === '180d' ? 'bg-white text-purple-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                180+ Days
              </button>
              <button
                type="button"
                onClick={() => setDeadStockWindowFilter('never_sold')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  deadStockWindowFilter === 'never_sold' ? 'bg-white text-purple-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Never Sold
              </button>
            </div>
          </div>

          {filteredDeadStock.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm font-semibold">
              🎉 No dead stock found for this criteria! All inventory is moving actively.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[850px]">
                <thead className="bg-purple-50/60 text-purple-950 text-xs font-black uppercase tracking-wider border-b border-purple-100">
                  <tr>
                    <th className="py-3 px-3">Part Name & ID</th>
                    <th className="py-3 px-3">Brand & Category</th>
                    <th className="py-3 px-3">Location & Cabin</th>
                    <th className="py-3 px-3">Dead Qty</th>
                    <th className="py-3 px-3">Cost Rate</th>
                    <th className="py-3 px-3 text-purple-900 font-black">Tied-Up Capital (₨)</th>
                    <th className="py-3 px-3">Days Inactive</th>
                    <th className="py-3 px-3">Recommended Recovery Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredDeadStock.map(({ product: p, metrics: m }) => {
                    const daysInactive = m.daysSinceLastSale !== null ? `${m.daysSinceLastSale} days` : 'Never Sold';

                    return (
                      <tr 
                        key={p.id}
                        onClick={() => onOpenProductHistory(p)}
                        className="hover:bg-purple-50/30 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-3">
                          <div className="font-black text-slate-900">{p.name}</div>
                          <div className="text-xs font-mono font-bold text-slate-500">{p.internalId}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-xs font-bold text-slate-700">{p.brandName}</div>
                          <div className="text-[11px] text-slate-500">{p.typeName}</div>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-700">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span>{p.locationName}</span>
                          </div>
                          {p.cabinNumber && (
                            <div className="text-[11px] font-mono text-slate-500 ml-4.5">
                              Cabin: {p.cabinNumber}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-slate-800">
                          {p.stockQuantity} {p.unit}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-slate-700">
                          {formatPKR(p.costPrice)}
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-rose-700 text-sm">
                          {formatPKR(m.tiedUpCapital)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {daysInactive}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-xs font-semibold text-purple-900 bg-purple-50 border border-purple-200/80 p-1.5 rounded-lg max-w-[240px]">
                            {m.recommendation}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: SLOW-MOVING WATCHLIST */}
      {activeTab === 'slow_movers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black text-slate-900">
                  Slow-Moving Inventory Watchlist
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Items with sluggish sales pace or excessive stock days of coverage (&gt; 90–180 days). Risk of becoming dead stock.
              </p>
            </div>

            <div className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
              Total Capital: ₨ {formatPKR(velocitySummary.slowMoversTiedUpCapital)}
            </div>
          </div>

          {filteredSlowMovers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm font-semibold">
              No slow-moving items detected! Your inventory coverage is balanced.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[850px]">
                <thead className="bg-amber-50/60 text-amber-950 text-xs font-black uppercase tracking-wider border-b border-amber-100">
                  <tr>
                    <th className="py-3 px-3">Part Name & ID</th>
                    <th className="py-3 px-3">Brand & Category</th>
                    <th className="py-3 px-3">Current Stock</th>
                    <th className="py-3 px-3">Stock Days of Cover</th>
                    <th className="py-3 px-3 text-amber-900 font-black">Capital Tied (₨)</th>
                    <th className="py-3 px-3">Last Sold</th>
                    <th className="py-3 px-3">Procurement Advisory</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredSlowMovers.map(({ product: p, metrics: m }) => (
                    <tr 
                      key={p.id}
                      onClick={() => onOpenProductHistory(p)}
                      className="hover:bg-amber-50/30 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3">
                        <div className="font-black text-slate-900">{p.name}</div>
                        <div className="text-xs font-mono font-bold text-slate-500">{p.internalId}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-xs font-bold text-slate-700">{p.brandName}</div>
                        <div className="text-[11px] text-slate-500">{p.typeName}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-slate-800">
                        {p.stockQuantity} {p.unit}
                      </td>
                      <td className="py-3 px-3 font-bold text-amber-900">
                        {m.stockDaysOfCover < 1000 ? `~${Math.round(m.stockDaysOfCover)} days cover` : 'Over 1 year'}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {formatPKR(m.tiedUpCapital)}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600">
                        {m.daysSinceLastSale ? `${m.daysSinceLastSale} days ago` : 'Rare'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md block max-w-[260px]">
                          {m.recommendation}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 4: SMART ROP & EOQ INSIGHTS */}
      {activeTab === 'smart_rop' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">
                  AI Smart Reorder Points (ROP) & Economic Order Quantities (EOQ)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Statistical reorder thresholds dynamically adjusted based on 90-day demand run rate, lead time, and seasonal trends.
              </p>
            </div>

            <button
              onClick={() => exportAnalyticsToExcel(products, sales)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export ROP Excel</span>
            </button>
          </div>

          {filteredSmartInsights.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm font-semibold">
              All reorder thresholds are currently calibrated optimally!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSmartInsights.map(insight => (
                <div 
                  key={insight.product.id}
                  onClick={() => onOpenProductHistory(insight.product)}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer bg-slate-50/50 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-slate-900 truncate" title={insight.product.name}>
                        {insight.product.name}
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-500">
                        {insight.product.internalId} • {insight.product.brandName}
                      </div>
                    </div>

                    <input 
                      type="checkbox" 
                      checked={!!selectedItems[insight.product.id]}
                      onClick={(e) => toggleSelection(insight.product.id, insight.eoq, e)}
                      onChange={() => {}}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer shrink-0 mt-0.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Forecast ADS</div>
                      <div className="font-black text-slate-800 mt-0.5">
                        {insight.forecastedAds.toFixed(2)} pcs/day
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">EOQ / Cycle</div>
                      <div className="font-black text-slate-800 mt-0.5">
                        {insight.eoq} pcs / {insight.reorderCycle}d
                      </div>
                    </div>
                  </div>

                  {insight.seasonIndicator && (
                    <div className={`text-xs font-bold px-2 py-1 rounded-lg border text-center ${insight.seasonColor}`}>
                      {insight.seasonIndicator}
                    </div>
                  )}

                  <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Suggested Min Alert:
                    </div>
                    <div className="font-black text-emerald-800 text-sm font-mono">
                      {insight.suggestedROP} pcs
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 5: 12-MONTH SALES SEASONALITY GRAPH */}
      {activeTab === 'seasonality' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <span>12-Month Sales Seasonality Trend</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monthly revenue and unit volume generated across all product sales invoices.
              </p>
            </div>
          </div>

          <div className="h-80 pt-4">
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
      )}
    </div>
  );
};

