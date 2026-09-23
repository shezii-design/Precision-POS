import { calculateProductStockValue, calculateCustomerNetBalance, calculateVendorBalance } from "../services/storage";
import { calculateSaleCogs, calculateSaleItemCogs } from "../services/sales";
import { addFinancial, roundCurrency } from "../services/financialMath";
import { calculateUnifiedMetrics, buildProductLookupMap, calculateBalanceSheetSnapshot } from "../services/unifiedFinancialMetrics";
import React, { useState, useMemo } from 'react';
import { 
  Product, 
  Sale, 
  Purchase, 
  PurchaseOrder, 
  Customer, 
  Vendor, 
  CustomerReturn, 
  VendorReturn, 
  Demand, 
  CustomerLedgerEntry, 
  VendorLedgerEntry, 
  Expense,
  AppWorkspaceView 
} from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  ShoppingBag, 
  Package, 
  Users, 
  Building2, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Clock, 
  ChevronRight, 
  Plus, 
  Filter, 
  RotateCcw, 
  Truck, 
  PackageSearch, 
  Receipt, 
  CheckCircle2, 
  Layers, 
  Wallet, 
  FileText,
  Activity,
  ArrowRight,
  ExternalLink,
  Search,
  Zap,
  BarChart3,
  UserCheck,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardPageProps {
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  purchaseOrders: PurchaseOrder[];
  customers: Customer[];
  vendors: Vendor[];
  customerReturns: CustomerReturn[];
  vendorReturns: VendorReturn[];
  demands: Demand[];
  customerLedger: CustomerLedgerEntry[];
  vendorLedger: VendorLedgerEntry[];
  expenses: Expense[];
  onOpenNewSale?: () => void;
  onOpenNewPurchase?: (vendorId?: string) => void;
  onOpenCreatePO?: () => void;
  onOpenCreateDemand?: () => void;
  onOpenAddProduct?: () => void;
  onOpenAddExpense?: () => void;
  onGoToView: (view: AppWorkspaceView) => void;
  onViewInvoice: (sale: Sale) => void;
  onViewPurchase: (purchase: Purchase) => void;
  onViewCustomerReturn?: (ret: CustomerReturn) => void;
  onViewVendorReturn?: (ret: VendorReturn) => void;
  onSelectCustomer?: (customer: Customer) => void;
  onSelectVendor?: (vendor: Vendor) => void;
}

type DashboardTimeframe = 
  | 'today' 
  | 'yesterday' 
  | 'this_week' 
  | 'this_month' 
  | 'last_month' 
  | 'last_30_days' 
  | 'last_90_days' 
  | 'this_year' 
  | 'all_time' 
  | 'custom';

function formatPKR(amount: number): string {
  const rounded = Math.round(amount || 0);
  return `₨ ${rounded.toLocaleString('en-PK')}`;
}

function formatPKRShort(val: number): string {
  const num = val || 0;
  if (Math.abs(num) >= 10000000) return `₨ ${(num / 10000000).toFixed(2)} Cr`;
  if (Math.abs(num) >= 1000000) return `₨ ${(num / 1000000).toFixed(2)}M`;
  if (Math.abs(num) >= 1000) return `₨ ${(num / 1000).toFixed(1)}k`;
  return `₨ ${Math.round(num).toLocaleString('en-PK')}`;
}

// ---------------------------------------------------------------------------
// Interactive Chart Tooltips with Precise Revenue & Metric Figures
// ---------------------------------------------------------------------------

