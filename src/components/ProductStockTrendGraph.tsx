import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  BarChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { 
  Product, 
  Purchase, 
  Sale, 
  CustomerReturn, 
  VendorReturn 
} from '../types';
import { formatPKR } from '../services/pricing';
import { 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Zap, 
  Clock, 
  AlertTriangle, 
  Box, 
  ShoppingBag, 
  Receipt, 
  Info, 
  BarChart3, 
  LineChart as LineChartIcon,
  Layers,
  ChevronDown,
  ChevronUp,
  Activity,
  Calendar
} from 'lucide-react';

export interface DailyStockPoint {
  dateStr: string;
  displayDate: string;
  fullDate: string;
  dayName: string;
  stockLevel: number;
  salesQty: number;
  salesAmount: number;
  purchaseQty: number;
  custReturnQty: number;
  vendorReturnQty: number;
  netChange: number;
  isToday: boolean;
  minStockAlert: number;
}

interface ProductStockTrendGraphProps {
  product: Product;
  purchases: Purchase[];
  sales: Sale[];
  customerReturns?: CustomerReturn[];
  vendorReturns?: VendorReturn[];
  className?: string;
}

export const ProductStockTrendGraph: React.FC<ProductStockTrendGraphProps> = ({
  product,
  purchases,
  sales,
  customerReturns = [],
  vendorReturns = [],
  className = '',
}) => {
  const [chartMode, setChartMode] = useState<'composed' | 'stock' | 'sales'>('composed');
  const [timeRange, setTimeRange] = useState<14 | 30 | 60>(30);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Matching helper: check if an item references this product
  const isItemMatch = (it: { productId?: string; internalId?: string; productName?: string }) => {
    if (!product) return false;
    if (it.productId && product.id && it.productId === product.id) return true;
    if (
      it.internalId && 
      product.internalId && 
      it.internalId.trim().toLowerCase() === product.internalId.trim().toLowerCase()
    ) {
      return true;
    }
    if (
      it.productName && 
      product.name && 
      it.productName.trim().toLowerCase() === product.name.trim().toLowerCase()
    ) {
      return true;
    }
    return false;
  };

  // Helper to format date key YYYY-MM-DD
  const formatDateKey = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Parse transaction date into YYYY-MM-DD
  const parseTxDateKey = (dateVal: string | Date | undefined): string => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return formatDateKey(d);
  };

  // Calculate day-by-day trend data over the selected time range
  const { trendData, demandAnalytics } = useMemo(() => {
    const numDays = timeRange;
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // 1. Build map of transactions aggregated by date
    const dailyTxMap = new Map<string, {
      salesQty: number;
      salesAmount: number;
      purchaseQty: number;
      custReturnQty: number;
      vendorReturnQty: number;
    }>();

    // Group purchases
    for (const p of purchases) {
      const matched = (p.items || []).filter(isItemMatch);
      if (matched.length === 0) continue;
      const dateKey = parseTxDateKey(p.date || p.createdAt);
      if (!dateKey) continue;

      const current = dailyTxMap.get(dateKey) || { salesQty: 0, salesAmount: 0, purchaseQty: 0, custReturnQty: 0, vendorReturnQty: 0 };
      for (const it of matched) {
        current.purchaseQty += Number(it.quantity) || 0;
      }
      dailyTxMap.set(dateKey, current);
    }

    // Group sales
    for (const s of sales) {
      const matched = (s.items || []).filter(isItemMatch);
      if (matched.length === 0) continue;
      const dateKey = parseTxDateKey(s.date || s.createdAt);
      if (!dateKey) continue;

      const current = dailyTxMap.get(dateKey) || { salesQty: 0, salesAmount: 0, purchaseQty: 0, custReturnQty: 0, vendorReturnQty: 0 };
      for (const it of matched) {
        const q = Number(it.quantity) || 0;
        const rate = Number(it.unitPrice) || 0;
        current.salesQty += q;
        current.salesAmount += q * rate;
      }
      dailyTxMap.set(dateKey, current);
    }

    // Group customer returns
    for (const cr of customerReturns) {
      const matched = (cr.items || []).filter(isItemMatch);
      if (matched.length === 0) continue;
      const dateKey = parseTxDateKey(cr.date || cr.createdAt);
      if (!dateKey) continue;

      const current = dailyTxMap.get(dateKey) || { salesQty: 0, salesAmount: 0, purchaseQty: 0, custReturnQty: 0, vendorReturnQty: 0 };
      for (const it of matched) {
        current.custReturnQty += Number(it.quantity) || 0;
      }
      dailyTxMap.set(dateKey, current);
    }

    // Group vendor returns
    for (const vr of vendorReturns) {
      const matched = (vr.items || []).filter(isItemMatch);
      if (matched.length === 0) continue;
      const dateKey = parseTxDateKey(vr.date || vr.createdAt);
      if (!dateKey) continue;

      const current = dailyTxMap.get(dateKey) || { salesQty: 0, salesAmount: 0, purchaseQty: 0, custReturnQty: 0, vendorReturnQty: 0 };
      for (const it of matched) {
        current.vendorReturnQty += Number(it.quantity) || 0;
      }
      dailyTxMap.set(dateKey, current);
    }

    // 2. Generate calendar days from (today - (numDays - 1)) to today
    const rawPoints: Array<{
      date: Date;
      dateStr: string;
      displayDate: string;
      fullDate: string;
      dayName: string;
      salesQty: number;
      salesAmount: number;
      purchaseQty: number;
      custReturnQty: number;
      vendorReturnQty: number;
      netChange: number;
      isToday: boolean;
      stockLevel: number;
    }> = [];

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = formatDateKey(d);
      const tx = dailyTxMap.get(dateStr) || { salesQty: 0, salesAmount: 0, purchaseQty: 0, custReturnQty: 0, vendorReturnQty: 0 };
      
      const netChange = (tx.purchaseQty + tx.custReturnQty) - (tx.salesQty + tx.vendorReturnQty);

      rawPoints.push({
        date: d,
        dateStr,
        displayDate: d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' }),
        fullDate: d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }),
        dayName: d.toLocaleDateString('en-PK', { weekday: 'short' }),
        salesQty: tx.salesQty,
        salesAmount: tx.salesAmount,
        purchaseQty: tx.purchaseQty,
        custReturnQty: tx.custReturnQty,
        vendorReturnQty: tx.vendorReturnQty,
        netChange,
        isToday: i === 0,
        stockLevel: 0, // Will compute backwards
      });
    }

    // 3. Reconstruct historical stock level backwards starting from current product stock today
    const currentStock = Number(product.stockQuantity) || 0;
    const minStock = Number(product.minStockAlert) || 5;

    // The last point (today) ends with currentStock
    let runningStock = currentStock;
    if (rawPoints.length > 0) {
      rawPoints[rawPoints.length - 1].stockLevel = runningStock;

      for (let i = rawPoints.length - 2; i >= 0; i--) {
        const nextPoint = rawPoints[i + 1];
        // Stock at end of day i is: (Stock at end of day i+1) - (Net movement on day i+1)
        runningStock = runningStock - nextPoint.netChange;
        rawPoints[i].stockLevel = Math.max(0, runningStock);
      }
    }

    const points: DailyStockPoint[] = rawPoints.map(p => ({
      dateStr: p.dateStr,
      displayDate: p.displayDate,
      fullDate: p.fullDate,
      dayName: p.dayName,
      stockLevel: p.stockLevel,
      salesQty: p.salesQty,
      salesAmount: p.salesAmount,
      purchaseQty: p.purchaseQty,
      custReturnQty: p.custReturnQty,
      vendorReturnQty: p.vendorReturnQty,
      netChange: p.netChange,
      isToday: p.isToday,
      minStockAlert: minStock,
    }));

    // 4. Analytics: Demand Velocity, Peak Day, Runway & Classification
    let totalSalesQty = 0;
    let totalSalesRevenue = 0;
    let totalPurchasedQty = 0;
    let daysWithSales = 0;
    let peakDay: DailyStockPoint | null = null;
    let maxSingleDaySales = 0;

    for (const pt of points) {
      totalSalesQty += pt.salesQty;
      totalSalesRevenue += pt.salesAmount;
      totalPurchasedQty += pt.purchaseQty;

      if (pt.salesQty > 0) {
        daysWithSales += 1;
        if (pt.salesQty > maxSingleDaySales) {
          maxSingleDaySales = pt.salesQty;
          peakDay = pt;
        }
      }
    }

    // Daily Sales Velocity (units per day)
    const dailyVelocity = totalSalesQty / numDays;
    
    // Estimated Runway (days of stock remaining based on daily demand velocity)
    const runwayDays = dailyVelocity > 0 ? Math.round(currentStock / dailyVelocity) : null;

    // Stock Turnover Rate in this window
    const avgStock = points.reduce((sum, p) => sum + p.stockLevel, 0) / (points.length || 1);
    const turnoverRate = avgStock > 0 ? (totalSalesQty / avgStock) * 100 : 0;

    // Demand Classification
    let demandLevel: 'high' | 'moderate' | 'low' = 'low';
    let demandTitle = 'Slow Mover / Stable';
    let demandDesc = 'Minimal sales activity over this period. Stock levels remain stable.';
    let demandColor = 'text-slate-700 bg-slate-100 border-slate-200';

    if (totalSalesQty >= 15 || (dailyVelocity >= 0.5 && totalSalesQty >= 5) || (runwayDays !== null && runwayDays <= 14 && totalSalesQty >= 4)) {
      demandLevel = 'high';
      demandTitle = 'High Demand / Fast Mover';
      demandDesc = 'Rapid inventory depletion detected. High sales velocity requires active replenishment monitoring.';
      demandColor = 'text-rose-700 bg-rose-50 border-rose-200';
    } else if (totalSalesQty >= 3 || dailyVelocity >= 0.1) {
      demandLevel = 'moderate';
      demandTitle = 'Steady / Moderate Demand';
      demandDesc = 'Consistent sales flow. Stock levels are tracking normally against demand.';
      demandColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }

    // Stockout Alert
    const isLowStock = currentStock <= minStock;
    const isImminentStockout = (runwayDays !== null && runwayDays <= 7 && totalSalesQty > 0) || isLowStock;

    // Stock trend direction: compare beginning of period stock vs end of period stock
    const startStock = points[0]?.stockLevel ?? currentStock;
    const stockNetDelta = currentStock - startStock;
    const isStockDepleting = stockNetDelta < 0;

    return {
      trendData: points,
      demandAnalytics: {
        totalSalesQty,
        totalSalesRevenue,
        totalPurchasedQty,
        daysWithSales,
        dailyVelocity,
        runwayDays,
        turnoverRate,
        peakDay,
        maxSingleDaySales,
        demandLevel,
        demandTitle,
        demandDesc,
        demandColor,
        isLowStock,
        isImminentStockout,
        startStock,
        currentStock,
        minStock,
        stockNetDelta,
        isStockDepleting,
        numDays,
      },
    };
  }, [product, purchases, sales, customerReturns, vendorReturns, timeRange]);

  // Max stock for dynamic Y-axis ceiling
  const yAxisMax = useMemo(() => {
    let max = Math.max(
      demandAnalytics.currentStock,
      demandAnalytics.minStock * 1.5,
      10
    );
    for (const p of trendData) {
      if (p.stockLevel > max) max = p.stockLevel;
      if (p.salesQty > max) max = p.salesQty;
    }
    return Math.ceil(max * 1.15);
  }, [trendData, demandAnalytics]);

  // Custom rich Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload as DailyStockPoint;
    if (!data) return null;

    const isBelowMin = data.stockLevel <= data.minStockAlert;

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 text-xs min-w-[220px] select-none animate-in fade-in zoom-in-95 duration-100">
        {/* Date header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-red-400" />
            <span>{data.fullDate}</span>
          </div>
          {data.isToday && (
            <span className="px-1.5 py-0.2 bg-red-600 text-white text-[9px] font-black uppercase tracking-wider rounded">
              Today
            </span>
          )}
        </div>

        {/* Stock Level Metric */}
        <div className="flex items-center justify-between py-1 bg-slate-800/80 px-2.5 rounded-lg border border-slate-700 mb-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-300">
            <Box className="w-3.5 h-3.5 text-indigo-400" />
            <span>Stock Balance:</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`font-mono font-black text-sm ${isBelowMin ? 'text-rose-400' : 'text-emerald-400'}`}>
              {data.stockLevel} {product.unit}
            </span>
            {isBelowMin && (
              <span className="px-1 py-0.2 bg-rose-500/30 text-rose-300 text-[9px] font-bold rounded" title="Below Minimum Alert Level">
                Low
              </span>
            )}
          </div>
        </div>

        {/* Breakdown for this day */}
        <div className="space-y-1 text-[11px]">
          {/* Sales on this day */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <Receipt className="w-3 h-3 text-emerald-400" />
              Units Sold (Demand):
            </span>
            <span className="font-mono font-bold text-emerald-300">
              {data.salesQty > 0 ? `-${data.salesQty} ${product.unit}` : '0'}
              {data.salesAmount > 0 && ` (${formatPKR(data.salesAmount)})`}
            </span>
          </div>

          {/* Restocks on this day */}
          {data.purchaseQty > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <ShoppingBag className="w-3 h-3 text-indigo-400" />
                Purchased / Restock:
              </span>
              <span className="font-mono font-bold text-indigo-300">
                +{data.purchaseQty} {product.unit}
              </span>
            </div>
          )}

          {/* Returns */}
          {(data.custReturnQty > 0 || data.vendorReturnQty > 0) && (
            <div className="flex items-center justify-between text-amber-300">
              <span className="text-slate-400">Returns:</span>
              <span className="font-mono font-bold">
                {data.custReturnQty > 0 && `+${data.custReturnQty} cust `}
                {data.vendorReturnQty > 0 && `-${data.vendorReturnQty} vendor`}
              </span>
            </div>
          )}

          {/* Net Change */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-1.5 mt-1 font-semibold">
            <span className="text-slate-400">Daily Net Movement:</span>
            <span className={`font-mono font-black ${
              data.netChange > 0 ? 'text-indigo-400' : data.netChange < 0 ? 'text-rose-400' : 'text-slate-400'
            }`}>
              {data.netChange > 0 ? `+${data.netChange}` : data.netChange} {product.unit}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-2xl sm:rounded-3xl border border-slate-800 p-3.5 sm:p-5 shadow-xl select-none ${className}`}>
      {/* 1. Header with Controls & High-Demand Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-9 h-9 rounded-xl bg-red-600/90 text-white flex items-center justify-center font-bold shadow-md border border-red-500 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-1.5">
                <span>30-Day Stock Level & Demand Trend</span>
              </h3>

              {/* Demand Status Pill */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border shadow-2xs ${demandAnalytics.demandColor}`}>
                {demandAnalytics.demandLevel === 'high' && <Flame className="w-3.5 h-3.5 fill-current animate-pulse text-rose-600" />}
                {demandAnalytics.demandLevel === 'moderate' && <Zap className="w-3.5 h-3.5 fill-current text-emerald-600" />}
                {demandAnalytics.demandLevel === 'low' && <Clock className="w-3.5 h-3.5 text-slate-500" />}
                <span>{demandAnalytics.demandTitle}</span>
              </span>

              {/* Imminent Stockout Alert */}
              {demandAnalytics.isImminentStockout && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>Stockout Risk</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Historical stock curve & daily customer demand velocity over time
            </p>
          </div>
        </div>

        {/* View & Timeframe Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe Chips */}
          <div className="flex bg-slate-800/80 p-0.5 rounded-xl border border-slate-700 text-xs font-bold">
            {([14, 30, 60] as const).map(days => (
              <button
                key={days}
                type="button"
                onClick={() => setTimeRange(days)}
                className={`px-2.5 py-1 rounded-lg transition-all text-[11px] cursor-pointer ${
                  timeRange === days
                    ? 'bg-red-600 text-white shadow-2xs font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Analyze ${days} days`}
              >
                {days}D
              </button>
            ))}
          </div>

          {/* Chart Mode Tabs */}
          <div className="flex bg-slate-800/80 p-0.5 rounded-xl border border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setChartMode('composed')}
              className={`px-2.5 py-1 rounded-lg transition-all text-[11px] flex items-center gap-1 cursor-pointer ${
                chartMode === 'composed'
                  ? 'bg-white text-slate-900 font-black shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Combined Stock Trend & Sales Velocity"
            >
              <Layers className="w-3 h-3" />
              <span className="hidden sm:inline">Combined</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('stock')}
              className={`px-2.5 py-1 rounded-lg transition-all text-[11px] flex items-center gap-1 cursor-pointer ${
                chartMode === 'stock'
                  ? 'bg-indigo-600 text-white font-black shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Stock Level Curve"
            >
              <LineChartIcon className="w-3 h-3" />
              <span className="hidden sm:inline">Stock</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('sales')}
              className={`px-2.5 py-1 rounded-lg transition-all text-[11px] flex items-center gap-1 cursor-pointer ${
                chartMode === 'sales'
                  ? 'bg-emerald-600 text-white font-black shadow-2xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Daily Sales Outflow Bars"
            >
              <BarChart3 className="w-3 h-3" />
              <span className="hidden sm:inline">Sales</span>
            </button>
          </div>

          {/* Collapse/Expand button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title={isExpanded ? 'Minimize Graph' : 'Expand Graph'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Key Demand Metrics Summary Row */}
      {isExpanded && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 my-3">
          {/* Stat 1: 30-Day Sales Demand */}
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/80">
            <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
              <span>{timeRange}-Day Demand</span>
              <Receipt className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
                {demandAnalytics.totalSalesQty} {product.unit}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                ({demandAnalytics.daysWithSales} active days)
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
              Rev: {formatPKR(demandAnalytics.totalSalesRevenue)}
            </div>
          </div>

          {/* Stat 2: Daily Sales Velocity */}
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/80">
            <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
              <span>Daily Velocity</span>
              <TrendingUp className="w-3 h-3 text-rose-400" />
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-black font-mono text-rose-400">
                {demandAnalytics.dailyVelocity.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400">
                units/day
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
              {demandAnalytics.peakDay 
                ? `Peak: ${demandAnalytics.maxSingleDaySales} pcs (${demandAnalytics.peakDay.displayDate})`
                : 'No sales spikes'}
            </div>
          </div>

          {/* Stat 3: Stock Runway (Days left at current velocity) */}
          <div className={`p-2.5 rounded-xl border ${
            demandAnalytics.isImminentStockout 
              ? 'bg-amber-950/40 border-amber-700/60 text-amber-200' 
              : 'bg-slate-800/60 border-slate-700/80 text-slate-300'
          }`}>
            <div className="text-[11px] font-bold flex items-center justify-between">
              <span>Est. Stock Runway</span>
              {demandAnalytics.isImminentStockout ? (
                <AlertTriangle className="w-3 h-3 text-amber-400" />
              ) : (
                <Clock className="w-3 h-3 text-indigo-400" />
              )}
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className={`text-base sm:text-lg font-black font-mono ${
                demandAnalytics.isImminentStockout ? 'text-amber-400' : 'text-indigo-300'
              }`}>
                {demandAnalytics.runwayDays !== null ? `${demandAnalytics.runwayDays} Days` : '∞ (Stable)'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
              {demandAnalytics.runwayDays !== null && demandAnalytics.runwayDays <= 14
                ? '⚠️ Consider reordering soon'
                : `Current Stock: ${demandAnalytics.currentStock} ${product.unit}`}
            </div>
          </div>

          {/* Stat 4: Restock / Stock Movement Delta */}
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/80">
            <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
              <span>Net Movement</span>
              {demandAnalytics.stockNetDelta >= 0 ? (
                <TrendingUp className="w-3 h-3 text-indigo-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-amber-400" />
              )}
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className={`text-base sm:text-lg font-black font-mono ${
                demandAnalytics.stockNetDelta >= 0 ? 'text-indigo-400' : 'text-amber-400'
              }`}>
                {demandAnalytics.stockNetDelta >= 0 ? `+${demandAnalytics.stockNetDelta}` : demandAnalytics.stockNetDelta} {product.unit}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
              In: +{demandAnalytics.totalPurchasedQty} | Out: -{demandAnalytics.totalSalesQty}
            </div>
          </div>
        </div>
      )}

      {/* 3. Recharts Graph Canvas */}
      {isExpanded && (
        <div className="mt-2 pt-2">
          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'composed' ? (
                <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="stockLevelGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="salesBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />
                  
                  <XAxis 
                    dataKey="displayDate" 
                    stroke="#94a3b8" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                    interval={Math.ceil(timeRange / 10)}
                  />

                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10}
                    domain={[0, yAxisMax]}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                  />

                  <Tooltip content={<CustomTooltip />} />

                  {/* Reference Line for Minimum Stock Alert Level */}
                  <ReferenceLine 
                    y={demandAnalytics.minStock} 
                    stroke="#f43f5e" 
                    strokeDasharray="4 4" 
                    strokeWidth={1.5}
                    label={{
                      value: `Min Stock (${demandAnalytics.minStock})`,
                      fill: '#fb7185',
                      fontSize: 10,
                      position: 'top',
                    }}
                  />

                  {/* Daily Sales Bar (Customer Demand Outflow) */}
                  <Bar 
                    dataKey="salesQty" 
                    name="Units Sold (Demand)" 
                    fill="url(#salesBarGradient)" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={20}
                  />

                  {/* Stock Level Area Trend */}
                  <Area
                    type="monotone"
                    dataKey="stockLevel"
                    name="Stock Level"
                    stroke="#818cf8"
                    strokeWidth={2.5}
                    fill="url(#stockLevelGradient)"
                    dot={{ fill: '#818cf8', r: 2 }}
                    activeDot={{ r: 5, fill: '#ffffff', stroke: '#6366f1', strokeWidth: 2 }}
                  />
                </ComposedChart>
              ) : chartMode === 'stock' ? (
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pureStockGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />
                  
                  <XAxis 
                    dataKey="displayDate" 
                    stroke="#94a3b8" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                    interval={Math.ceil(timeRange / 10)}
                  />

                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10}
                    domain={[0, yAxisMax]}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                  />

                  <Tooltip content={<CustomTooltip />} />

                  <ReferenceLine 
                    y={demandAnalytics.minStock} 
                    stroke="#f43f5e" 
                    strokeDasharray="4 4" 
                    strokeWidth={1.5}
                    label={{
                      value: `Min Stock (${demandAnalytics.minStock})`,
                      fill: '#fb7185',
                      fontSize: 10,
                      position: 'top',
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="stockLevel"
                    name="Stock Level"
                    stroke="#818cf8"
                    strokeWidth={3}
                    fill="url(#pureStockGradient)"
                    dot={{ fill: '#6366f1', r: 2 }}
                    activeDot={{ r: 6, fill: '#ffffff', stroke: '#4f46e5', strokeWidth: 2 }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pureSalesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#047857" stopOpacity={0.65} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />
                  
                  <XAxis 
                    dataKey="displayDate" 
                    stroke="#94a3b8" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                    interval={Math.ceil(timeRange / 10)}
                  />

                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                  />

                  <Tooltip content={<CustomTooltip />} />

                  <Bar 
                    dataKey="salesQty" 
                    name="Units Sold (Demand)" 
                    fill="url(#pureSalesGradient)" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* 4. Chart Legend & Insight Explanation Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-400 border-t border-slate-800/80">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />
                <strong className="text-slate-300">Stock Curve</strong> ({product.unit})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                <strong className="text-slate-300">Customer Demand</strong> (Daily Sales)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-rose-400 inline-block" />
                <strong className="text-rose-300">Min Alert Threshold</strong> ({demandAnalytics.minStock} {product.unit})
              </span>
            </div>

            {/* Smart Demand Recommendation */}
            <div className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>{demandAnalytics.demandDesc}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
