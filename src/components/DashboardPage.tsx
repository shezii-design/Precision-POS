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
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
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
  onOpenNewSale: () => void;
  onOpenNewPurchase: (vendorId?: string) => void;
  onOpenCreatePO: () => void;
  onOpenCreateDemand: () => void;
  onOpenAddProduct: () => void;
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
  const periodCustomerReturns = useMemo(() => customerReturns.filter(r => isDateInRange(r.returnDate || r.createdAt)), [customerReturns, dateRange]);
  const periodVendorReturns = useMemo(() => vendorReturns.filter(r => isDateInRange(r.returnDate || r.createdAt)), [vendorReturns, dateRange]);
  const periodExpenses = useMemo(() => expenses.filter(e => isDateInRange(e.date || e.createdAt)), [expenses, dateRange]);

  // 2. Compute Core Financial Metrics
  const financials = useMemo(() => {
    // Gross & Net Sales
    const grossSales = periodSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const salesDiscounts = periodSales.reduce((sum, s) => sum + (Number(s.discount) || 0), 0);
    const cashCollected = periodSales.reduce((sum, s) => sum + (Number(s.paidAmount) || 0), 0);
    const creditSales = periodSales.reduce((sum, s) => sum + (Number(s.remainingBalance) || 0), 0);
    const itemsSoldUnits = periodSales.reduce((sum, s) => sum + s.items.reduce((iSum, it) => iSum + (Number(it.quantity) || 0), 0), 0);

    // Sales Returns
    const salesReturnsAmount = periodCustomerReturns.reduce((sum, r) => sum + (Number(r.totalReturnAmount) || 0), 0);
    const restockFeesCollected = periodCustomerReturns.reduce((sum, r) => sum + (Number(r.restockFee) || 0), 0);

    // Net Sales
    const netSales = Math.max(0, grossSales - salesReturnsAmount);

    // Cost of Goods Sold (FIFO basis from items)
    let fifoCOGS = 0;
    periodSales.forEach(s => {
      s.items.forEach(it => {
        const itemCost = it.cogs !== undefined && it.cogs > 0 ? it.cogs : (it.costPrice || 0);
        fifoCOGS += itemCost * (it.quantity || 1);
      });
    });

    // Deduct vendor return cost relief
    const vendorReturnsAmount = periodVendorReturns.reduce((sum, r) => sum + (Number(r.totalReturnAmount) || 0), 0);
    const totalCOGS = Math.max(0, fifoCOGS);

    // Gross Profit
    const grossProfit = netSales - totalCOGS;
    const grossMarginPercent = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

    // Operating Expenses
    const totalExpenses = periodExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Net Profit / Net Income
    const netProfit = grossProfit + restockFeesCollected - totalExpenses;
    const netMarginPercent = netSales > 0 ? (netProfit / netSales) * 100 : 0;

    // Purchases Spend
    const purchasesSpend = periodPurchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
    const purchasesPaid = periodPurchases.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
    const itemsPurchasedUnits = periodPurchases.reduce((sum, p) => sum + p.items.reduce((iSum, it) => iSum + (Number(it.quantity) || 0), 0), 0);

    return {
      grossSales,
      salesDiscounts,
      cashCollected,
      creditSales,
      itemsSoldUnits,
      salesReturnsAmount,
      restockFeesCollected,
      netSales,
      fifoCOGS,
      totalCOGS,
      vendorReturnsAmount,
      grossProfit,
      grossMarginPercent,
      totalExpenses,
      netProfit,
      netMarginPercent,
      purchasesSpend,
      purchasesPaid,
      itemsPurchasedUnits,
      salesCount: periodSales.length,
      purchasesCount: periodPurchases.length,
      customerReturnsCount: periodCustomerReturns.length,
      expensesCount: periodExpenses.length,
    };
  }, [periodSales, periodPurchases, periodCustomerReturns, periodVendorReturns, periodExpenses]);

  // 3. Balance Sheet & Asset Snapshot (Current Overall)
  const assetSnapshots = useMemo(() => {
    const inventoryValuationCost = products.reduce((sum, p) => sum + ((Number(p.costPrice) || 0) * (Number(p.stockQuantity) || 0)), 0);
    const inventoryValuationRetail = products.reduce((sum, p) => {
      const retailPrice = p.sellingPrices?.[1]?.price || (p.costPrice * 1.25);
      return sum + (retailPrice * (Number(p.stockQuantity) || 0));
    }, 0);
    const potentialProfitInStock = Math.max(0, inventoryValuationRetail - inventoryValuationCost);

    const totalStockUnits = products.reduce((sum, p) => sum + (Number(p.stockQuantity) || 0), 0);
    const lowStockProducts = products.filter(p => p.stockQuantity <= p.minStockAlert && p.stockQuantity > 0);
    const outOfStockProducts = products.filter(p => p.stockQuantity === 0);
    const healthyStockProducts = products.filter(p => p.stockQuantity > p.minStockAlert);

    // Receivables (Customer Balances Owed to Us)
    const customerBalances = customers.map(c => {
      // Find balance from ledger or calculate
      const entries = customerLedger.filter(e => e.customerId === c.id);
      let bal = c.openingBalance || 0;
      entries.forEach(e => {
        if (e.type === 'invoice_credit') bal += e.amount;
        else if (e.type === 'payment_cash' || e.type === 'payment_bank') bal -= e.amount;
        else if (e.type === 'return_credit') bal -= e.amount;
      });
      return { customer: c, balance: bal };
    });
    const totalReceivables = customerBalances.reduce((sum, cb) => sum + Math.max(0, cb.balance), 0);
    const debtorCustomersCount = customerBalances.filter(cb => cb.balance > 0).length;

    // Payables (Vendor Balances We Owe to Suppliers)
    const vendorBalances = vendors.map(v => {
      const entries = vendorLedger.filter(e => e.vendorId === v.id);
      let bal = v.openingBalance || 0;
      entries.forEach(e => {
        if (e.type === 'purchase_credit') bal += e.amount;
        else if (e.type === 'payment_cash' || e.type === 'payment_bank') bal -= e.amount;
        else if (e.type === 'return_debit') bal -= e.amount;
      });
      return { vendor: v, balance: bal };
    });
    const totalPayables = vendorBalances.reduce((sum, vb) => sum + Math.max(0, vb.balance), 0);
    const creditorVendorsCount = vendorBalances.filter(vb => vb.balance > 0).length;

    return {
      inventoryValuationCost,
      inventoryValuationRetail,
      potentialProfitInStock,
      totalStockUnits,
      lowStockProducts,
      outOfStockProducts,
      healthyStockProducts,
      totalReceivables,
      debtorCustomersCount,
      totalPayables,
      creditorVendorsCount,
      customerBalances,
      vendorBalances,
    };
  }, [products, customers, vendors, customerLedger, vendorLedger]);

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
        const itemCost = (item.cogs !== undefined && item.cogs > 0 ? item.cogs : (item.costPrice || 0)) * itemQty;

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

    // Populate Sales
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
      let sCogs = 0;
      s.items.forEach(it => {
        sCogs += (it.cogs || it.costPrice || 0) * (it.quantity || 1);
      });

      entry.sales += sTotal;
      entry.cogs += sCogs;
      entry.grossProfit += (sTotal - sCogs);
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
  }, [dateRange, periodSales, periodPurchases, periodExpenses]);

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
        statusBadge: s.remainingBalance > 0 ? 'Khata / Credit' : 'Paid in Full',
        statusColor: s.remainingBalance > 0 ? 'amber' : 'emerald',
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
        amount: r.totalReturnAmount,
        statusBadge: 'Credit Note',
        statusColor: 'purple',
        timestamp: r.createdAt || r.returnDate,
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
      <section className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs">
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
                className="pl-3 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer transition-all shadow-2xs"
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
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                />
                <span className="text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                />
              </div>
            )}

            {/* Quick Action: Make POS Sale */}
            <button
              type="button"
              onClick={onOpenNewSale}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Open POS Cashier Billing (F5)"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>New Sale</span>
              <kbd className="hidden sm:inline-block text-[9px] bg-black/20 px-1 py-0.2 rounded font-mono font-bold">
                F5
              </kbd>
            </button>

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

      {/* 2. PRIMARY EXECUTIVE KPI METRIC CARDS (8 High Impact Blocks) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Metric 1: Net Sales Revenue */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
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
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Cost of Goods Sold (COGS)
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm border border-slate-200">
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
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
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
          className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-red-300 cursor-pointer transition-all flex flex-col justify-between group"
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
          className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-amber-300 cursor-pointer transition-all flex flex-col justify-between group"
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
          className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-red-300 cursor-pointer transition-all flex flex-col justify-between group"
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
          className={`rounded-3xl p-4 sm:p-5 border transition-all cursor-pointer flex flex-col justify-between shadow-xs ${
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
        <div className="lg:col-span-2 bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
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
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartMetric('revenue_profit')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  chartMetric === 'revenue_profit' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Revenue & Profit
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('sales_purchases')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  chartMetric === 'sales_purchases' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
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
                    <Tooltip 
                      formatter={(val: any, name: any) => [formatPKR(Number(val)), name === 'sales' ? 'Sales Revenue' : name === 'cogs' ? 'Cost (COGS)' : 'Gross Profit']}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    />
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
                    <Tooltip 
                      formatter={(val: any, name: any) => [formatPKR(Number(val)), name === 'sales' ? 'Sales Inflow' : 'Purchases Outflow']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Bar dataKey="sales" name="Sales Inflow (₨)" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="purchases" name="Purchases Outflow (₨)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No transaction data available in selected period
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown Donut / Radial Chart */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
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
                    formatter={(val: any) => [formatPKR(Number(val)), 'Revenue']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
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

      {/* 4. BUSINESS RANKINGS & FAST-MOVING LEDGERS */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Top 5 Best-Selling Parts */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
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
                  className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 flex items-center justify-between gap-3 transition-colors"
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
              <div className="py-8 text-center text-xs text-slate-400 font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No sales recorded in this period
              </div>
            )}
          </div>
        </div>

        {/* Top Customers by Billing Volume */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
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
                  className="p-2.5 rounded-2xl bg-slate-50 hover:bg-red-50/50 border border-slate-200/80 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
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
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
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
      <section className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
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
              className="py-3 px-2 rounded-2xl hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                  act.type === 'sale' ? 'bg-emerald-100 text-emerald-700' :
                  act.type === 'purchase' ? 'bg-amber-100 text-amber-700' :
                  act.type === 'customer_return' ? 'bg-purple-100 text-purple-700' :
                  act.type === 'po' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
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
                        act.statusColor === 'blue' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
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