const MonthlySalesCustomTooltip: React.FC<any> = ({ active, payload, peakMonthKey, total6MoRevenue }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const isPeak = (peakMonthKey === data.key || data.isPeak) && data.revenue > 0;
  const marginPct = data.profitMargin ?? (data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0);
  const avgOrder = data.avgTicket ?? (data.invoicesCount > 0 ? Math.round(data.revenue / data.invoicesCount) : 0);
  const revShare = total6MoRevenue > 0 ? Math.round((data.revenue / total6MoRevenue) * 100) : 0;

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-white min-w-[290px] max-w-[340px] space-y-3 pointer-events-none transition-all z-50">
      {/* Tooltip Header: Specific Month Name & Badges */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-700/80">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Monthly Performance
          </span>
          <h4 className="text-sm font-black text-white flex items-center gap-1.5 mt-0.5">
            <span>🗓️ {data.fullMonthName || data.monthName}</span>
          </h4>
        </div>
        {isPeak ? (
          <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Peak Month
          </span>
        ) : (
          <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-lg">
            {data.invoicesCount} {data.invoicesCount === 1 ? 'Invoice' : 'Invoices'}
          </span>
        )}
      </div>

      {/* Primary Highlight: Precise Revenue Figure */}
      <div className="bg-slate-800/90 border border-slate-700/70 rounded-xl p-3">
        <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
          <span className="flex items-center gap-1.5 font-bold text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
            Precise Net Revenue
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Net of Returns</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-black text-white font-mono tracking-tight">
            {formatPKR(data.revenue)}
          </span>
          <span className="text-xs font-bold text-red-400 font-mono">
            {formatPKRShort(data.revenue)}
          </span>
        </div>
      </div>

      {/* Comprehensive Revenue & Profit Breakdown Grid */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-slate-800/60 rounded-xl p-2 border border-slate-700/50">
          <span className="text-slate-400 block text-[10px] font-semibold">Gross Billed</span>
          <span className="font-mono font-bold text-slate-100 mt-0.5 block truncate">
            {formatPKR(data.grossRevenue)}
          </span>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-2 border border-slate-700/50">
          <span className="text-slate-400 block text-[10px] font-semibold">Refunds / Returns</span>
          <span className="font-mono font-bold text-rose-300 mt-0.5 block truncate">
            {data.returns > 0 ? `-${formatPKR(data.returns)}` : '₨ 0'}
          </span>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-2 border border-slate-700/50">
          <span className="text-slate-400 block text-[10px] font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Gross Profit
          </span>
          <span className="font-mono font-bold text-emerald-400 mt-0.5 block truncate">
            {formatPKR(data.profit)}
          </span>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-2 border border-slate-700/50">
          <span className="text-slate-400 block text-[10px] font-semibold">Profit Margin</span>
          <span className="font-mono font-bold text-emerald-300 mt-0.5 block">
            {Number(marginPct).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Tooltip Footer Metrics */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <span>Avg Ticket: <strong className="text-slate-200 font-mono">{formatPKR(avgOrder)}</strong></span>
        <span>Share: <strong className="text-slate-200 font-mono">{revShare}% of 6M</strong></span>
      </div>
    </div>
  );
};

const DailyTrajectoryRevenueTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const margin = data.sales > 0 ? Math.round(((data.grossProfit || (data.sales - (data.cogs || 0))) / data.sales) * 100) : 0;

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-3.5 text-white min-w-[270px] space-y-2.5 pointer-events-none z-50">
      <div className="flex items-center justify-between pb-2 border-b border-slate-700/80">
        <span className="text-xs font-black text-slate-200">{data.displayDate || data.date || label}</span>
        <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold">
          Daily Ledger
        </span>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Precise Net Sales:
          </span>
          <strong className="font-mono text-emerald-400 font-bold">{formatPKR(data.sales)}</strong>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-300 flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            Cost Basis (COGS):
          </span>
          <strong className="font-mono text-slate-300 font-bold">{formatPKR(data.cogs)}</strong>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
          <span className="text-slate-300 flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            Gross Profit:
          </span>
          <div className="text-right">
            <span className="font-mono text-red-400 font-bold block">{formatPKR(data.grossProfit)}</span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold block">{margin}% Margin</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DailyTrajectoryCashflowTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const netDiff = (data.sales || 0) - (data.purchases || 0);

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-3.5 text-white min-w-[270px] space-y-2.5 pointer-events-none z-50">
      <div className="flex items-center justify-between pb-2 border-b border-slate-700/80">
        <span className="text-xs font-black text-slate-200">{data.displayDate || data.date || label}</span>
        <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold">
          Cash In vs Out
        </span>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Sales Inflow:
          </span>
          <strong className="font-mono text-emerald-400 font-bold">{formatPKR(data.sales)}</strong>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-300 flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Purchases Outflow:
          </span>
          <strong className="font-mono text-amber-400 font-bold">{formatPKR(data.purchases)}</strong>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
          <span className="text-slate-300 font-medium">Net Trading Flow:</span>
          <strong className={`font-mono font-bold ${netDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {netDiff >= 0 ? '+' : ''}{formatPKR(netDiff)}
          </strong>
        </div>
      </div>
    </div>
  );
};

const CategoryPieCustomTooltip: React.FC<any> = ({ active, payload, totalRevenue }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const pct = totalRevenue > 0 ? ((data.revenue / totalRevenue) * 100).toFixed(1) : '0';

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-3 text-white min-w-[200px] pointer-events-none z-50">
      <div className="flex items-center gap-2 pb-1.5 border-b border-slate-700/80">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: data.color }} />
        <span className="text-xs font-black text-slate-100 truncate">{data.name}</span>
      </div>
      <div className="mt-2 space-y-1">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-slate-400 font-medium">Precise Revenue:</span>
          <span className="font-mono font-bold text-white">{formatPKR(data.revenue)}</span>
        </div>
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-slate-400 font-medium">Catalog Share:</span>
          <span className="font-mono font-bold text-emerald-400">{pct}%</span>
        </div>
      </div>
    </div>
  );
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  products,
  sales,
  purchases,
  purchaseOrders,
  customers,
  vendors,
  customerReturns,
  vendorReturns,
  demands,
  customerLedger,
  vendorLedger,
  expenses,
  onOpenNewSale,
  onOpenNewPurchase,
  onOpenCreatePO,
  onOpenCreateDemand,
  onOpenAddProduct,
  onOpenAddExpense,
  onGoToView,
  onViewInvoice,
  onViewPurchase,
  onViewCustomerReturn,
  onViewVendorReturn,
  onSelectCustomer,
  onSelectVendor,
}) => {
  const [timeframe, setTimeframe] = useState<DashboardTimeframe>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [chartMetric, setChartMetric] = useState<'revenue_profit' | 'sales_purchases'>('revenue_profit');
  const [activeTab, setActiveTab] = useState<'overview' | 'sales_analytics' | 'inventory_health' | 'urgent_actions'>('overview');

  // Calculate Date Boundaries
  const dateRange = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    let start = new Date(now);
    let end = new Date(now);
    let label = 'This Month';

    switch (timeframe) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        label = 'Today';
        break;
      case 'yesterday': {
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        start = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0);
        end = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59);
        label = 'Yesterday';
        break;
      }
      case 'this_week': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
        start = new Date(now.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        label = 'This Week';
        break;
      }
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        label = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        label = `${start.toLocaleString('default', { month: 'long' })} ${start.getFullYear()}`;
        break;
      case 'last_30_days':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        label = 'Last 30 Days';
        break;
      case 'last_90_days':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        label = 'Last 90 Days';
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        label = `Year ${now.getFullYear()}`;
        break;
      case 'all_time':
        start = new Date(2020, 0, 1, 0, 0, 0);
        end = new Date(2035, 11, 31, 23, 59, 59);
        label = 'All Time History';
        break;
      case 'custom':
        if (customStartDate) start = new Date(`${customStartDate}T00:00:00`);
        else start = new Date(2020, 0, 1);
        if (customEndDate) end = new Date(`${customEndDate}T23:59:59`);
        else end = new Date();
        label = `${customStartDate || 'Start'} to ${customEndDate || 'End'}`;
        break;
    }

    return {
      start,
      end,
      startStr: start.toISOString().split('T')[0],
      endStr: end.toISOString().split('T')[0],
      label,
    };
  }, [timeframe, customStartDate, customEndDate]);

  // Helper date checker
  const isDateInRange = (dateStr?: string) => {
    if (!dateStr) return false;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      return d >= dateRange.start && d <= dateRange.end;
    } catch {
      return false;
    }
  };

  // 1. Filter Transactions within Selected Period
  const periodSales = useMemo(() => sales.filter(s => isDateInRange(s.date || s.createdAt)), [sales, dateRange]);
  const periodPurchases = useMemo(() => purchases.filter(p => isDateInRange(p.date || p.createdAt)), [purchases, dateRange]);
  const periodCustomerReturns = useMemo(() => customerReturns.filter(r => isDateInRange(r.date || r.createdAt)), [customerReturns, dateRange]);
  const periodVendorReturns = useMemo(() => vendorReturns.filter(r => isDateInRange(r.date || r.createdAt)), [vendorReturns, dateRange]);
  const periodExpenses = useMemo(() => expenses.filter(e => isDateInRange(e.date || e.createdAt)), [expenses, dateRange]);

  // 2. Compute Core Financial Metrics via Unified Financial Metrics Engine
  const financials = useMemo(() => {
    const metrics = calculateUnifiedMetrics({
      sales: periodSales,
      customerReturns: periodCustomerReturns,
      vendorReturns: periodVendorReturns,
      purchases: periodPurchases,
      expenses: periodExpenses,
      products,
    });

    return {
      grossSales: metrics.grossRevenue,
      salesDiscounts: metrics.salesDiscounts,
      cashCollected: metrics.totalCashReceived,
      creditSales: metrics.totalCreditOutstanding,
      itemsSoldUnits: metrics.totalItemsSold,
      salesReturnsAmount: metrics.salesReturnsAmount,
      restockFeesCollected: metrics.restockFeesCollected,
      netSales: metrics.netRevenue,
      fifoCOGS: metrics.fifoCOGS,
      totalCOGS: metrics.totalCOGS,
      vendorReturnsAmount: metrics.vendorReturnsAmount,
      grossProfit: metrics.grossProfit,
      grossMarginPercent: metrics.grossMarginPercent,
      totalExpenses: metrics.totalOperatingExpenses,
      netProfit: metrics.netIncome,
      netMarginPercent: metrics.netProfitMarginPercent,
      purchasesSpend: metrics.purchasesSpend,
      purchasesPaid: metrics.purchasesPaid,
      itemsPurchasedUnits: metrics.itemsPurchasedUnits,
      salesCount: metrics.salesCount,
      purchasesCount: metrics.purchasesCount,
      customerReturnsCount: metrics.customerReturnsCount,
      expensesCount: metrics.expensesCount,
    };
  }, [periodSales, periodPurchases, periodCustomerReturns, periodVendorReturns, periodExpenses, products]);

  // 3. Balance Sheet & Asset Snapshot (Current Overall)
  const assetSnapshots = useMemo(() => {
    const snapshot = calculateBalanceSheetSnapshot({
      products,
      customers,
      vendors,
      sales,
      purchases,
      customerLedger,
      vendorLedger,
      expenses,
    });

    // Customer ledger detail list
    const customerBalances = customers.map(c => {
      const bal = calculateCustomerNetBalance(
        c.id,
        c.openingBalance || 0,
        sales,
        customerLedger,
        c.name
      );
      return { customer: c, balance: bal };
    });

    // Vendor ledger detail list
    const vendorBalances = vendors.map(v => {
      const bal = calculateVendorBalance(
        v.id,
        vendors,
        purchases,
        sales,
        vendorLedger,
        v.businessName
      );
      return { vendor: v, balance: bal };
    });

    const lowStockProducts = products.filter(p => p.stockQuantity <= p.minStockAlert && p.stockQuantity > 0);
    const outOfStockProducts = products.filter(p => p.stockQuantity === 0);
    const healthyStockProducts = products.filter(p => p.stockQuantity > p.minStockAlert);

    return {
      inventoryValuationCost: snapshot.inventory.inventoryValuationCost,
      inventoryValuationRetail: snapshot.inventory.inventoryValuationRetail,
      potentialProfitInStock: snapshot.inventory.potentialProfitInStock,
      totalStockUnits: snapshot.inventory.totalStockUnits,
      lowStockProducts,
      outOfStockProducts,
      healthyStockProducts,
      totalReceivables: snapshot.totalReceivables,
      debtorCustomersCount: snapshot.debtorCustomersCount,
      totalPayables: snapshot.totalPayables,
      creditorVendorsCount: snapshot.creditorVendorsCount,
      customerBalances,
      vendorBalances,
    };
  }, [products, customers, vendors, sales, purchases, customerLedger, vendorLedger, expenses]);

  // 4. Product Sales Performance Rankings
  const productPerformance = useMemo(() => {
    const map = new Map<string, {
      product: Product;
      unitsSold: number;
      revenue: number;
      cogs: number;
      profit: number;
      salesCount: number;
    }>();

    periodSales.forEach(sale => {
      sale.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId) || {
          id: item.productId,
          internalId: item.internalId || 'KFH-PART',
          name: item.name,
          brandName: 'Unknown',
          typeName: 'Part',
          costPrice: item.costPrice || 0,
          stockQuantity: 0,
          minStockAlert: 5,
          unit: item.unit || 'Pcs',
        } as Product;

        const current = map.get(item.productId) || {
          product: prod,
          unitsSold: 0,
          revenue: 0,
          cogs: 0,
          profit: 0,
          salesCount: 0,
        };

        const itemQty = Number(item.quantity) || 1;
        const itemRevenue = (Number(item.unitPrice) || 0) * itemQty;
        const prodMap = new Map<string, Product>();
        if (prod.id) prodMap.set(prod.id, prod);
        const { lineCogs: itemCost } = calculateSaleItemCogs(item, prodMap, false);

        current.unitsSold += itemQty;
        current.revenue += itemRevenue;
        current.cogs += itemCost;
        current.profit += (itemRevenue - itemCost);
        current.salesCount += 1;

        map.set(item.productId, current);
      });
    });

    const sortedByRevenue = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
    const sortedByVolume = Array.from(map.values()).sort((a, b) => b.unitsSold - a.unitsSold);
    const sortedByProfit = Array.from(map.values()).sort((a, b) => b.profit - a.profit);

    // Dead Stock / Zero Sales (Products with zero sales in period)
    const activeProductIds = new Set(map.keys());
    const deadStockProducts = products.filter(p => !activeProductIds.has(p.id) && p.stockQuantity > 0);

    return {
      topByRevenue: sortedByRevenue.slice(0, 5),
      topByVolume: sortedByVolume.slice(0, 5),
      topByProfit: sortedByProfit.slice(0, 5),
      deadStockProducts: deadStockProducts.slice(0, 5),
      deadStockCount: deadStockProducts.length,
    };
  }, [periodSales, products]);

  // 5. Category Distribution Breakdown
  const categoryData = useMemo(() => {
    const typeMap = new Map<string, { name: string; revenue: number; units: number }>();
    
    periodSales.forEach(s => {
      s.items.forEach(it => {
        const prod = products.find(p => p.id === it.productId);
        const typeName = prod?.typeName || 'Other Filters';
        const curr = typeMap.get(typeName) || { name: typeName, revenue: 0, units: 0 };
        curr.revenue += (Number(it.unitPrice) || 0) * (Number(it.quantity) || 1);
        curr.units += Number(it.quantity) || 1;
        typeMap.set(typeName, curr);
      });
    });

    const list = Array.from(typeMap.values()).sort((a, b) => b.revenue - a.revenue);
    const COLORS = ['#dc2626', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

    return list.map((item, idx) => ({
      ...item,
      color: COLORS[idx % COLORS.length],
    }));
  }, [periodSales, products]);

  // 6. Time Trend Graph Data (Daily Aggregated Data for Charts)
  const chartData = useMemo(() => {
    const daysMap = new Map<string, {
      date: string;
      displayDate: string;
      sales: number;
      cogs: number;
      grossProfit: number;
      purchases: number;
      expenses: number;
    }>();

    // Helper to format short date
    const formatShortDay = (d: Date) => {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Initialize periods with zero if timeframe is reasonable
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));

    if (diffDays <= 60) {
      const cur = new Date(start);
      while (cur <= end) {
        const key = cur.toISOString().split('T')[0];
        daysMap.set(key, {
          date: key,
          displayDate: formatShortDay(cur),
          sales: 0,
          cogs: 0,
          grossProfit: 0,
          purchases: 0,
          expenses: 0,
        });
        cur.setDate(cur.getDate() + 1);
      }
    }

    // Populate Sales & Return Adjustments
    const prodMap = buildProductLookupMap(products);

    periodSales.forEach(s => {
      const dStr = (s.date || s.createdAt || '').split('T')[0];
      if (!dStr) return;
      const entry = daysMap.get(dStr) || {
        date: dStr,
        displayDate: dStr.substring(5),
        sales: 0,
        cogs: 0,
        grossProfit: 0,
        purchases: 0,
        expenses: 0,
      };

      const sTotal = Number(s.totalAmount) || 0;
      const sCogs = calculateSaleCogs(s, prodMap, true);

      entry.sales += sTotal;
      entry.cogs += sCogs;
      entry.grossProfit += (sTotal - sCogs);
      daysMap.set(dStr, entry);
    });

    // Populate Customer Returns (Net against sales revenue)
    periodCustomerReturns.forEach(r => {
      const dStr = (r.date || (r as any).returnDate || r.createdAt || '').split('T')[0];
      if (!dStr) return;
      const entry = daysMap.get(dStr) || {
        date: dStr,
        displayDate: dStr.substring(5),
        sales: 0,
        cogs: 0,
        grossProfit: 0,
        purchases: 0,
        expenses: 0,
      };
      const refund = Number(r.totalRefundAmount || (r as any).totalReturnAmount || r.subtotal) || 0;
      entry.sales = Math.max(0, entry.sales - refund);
      entry.grossProfit -= refund;
      daysMap.set(dStr, entry);
    });

    // Populate Purchases
    periodPurchases.forEach(p => {
      const dStr = (p.date || p.createdAt || '').split('T')[0];
      if (!dStr) return;
      const entry = daysMap.get(dStr) || {
        date: dStr,
        displayDate: dStr.substring(5),
        sales: 0,
        cogs: 0,
        grossProfit: 0,
        purchases: 0,
        expenses: 0,
      };
      entry.purchases += Number(p.totalAmount) || 0;
      daysMap.set(dStr, entry);
    });

    // Populate Expenses
    periodExpenses.forEach(e => {
      const dStr = (e.date || e.createdAt || '').split('T')[0];
      if (!dStr) return;
      const entry = daysMap.get(dStr) || {
        date: dStr,
        displayDate: dStr.substring(5),
        sales: 0,
        cogs: 0,
        grossProfit: 0,
        purchases: 0,
        expenses: 0,
      };
      entry.expenses += Number(e.amount) || 0;
      daysMap.set(dStr, entry);
    });

    return Array.from(daysMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [dateRange, periodSales, periodCustomerReturns, periodPurchases, periodExpenses, products]);

  // 6b. Monthly Sales Performance Trend (Last 6 Months)
  const monthlySalesTrend = useMemo(() => {
    // Generate the last 6 calendar months ending with the current month
    const months: {
      key: string;            // 'YYYY-MM'
      monthName: string;      // 'Apr 2026'
      fullMonthName: string;  // 'April 2026'
      shortMonth: string;     // 'Apr'
      year: number;
      monthIndex: number;
      revenue: number;        // Net Sales Revenue
      grossRevenue: number;   // Gross Sales
      returns: number;        // Sales returns
      profit: number;         // Gross profit
      invoicesCount: number;  // Count of sales
    }[] = [];

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
      const monthName = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      const fullMonthName = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const shortMonth = d.toLocaleString('en-US', { month: 'short' });

      months.push({
        key: monthKey,
        monthName,
        fullMonthName,
        shortMonth,
        year: y,
        monthIndex: m,
        revenue: 0,
        grossRevenue: 0,
        returns: 0,
        profit: 0,
        invoicesCount: 0,
      });
    }

    const prodMap = buildProductLookupMap(products);

    // Map sales into each month bucket
    sales.forEach(s => {
      const dStr = s.date || s.createdAt;
      if (!dStr) return;
      const sDate = new Date(dStr);
      if (isNaN(sDate.getTime())) return;
      const key = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}`;
      const bucket = months.find(m => m.key === key);
      if (bucket) {
        const total = Number(s.totalAmount) || 0;
        const cogs = calculateSaleCogs(s, prodMap, true);
        bucket.grossRevenue += total;
        bucket.revenue += total;
        bucket.profit += (total - cogs);
        bucket.invoicesCount += 1;
      }
    });

    // Deduct returns in corresponding months
    customerReturns.forEach(r => {
      const dStr = r.date || (r as any).returnDate || r.createdAt;
      if (!dStr) return;
      const rDate = new Date(dStr);
      if (isNaN(rDate.getTime())) return;
      const key = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}`;
      const bucket = months.find(m => m.key === key);
      if (bucket) {
        const refund = Number(r.totalRefundAmount || (r as any).totalReturnAmount || r.subtotal) || 0;
        bucket.returns += refund;
        bucket.revenue = Math.max(0, bucket.revenue - refund);
        bucket.profit -= refund;
      }
    });

    // Round metrics and compute period-over-period statistics
    const finalized = months.map(m => {
      const netRev = Math.round(m.revenue);
      const grossRev = Math.round(m.grossRevenue);
      const retVal = Math.round(m.returns);
      const profVal = Math.round(m.profit);
      const margin = netRev > 0 ? (profVal / netRev) * 100 : 0;
      const avg = m.invoicesCount > 0 ? Math.round(netRev / m.invoicesCount) : 0;
      return {
        ...m,
        revenue: netRev,
        grossRevenue: grossRev,
        returns: retVal,
        profit: profVal,
        profitMargin: Number(margin.toFixed(1)),
        avgTicket: avg,
      };
    });

    const total6MoRevenue = finalized.reduce((sum, m) => sum + m.revenue, 0);
    const avgMonthlyRevenue = Math.round(total6MoRevenue / (finalized.length || 1));
    const currentMonthRevenue = finalized[finalized.length - 1]?.revenue || 0;
    const previousMonthRevenue = finalized[finalized.length - 2]?.revenue || 0;
    const growthPercent = previousMonthRevenue > 0 
      ? Math.round(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100)
      : (currentMonthRevenue > 0 ? 100 : 0);

    const peakMonth = [...finalized].sort((a, b) => b.revenue - a.revenue)[0];

    return {
      months: finalized,
      total6MoRevenue,
      avgMonthlyRevenue,
      currentMonthRevenue,
      previousMonthRevenue,
      growthPercent,
      peakMonth,
    };
  }, [sales, customerReturns, products]);

  // 6c. Top Executive Summary KPIs (Dynamic calculations for Total Revenue, Monthly Sales Volume, and Active Customers)
  const topSummaryKpis = useMemo(() => {
    // 1. All-Time Unified Sales and Revenue
    const allTimeMetrics = calculateUnifiedMetrics({
      sales,
      customerReturns,
      products,
    });

    const totalAllTimeRevenue = allTimeMetrics.netRevenue;
    const totalPeriodRevenue = financials.netSales;
    const totalCashCollected = allTimeMetrics.totalCashReceived;
    const totalCreditOutstanding = allTimeMetrics.totalCreditOutstanding;
    const totalInvoices = sales.length;
    const avgOrderValue = totalInvoices > 0 ? Math.round(totalAllTimeRevenue / totalInvoices) : 0;
    const periodAvgOrderValue = financials.salesCount > 0 ? Math.round(financials.netSales / financials.salesCount) : 0;

    // 2. Current Month vs Previous Month Sales Volume
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const currentMonthSales = sales.filter(s => {
      const dStr = s.date || s.createdAt;
      if (!dStr) return false;
      const d = new Date(dStr);
      return !isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const currentMonthReturns = customerReturns.filter(r => {
      const dStr = r.date || (r as any).returnDate || r.createdAt;
      if (!dStr) return false;
      const d = new Date(dStr);
      return !isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const currentMonthMetrics = calculateUnifiedMetrics({
      sales: currentMonthSales,
      customerReturns: currentMonthReturns,
      products,
    });

    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();

    const prevMonthSales = sales.filter(s => {
      const dStr = s.date || s.createdAt;
      if (!dStr) return false;
      const d = new Date(dStr);
      return !isNaN(d.getTime()) && d.getFullYear() === prevYear && d.getMonth() === prevMonth;
    });

    const prevMonthReturns = customerReturns.filter(r => {
      const dStr = r.date || (r as any).returnDate || r.createdAt;
      if (!dStr) return false;
      const d = new Date(dStr);
      return !isNaN(d.getTime()) && d.getFullYear() === prevYear && d.getMonth() === prevMonth;
    });

    const prevMonthMetrics = calculateUnifiedMetrics({
      sales: prevMonthSales,
      customerReturns: prevMonthReturns,
      products,
    });

    const momGrowth = prevMonthMetrics.netRevenue > 0
      ? Math.round(((currentMonthMetrics.netRevenue - prevMonthMetrics.netRevenue) / prevMonthMetrics.netRevenue) * 100)
      : (currentMonthMetrics.netRevenue > 0 ? 100 : 0);

    // 3. Dynamic Active Customers Calculations based on Sales and Customers State
    const customerOrderCountMap = new Map<string, number>();
    const customerSpendMap = new Map<string, number>();
    const customerLastSaleDateMap = new Map<string, Date>();

    // 90-day active purchase cutoff
    const activeCutoffDate = new Date();
    activeCutoffDate.setDate(activeCutoffDate.getDate() - 90);

    sales.forEach(s => {
      const idKey = s.customerId && s.customerId.trim();
      const nameKey = s.customerName && s.customerName.trim().toLowerCase();
      const key = idKey || nameKey;
      if (!key) return;

      customerOrderCountMap.set(key, (customerOrderCountMap.get(key) || 0) + 1);
      customerSpendMap.set(key, (customerSpendMap.get(key) || 0) + (Number(s.totalAmount) || 0));

      const sDate = new Date(s.date || s.createdAt);
      if (!isNaN(sDate.getTime())) {
        const prevDate = customerLastSaleDateMap.get(key);
        if (!prevDate || sDate > prevDate) {
          customerLastSaleDateMap.set(key, sDate);
        }
      }
    });

    const registeredCustomersCount = customers.length;
    const activeRegisteredCustomers = customers.filter(c => c.status !== 'inactive');

    // Customer keys considered active
    const activeCustomerKeys = new Set<string>();
    activeRegisteredCustomers.forEach(c => {
      if (c.id) activeCustomerKeys.add(c.id);
      if (c.name) activeCustomerKeys.add(c.name.trim().toLowerCase());
    });

    customerLastSaleDateMap.forEach((lastDate, key) => {
      if (lastDate >= activeCutoffDate) {
        activeCustomerKeys.add(key);
      }
    });

    const totalPurchasingCustomers = customerOrderCountMap.size;
    const activeCustomersCount = Math.max(activeCustomerKeys.size, totalPurchasingCustomers || registeredCustomersCount);

    // Repeat customers (>= 2 orders placed)
    let repeatCount = 0;
    customerOrderCountMap.forEach((count) => {
      if (count >= 2) repeatCount++;
    });

    const repeatRate = totalPurchasingCustomers > 0
      ? Math.round((repeatCount / totalPurchasingCustomers) * 100)
      : 0;

    // Active purchasing accounts in currently selected period
    const periodActiveCustomersCount = new Set(
      periodSales
        .map(s => (s.customerId && s.customerId.trim()) || (s.customerName && s.customerName.trim().toLowerCase()))
        .filter(Boolean)
    ).size;

    return {
      allTimeRevenue: totalAllTimeRevenue,
      periodRevenue: totalPeriodRevenue,
      totalCashCollected,
      totalCreditOutstanding,
      totalInvoices,
      avgOrderValue,
      periodAvgOrderValue,
      monthlySalesVolume: {
        revenue: currentMonthMetrics.netRevenue,
        grossRevenue: currentMonthMetrics.grossRevenue,
        unitsSold: currentMonthMetrics.totalItemsSold,
        invoicesCount: currentMonthMetrics.salesCount,
        grossProfit: currentMonthMetrics.grossProfit,
        momGrowth,
        monthName: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        shortMonthName: now.toLocaleString('en-US', { month: 'short' }),
      },
      activeCustomers: {
        activeCount: activeCustomersCount,
        totalRegistered: registeredCustomersCount,
        repeatCount,
        repeatRate,
        periodActiveCount: periodActiveCustomersCount,
        debtorCount: assetSnapshots.debtorCustomersCount,
      }
    };
  }, [sales, customerReturns, customers, products, financials, periodSales, assetSnapshots.debtorCustomersCount]);

  // 7. Recent Operational Activity Feed (Sales, Purchases, Returns, Cargo POs, Demands)
  const recentActivities = useMemo(() => {
    interface ActivityItem {
      id: string;
      type: 'sale' | 'purchase' | 'customer_return' | 'vendor_return' | 'po' | 'demand';
      title: string;
      subtitle: string;
      amount?: number;
      statusBadge?: string;
      statusColor?: string;
      timestamp: string;
      rawObject: any;
    }

    const list: ActivityItem[] = [];

    sales.slice(0, 15).forEach(s => {
      list.push({
        id: `act-s-${s.id}`,
        type: 'sale',
        title: `Sale #${s.invoiceNumber || s.id}`,
        subtitle: `${s.customerName || 'Cash Customer'} • ${s.items.length} items`,
        amount: s.totalAmount,
        statusBadge: s.balanceDue > 0 ? 'Khata / Credit' : 'Paid in Full',
        statusColor: s.balanceDue > 0 ? 'amber' : 'emerald',
        timestamp: s.createdAt || s.date,
        rawObject: s,
      });
    });

    purchases.slice(0, 10).forEach(p => {
      list.push({
        id: `act-p-${p.id}`,
        type: 'purchase',
        title: `Purchase Bill #${p.billNumber || p.id}`,
        subtitle: `${p.vendorName || 'Supplier'} • ${p.items.length} items`,
        amount: p.totalAmount,
        statusBadge: p.remainingBalance > 0 ? 'Payable Owed' : 'Cleared',
        statusColor: p.remainingBalance > 0 ? 'red' : 'emerald',
        timestamp: p.createdAt || p.date,
        rawObject: p,
      });
    });

    customerReturns.slice(0, 5).forEach(r => {
      list.push({
        id: `act-cr-${r.id}`,
        type: 'customer_return',
        title: `Sales Return #${r.returnNumber || r.id}`,
        subtitle: `${r.customerName || 'Customer'} • Restocked`,
        amount: r.totalRefundAmount,
        statusBadge: 'Credit Note',
        statusColor: 'purple',
        timestamp: r.createdAt || r.date,
        rawObject: r,
      });
    });

    purchaseOrders.filter(po => po.status === 'pending_bill').slice(0, 5).forEach(po => {
      list.push({
        id: `act-po-${po.id}`,
        type: 'po',
        title: `PO Cargo Arrival #${po.poNumber}`,
        subtitle: `${po.vendorName} • Cargo Received`,
        amount: po.totalEstimatedAmount,
        statusBadge: 'Awaiting Final Bill',
        statusColor: 'amber',
        timestamp: po.createdAt,
        rawObject: po,
      });
    });

    demands.filter(d => d.status === 'pending').slice(0, 5).forEach(d => {
      list.push({
        id: `act-d-${d.id}`,
        type: 'demand',
        title: `Part Demand: ${d.itemName}`,
        subtitle: `Requested by ${d.customerName} (${d.quantity} ${d.unit})`,
        amount: d.targetPrice ? d.targetPrice * d.quantity : undefined,
        statusBadge: 'Pending Sourcing',
        statusColor: 'blue',
        timestamp: d.createdAt,
        rawObject: d,
      });
    });

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
  }, [sales, purchases, customerReturns, purchaseOrders, demands]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* 1. TOP EXECUTIVE HEADER & TIMEFRAME CONTROLS */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-300 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Executive Overview Titles */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center font-black shadow-md shadow-red-600/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Executive Dashboard
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black rounded-lg">
                    Live Pakistan PKR
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Real-time business performance, revenue velocity, FIFO gross profits & inventory valuation.
                </p>
              </div>
            </div>
          </div>

          {/* Timeframe Selector & Custom Picker */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Timeframe Dropdown */}
            <div className="relative">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as DashboardTimeframe)}
                className="pl-3 pr-8 py-2 bg-slate-200 hover:bg-slate-300/80 border border-slate-300 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer transition-all shadow-sm"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month ({new Date().toLocaleString('default', { month: 'short' })})</option>
                <option value="last_month">Last Month</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="last_90_days">Last 90 Days</option>
                <option value="this_year">This Fiscal Year</option>
                <option value="all_time">All Time Cumulative</option>
                <option value="custom">Custom Date Range...</option>
              </select>
            </div>

            {/* Custom Range Inputs if custom selected */}
            {timeframe === 'custom' && (
              <div className="flex items-center gap-1.5 bg-slate-200 p-1 rounded-xl border border-slate-200 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 bg-slate-200 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
                />
                <span className="text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 bg-slate-200 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
                />
              </div>
            )}

            {/* Quick Action: Make POS Sale */}
            {onOpenNewSale && (<button
              type="button"
              onClick={onOpenNewSale}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Open POS Cashier Billing (F5)"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>New Sale</span>
            </button>)}

            {/* Quick Action: Income Statement Link */}
            <button
              type="button"
              onClick={() => onGoToView('income_statement')}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="View full detailed Income Statement (P&L)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Income Statement</span>
            </button>
          </div>
        </div>

        {/* Active Reporting Period Pill */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-semibold">
            <span className="flex items-center gap-1 text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-red-600" /> Active Scope:
            </span>
            <span className="font-black text-slate-900 bg-red-50 text-red-700 px-2.5 py-0.5 rounded-lg border border-red-100">
              {dateRange.label} ({dateRange.startStr} → {dateRange.endStr})
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
            <span>{financials.salesCount} Invoices</span>
            <span>•</span>
            <span>{financials.itemsSoldUnits} Units Sold</span>
            <span>•</span>
            <span>{financials.purchasesCount} Procurement Bills</span>
          </div>
        </div>
      </section>

      {/* 2. TOP EXECUTIVE SUMMARY GRID (Dynamic KPIs: Total Revenue, Monthly Sales Volume, Active Customers, AOV) */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-slate-700/60 relative overflow-hidden">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-24 -mt-24" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -mb-24" />

        <div className="relative z-10 space-y-4">
          {/* Header of Summary Grid */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-600/30">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                    Executive KPI Summary
                  </h2>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Dynamic Live
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  Real-time business performance calculated dynamically from sales ledgers, customer base, and monthly velocity.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Scope:</span>
              <span className="px-2.5 py-1 bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold font-mono">
                {dateRange.label}
              </span>
            </div>
          </div>

          {/* 4-Card Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* KPI 1: Total Revenue */}
            <div className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl p-4 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    Total Revenue
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/30 group-hover:scale-105 transition-transform">
                    ₨
                  </div>
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono block">
                    {formatPKRShort(topSummaryKpis.periodRevenue)}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono font-bold block mt-0.5">
                    {formatPKR(topSummaryKpis.periodRevenue)}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Cash Realized:</span>
                  <strong className="text-emerald-400 font-mono font-bold">{formatPKRShort(financials.cashCollected)}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">All-Time Cumulative:</span>
                  <span className="font-mono text-slate-200">{formatPKRShort(topSummaryKpis.allTimeRevenue)}</span>
                </div>
              </div>
            </div>

            {/* KPI 2: Monthly Sales Volume */}
            <div className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl p-4 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      Monthly Sales Volume
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-sm border border-red-500/30 group-hover:scale-105 transition-transform">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono block">
                    {formatPKRShort(topSummaryKpis.monthlySalesVolume.revenue)}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-400 font-mono font-bold">
                      {topSummaryKpis.monthlySalesVolume.shortMonthName} {new Date().getFullYear()}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border flex items-center gap-0.5 ${
                      topSummaryKpis.monthlySalesVolume.momGrowth >= 0
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    }`}>
                      {topSummaryKpis.monthlySalesVolume.momGrowth >= 0 ? '+' : ''}{topSummaryKpis.monthlySalesVolume.momGrowth}% MoM
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Sold This Month:</span>
                  <strong className="text-white font-mono font-bold">{topSummaryKpis.monthlySalesVolume.unitsSold} Units</strong>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Monthly Invoices:</span>
                  <span className="font-mono text-slate-200">{topSummaryKpis.monthlySalesVolume.invoicesCount} Bills</span>
                </div>
              </div>
            </div>

            {/* KPI 3: Active Customers */}
            <div 
              onClick={() => onGoToView('customers')}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl p-4 transition-all flex flex-col justify-between group cursor-pointer"
              title="Click to view full Customer Directory"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider group-hover:text-amber-300 transition-colors">
                    Active Customers
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm border border-amber-500/30 group-hover:scale-105 transition-transform">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono block">
                      {topSummaryKpis.activeCustomers.activeCount}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                      Accounts
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                    {topSummaryKpis.activeCustomers.totalRegistered} Registered Accounts
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Repeat Buyers:</span>
                  <span className="text-amber-300 font-mono font-bold">
                    {topSummaryKpis.activeCustomers.repeatRate}% ({topSummaryKpis.activeCustomers.repeatCount})
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">In Scope Active:</span>
                  <span className="font-mono text-slate-200">
                    {topSummaryKpis.activeCustomers.periodActiveCount} Buyers
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 4: Average Order Value & Velocity */}
            <div className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl p-4 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    Avg Order Value (AOV)
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30 group-hover:scale-105 transition-transform">
                    <Receipt className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono block">
                    {formatPKRShort(topSummaryKpis.periodAvgOrderValue || topSummaryKpis.avgOrderValue)}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono font-bold block mt-0.5">
                    {formatPKR(topSummaryKpis.periodAvgOrderValue || topSummaryKpis.avgOrderValue)} / Sale
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Invoices In Scope:</span>
                  <strong className="text-white font-mono font-bold">{financials.salesCount} Invoices</strong>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Gross Margin:</span>
                  <span className="font-mono text-emerald-400 font-bold">{financials.grossMarginPercent.toFixed(1)}%</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. DETAILED OPERATIONAL & ASSET METRIC CARDS (8 High Impact Blocks) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Metric 1: Net Sales Revenue */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-300 shadow-lg hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Net Sales Revenue
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm border border-emerald-100">
                ₨
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight block">
                {formatPKRShort(financials.netSales)}
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold block mt-0.5">
                {formatPKR(financials.netSales)}
              </span>
            </div>
          </div>
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">
              Cash: <strong className="text-slate-800">{formatPKRShort(financials.cashCollected)}</strong>
            </span>
            <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-100">
              Khata: {formatPKRShort(financials.creditSales)}
            </span>
          </div>
        </div>

        {/* Metric 2: FIFO Cost of Goods Sold (COGS) */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-300 shadow-lg hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Cost of Goods Sold (COGS)
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm border border-slate-200">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight block">
                {formatPKRShort(financials.totalCOGS)}
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold block mt-0.5">
                {formatPKR(financials.totalCOGS)}
              </span>
            </div>
          </div>
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">
              Sold: <strong className="text-slate-800">{financials.itemsSoldUnits} Units</strong>
            </span>
            <span className="text-slate-600 font-semibold">
              FIFO Cost Basis
            </span>
          </div>
        </div>

        {/* Metric 3: Gross Profit & Margin */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-300 shadow-lg hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Gross Profit (Trading)
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm border ${
                financials.grossProfit >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}>
                {financials.grossProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight block ${
                financials.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {formatPKRShort(financials.grossProfit)}
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold block mt-0.5">
                {formatPKR(financials.grossProfit)}
              </span>
            </div>
          </div>
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">
              Gross Margin:
            </span>
            <span className={`px-2 py-0.5 rounded-lg font-black text-xs ${
              financials.grossMarginPercent >= 15 
                ? 'bg-emerald-100 text-emerald-800' 
                : financials.grossMarginPercent >= 0 
                ? 'bg-amber-100 text-amber-800' 
                : 'bg-rose-100 text-rose-800'
            }`}>
              {financials.grossMarginPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Metric 4: Net Profit (Bottom Line after OPEX) */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-4 sm:p-5 text-white shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-3 translate-y-3 pointer-events-none">
            <DollarSign className="w-32 h-32" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
                Net Profit (EBIT)
              </span>
              <span className="px-2 py-0.5 bg-white/20 text-white rounded-lg text-[10px] font-black">
                Bottom Line
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight block">
                {formatPKRShort(financials.netProfit)}
              </span>
              <span className="text-xs text-slate-400 font-mono block mt-0.5">
                {formatPKR(financials.netProfit)}
              </span>
            </div>
          </div>
          <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-slate-300">
              OPEX: <strong>{formatPKRShort(financials.totalExpenses)}</strong>
            </span>
            <span className="font-black text-emerald-400">
              Net: {financials.netMarginPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Metric 5: Current Inventory Asset Valuation */}
        <div 
          onClick={() => onGoToView('inventory')}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-300 shadow-lg hover:border-red-300 cursor-pointer transition-all flex flex-col justify-between group"
          title="Click to view full Inventory Catalog"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider group-hover:text-red-600 transition-colors">
                Stock Valuation (Cost)
              </span>
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm border border-red-100 group-hover:scale-105 transition-transform">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight block group-hover:text-red-600 transition-colors">
                {formatPKRShort(assetSnapshots.inventoryValuationCost)}
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold block mt-0.5">
                {formatPKR(assetSnapshots.inventoryValuationCost)}
              </span>
            </div>
          </div>
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">
              Retail: <strong className="text-slate-800">{formatPKRShort(assetSnapshots.inventoryValuationRetail)}</strong>
            </span>
            <span className="text-slate-600 font-bold">
              {assetSnapshots.totalStockUnits} Pcs ({products.length} Items)
            </span>
          </div>
        </div>

        {/* Metric 6: Customer Receivables (Khata Balance) */}
        <div 
          onClick={() => onGoToView('customers')}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-300 shadow-lg hover:border-amber-300 cursor-pointer transition-all flex flex-col justify-between group"
          title="Click to view Customer Accounts & Ledgers"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider group-hover:text-amber-700 transition-colors">
                Customer Receivables (Khata)
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm border border-amber-100">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight block">
                {formatPKRShort(assetSnapshots.totalReceivables)}
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold block mt-0.5">
                {formatPKR(assetSnapshots.totalReceivables)}
              </span>
            </div>
          </div>
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">
              Debtors: <strong className="text-slate-800">{assetSnapshots.debtorCustomersCount} Accounts</strong>
            </span>
            <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
              Owed to Shop
            </span>
          </div>
        </div>

        {/* Metric 7: Vendor Payables (Supplier Credit) */}
        <div 
          onClick={() => onGoToView('vendors')}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-300 shadow-lg hover:border-red-300 cursor-pointer transition-all flex flex-col justify-between group"
          title="Click to view Vendor Accounts & Supplier Bills"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider group-hover:text-red-700 transition-colors">
                Supplier Payables
              </span>
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm border border-red-100">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight block">
                {formatPKRShort(assetSnapshots.totalPayables)}
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold block mt-0.5">
                {formatPKR(assetSnapshots.totalPayables)}
              </span>
            </div>
          </div>
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">
              Creditors: <strong className="text-slate-800">{assetSnapshots.creditorVendorsCount} Suppliers</strong>
            </span>
            <span className="text-slate-600 font-bold">
              Procurement Balance
            </span>
          </div>
        </div>

        {/* Metric 8: Stock Health & Low Stock Alerts */}
        <div 
          onClick={() => onGoToView('inventory')}
          className={`rounded-3xl p-4 sm:p-5 border transition-all cursor-pointer flex flex-col justify-between shadow-sm ${
            assetSnapshots.lowStockProducts.length > 0 || assetSnapshots.outOfStockProducts.length > 0
              ? 'bg-amber-50/60 border-amber-300 hover:bg-amber-50'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
          title="Click to view Low Stock Inventory"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-amber-900 uppercase tracking-wider">
                Inventory Stock Health
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center font-bold text-sm border border-amber-300">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-950 tracking-tight block">
                {assetSnapshots.lowStockProducts.length + assetSnapshots.outOfStockProducts.length} Alerts
              </span>
              <span className="text-xs text-amber-800 font-bold block mt-0.5">
                {assetSnapshots.lowStockProducts.length} Low • {assetSnapshots.outOfStockProducts.length} Out of Stock
              </span>
            </div>
          </div>
          <div className="mt-3.5 pt-3 border-t border-amber-200/80 flex items-center justify-between text-[11px]">
            <span className="text-amber-900 font-medium">
              Healthy: <strong>{assetSnapshots.healthyStockProducts.length} Parts</strong>
            </span>
            <span className="text-amber-900 font-bold flex items-center gap-0.5">
              Reorder Needed <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

      </section>

      {/* 3. INTERACTIVE VISUAL CHARTS SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Main Trend Graph: Sales, COGS & Gross Profit (Takes 2 Columns on Large Screens) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-4 sm:p-6 border border-slate-300 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-red-600" />
                Financial Trajectory & Inflow vs Outflow
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Daily aggregated turnover, cost of goods sold, and trading profits for {dateRange.label}
              </p>
            </div>

            {/* Chart Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl border border-slate-200 text-xs font-bold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartMetric('revenue_profit')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  chartMetric === 'revenue_profit' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Revenue & Profit
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('sales_purchases')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  chartMetric === 'sales_purchases' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sales vs Purchases
              </button>
            </div>
          </div>

          {/* Chart Display Container */}
          <div className="h-[280px] w-full pt-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {chartMetric === 'revenue_profit' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="displayDate" 
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={(val) => formatPKRShort(val)}
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<DailyTrajectoryRevenueTooltip />} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area type="monotone" dataKey="sales" name="Sales Revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                    <Area type="monotone" dataKey="grossProfit" name="Gross Profit" stroke="#dc2626" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="displayDate" 
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={(val) => formatPKRShort(val)}
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<DailyTrajectoryCashflowTooltip />} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Bar dataKey="sales" name="Sales Inflow (₨)" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="purchases" name="Purchases Outflow (₨)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold bg-slate-200 rounded-2xl border border-dashed border-slate-200">
                No transaction data available in selected period
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown Donut / Radial Chart */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-300 shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-red-600" />
                Sales by Filter Category
              </h3>
              <span className="text-[11px] font-bold text-slate-400">
                {categoryData.length} Types
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Distribution of revenue across filter categories
            </p>
          </div>

          <div className="h-[180px] w-full flex items-center justify-center">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="revenue"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={<CategoryPieCustomTooltip totalRevenue={categoryData.reduce((acc, c) => acc + c.revenue, 0)} />}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-slate-400 font-semibold">
                No category sales recorded
              </div>
            )}
          </div>

          {/* Category Legend List */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 max-h-[100px] overflow-y-auto pr-1">
            {categoryData.slice(0, 4).map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-slate-700 font-bold truncate">{cat.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-900 shrink-0">
                  {formatPKRShort(cat.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* 3b. MONTHLY SALES PERFORMANCE TREND (LAST 6 MONTHS) */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-300 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold border border-red-100">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Monthly Sales Performance
              </h3>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-black rounded-lg">
                Last 6 Months
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Multi-month net revenue trend trajectory, peak billing months, and period-over-period growth.
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-1.5 flex items-center gap-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase">6-Mo Volume:</span>
              <span className="text-xs font-black text-slate-900 font-mono">
                {formatPKRShort(monthlySalesTrend.total6MoRevenue)}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-1.5 flex items-center gap-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Monthly Avg:</span>
              <span className="text-xs font-black text-slate-900 font-mono">
                {formatPKRShort(monthlySalesTrend.avgMonthlyRevenue)}
              </span>
            </div>

            <div className={`rounded-2xl px-3.5 py-1.5 flex items-center gap-1.5 border font-bold text-xs ${
              monthlySalesTrend.growthPercent >= 0 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {monthlySalesTrend.growthPercent >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              <span>{monthlySalesTrend.growthPercent >= 0 ? '+' : ''}{monthlySalesTrend.growthPercent}% vs Last Mo</span>
            </div>
          </div>
        </div>

        {/* Recharts Area + Line Visualization */}
        <div className="h-[270px] w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={monthlySalesTrend.months} 
              margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorMonthlyRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorMonthlyProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="monthName" 
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis 
                tickFormatter={(val) => formatPKRShort(val)}
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                content={
                  <MonthlySalesCustomTooltip 
                    peakMonthKey={monthlySalesTrend.peakMonth?.key} 
                    total6MoRevenue={monthlySalesTrend.total6MoRevenue} 
                  />
                } 
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                name="Net Revenue (₨)" 
                stroke="#dc2626" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorMonthlyRev)" 
                activeDot={{ 
                  r: 7, 
                  fill: '#dc2626', 
                  stroke: '#ffffff', 
                  strokeWidth: 3, 
                  className: "filter drop-shadow-md cursor-pointer transition-all" 
                }}
                dot={{ r: 4, fill: '#dc2626', strokeWidth: 1.5, stroke: '#ffffff' }}
              />
              <Area 
                type="monotone" 
                dataKey="profit" 
                name="Gross Profit (₨)" 
                stroke="#10b981" 
                strokeWidth={2} 
                strokeDasharray="4 4"
                fillOpacity={1} 
                fill="url(#colorMonthlyProfit)" 
                activeDot={{ 
                  r: 6, 
                  fill: '#10b981', 
                  stroke: '#ffffff', 
                  strokeWidth: 2, 
                  className: "filter drop-shadow-sm cursor-pointer transition-all" 
                }}
                dot={{ r: 3.5, fill: '#10b981', strokeWidth: 1, stroke: '#ffffff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 6-Month Breakdown Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100">
          {monthlySalesTrend.months.map((m) => {
            const isPeak = monthlySalesTrend.peakMonth?.key === m.key && m.revenue > 0;
            return (
              <div 
                key={m.key}
                className={`p-3 rounded-2xl border transition-all ${
                  isPeak 
                    ? 'bg-red-50/60 border-red-200 shadow-xs' 
                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className={`font-black ${isPeak ? 'text-red-700' : 'text-slate-600'}`}>
                    {m.monthName}
                  </span>
                  {isPeak && (
                    <span className="text-[9px] font-black uppercase tracking-wider bg-red-600 text-white px-1.5 py-0.2 rounded">
                      Peak
                    </span>
                  )}
                </div>
                <div className="font-mono font-black text-sm text-slate-900">
                  {formatPKRShort(m.revenue)}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mt-1">
                  <span>{m.invoicesCount} Invoices</span>
                  <span className="text-emerald-600 font-bold">+{formatPKRShort(m.profit)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. BUSINESS RANKINGS & FAST-MOVING LEDGERS */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Top 5 Best-Selling Parts */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-300 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Top Performing Products
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Highest grossing inventory parts in selected period
              </p>
            </div>
            <button
              type="button"
              onClick={() => onGoToView('inventory')}
              className="text-xs text-red-600 hover:text-red-700 font-bold hover:underline"
            >
              All Items →
            </button>
          </div>

          <div className="space-y-2.5">
            {productPerformance.topByRevenue.length > 0 ? (
              productPerformance.topByRevenue.map((item, idx) => (
                <div 
                  key={item.product.id}
                  className="p-2.5 rounded-2xl bg-slate-200 hover:bg-slate-300/80 border border-slate-200/80 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-red-100 text-red-800 flex items-center justify-center text-xs font-black shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 truncate">
                          {item.product.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 font-bold bg-white px-1.5 py-0.2 rounded border border-slate-200">
                          {item.product.internalId}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium block truncate">
                        {item.unitsSold} units sold • {item.product.brandName}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-slate-900 block font-mono">
                      {formatPKRShort(item.revenue)}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 block">
                      +{formatPKRShort(item.profit)} profit
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-semibold bg-slate-200 rounded-2xl border border-dashed border-slate-200">
                No sales recorded in this period
              </div>
            )}
          </div>
        </div>

        {/* Top Customers by Billing Volume */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-300 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Key Customer Accounts
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Highest turnover clients & their current Khata
              </p>
            </div>
            <button
              type="button"
              onClick={() => onGoToView('customers')}
              className="text-xs text-red-600 hover:text-red-700 font-bold hover:underline"
            >
              Ledgers →
            </button>
          </div>

          <div className="space-y-2.5">
            {customers.slice(0, 5).map((cust) => {
              const custBalObj = assetSnapshots.customerBalances.find(cb => cb.customer.id === cust.id);
              const balance = custBalObj?.balance || 0;

              return (
                <div 
                  key={cust.id}
                  onClick={() => onSelectCustomer ? onSelectCustomer(cust) : onGoToView('customers')}
                  className="p-2.5 rounded-2xl bg-slate-200 hover:bg-red-50/50 border border-slate-200/80 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
                      {cust.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-slate-900 block truncate group-hover:text-red-700 transition-colors">
                        {cust.name}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium block truncate">
                        {cust.phone || cust.location || 'Local Fleet'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-xs font-black font-mono block ${balance > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                      {formatPKRShort(balance)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 block">
                      {balance > 0 ? 'Khata Owed' : 'Cleared'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Watchlist / Urgent Action Alerts */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-300 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Action Watchlist
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Pending bills, restocks & customer demand fulfillments
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {/* Low Stock Quick Alert */}
            {assetSnapshots.lowStockProducts.length > 0 && (
              <div 
                onClick={() => onGoToView('inventory')}
                className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between cursor-pointer hover:bg-amber-100/80 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-amber-950 block">
                      {assetSnapshots.lowStockProducts.length} Items Below Min Stock
                    </span>
                    <span className="text-[11px] text-amber-800 font-semibold block">
                      Click to create purchase orders
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-700" />
              </div>
            )}

            {/* Pending Cargo POs Alert */}
            {purchaseOrders.filter(po => po.status === 'pending_bill').length > 0 && (
              <div 
                onClick={() => onGoToView('purchase_orders')}
                className="p-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between cursor-pointer hover:bg-blue-100/80 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-200 text-blue-900 flex items-center justify-center font-bold text-xs shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-blue-950 block">
                      {purchaseOrders.filter(po => po.status === 'pending_bill').length} PO Cargo Shipments Received
                    </span>
                    <span className="text-[11px] text-blue-800 font-semibold block">
                      Awaiting final vendor bill conversion
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-700" />
              </div>
            )}

            {/* Pending Demands Alert */}
            {demands.filter(d => d.status === 'pending').length > 0 && (
              <div 
                onClick={() => onGoToView('demands')}
                className="p-3 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between cursor-pointer hover:bg-purple-100/80 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-200 text-purple-900 flex items-center justify-center font-bold text-xs shrink-0">
                    <PackageSearch className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-purple-950 block">
                      {demands.filter(d => d.status === 'pending').length} Customer Demands Open
                    </span>
                    <span className="text-[11px] text-purple-800 font-semibold block">
                      Awaiting part market sourcing
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-700" />
              </div>
            )}

            {/* If all clear */}
            {assetSnapshots.lowStockProducts.length === 0 && 
             purchaseOrders.filter(po => po.status === 'pending_bill').length === 0 && 
             demands.filter(d => d.status === 'pending').length === 0 && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <span className="text-xs font-black text-emerald-950 block">
                  All Systems In Good Standing
                </span>
                <p className="text-[11px] text-emerald-800">
                  Stock levels healthy, no unbilled cargo or delayed demands.
                </p>
              </div>
            )}
          </div>
        </div>

      </section>

      {/* 5. RECENT ACTIVITY LEDGER STREAM */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-300 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-600" />
              Live Operational Activity Feed
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Chronological log of recent POS invoices, cargo bills, returns, and customer orders
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onGoToView('sales')}
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline"
            >
              Sales Ledger
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => onGoToView('purchases')}
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline"
            >
              Purchases
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {recentActivities.map((act) => (
            <div 
              key={act.id}
              onClick={() => {
                if (act.type === 'sale') onViewInvoice(act.rawObject);
                else if (act.type === 'purchase') onViewPurchase(act.rawObject);
                else if (act.type === 'customer_return' && onViewCustomerReturn) onViewCustomerReturn(act.rawObject);
                else if (act.type === 'po') onGoToView('purchase_orders');
                else if (act.type === 'demand') onGoToView('demands');
              }}
              className="py-3 px-2 rounded-2xl hover:bg-slate-300 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                  act.type === 'sale' ? 'bg-emerald-100 text-emerald-700' :
                  act.type === 'purchase' ? 'bg-amber-100 text-amber-700' :
                  act.type === 'customer_return' ? 'bg-purple-100 text-purple-700' :
                  act.type === 'po' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
                }`}>
                  {act.type === 'sale' && <Receipt className="w-4 h-4" />}
                  {act.type === 'purchase' && <ShoppingBag className="w-4 h-4" />}
                  {act.type === 'customer_return' && <RotateCcw className="w-4 h-4" />}
                  {act.type === 'po' && <Truck className="w-4 h-4" />}
                  {act.type === 'demand' && <PackageSearch className="w-4 h-4" />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-slate-900 truncate group-hover:text-red-600 transition-colors">
                      {act.title}
                    </span>
                    {act.statusBadge && (
                      <span className={`px-2 py-0.2 rounded-md text-[10px] font-black ${
                        act.statusColor === 'emerald' ? 'bg-emerald-100 text-emerald-800' :
                        act.statusColor === 'amber' ? 'bg-amber-100 text-amber-800' :
                        act.statusColor === 'purple' ? 'bg-purple-100 text-purple-800' :
                        act.statusColor === 'blue' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-800'
                      }`}>
                        {act.statusBadge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium block truncate">
                    {act.subtitle}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                {act.amount !== undefined && (
                  <span className="text-xs sm:text-sm font-black text-slate-900 font-mono block">
                    {formatPKR(act.amount)}
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-semibold block">
                  {act.timestamp ? new Date(act.timestamp).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
