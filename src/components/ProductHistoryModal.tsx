import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Product, 
  Purchase, 
  Sale, 
  CustomerReturn, 
  VendorReturn, 
  GlobalPricingSettings 
} from '../types';
import { formatPKR } from '../services/pricing';
import { ProductStockTrendGraph } from './ProductStockTrendGraph';
import { 
  History, 
  Search, 
  ArrowUpDown, 
  Filter, 
  Download, 
  Printer, 
  X, 
  Receipt, 
  ShoppingBag, 
  RotateCcw, 
  Undo2, 
  Calendar, 
  User, 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  Tag, 
  Box, 
  MapPin, 
  ExternalLink,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Activity
} from 'lucide-react';

export type ProductHistorySortOption = 
  | 'date_desc' 
  | 'date_asc' 
  | 'price_desc' 
  | 'price_asc' 
  | 'name_asc' 
  | 'name_desc' 
  | 'qty_desc' 
  | 'amount_desc';

export type ProductHistoryTab = 'all' | 'purchases' | 'sales' | 'returns';

export interface ProductTransactionRow {
  id: string;
  type: 'purchase' | 'sale' | 'customer_return' | 'vendor_return';
  transactionId: string;
  billNumber: string;
  date: string;
  partyId?: string;
  partyName: string;
  partyType?: string;
  partyPhone?: string;
  quantity: number;
  returnedQuantity?: number;
  netQuantity?: number;
  unitPrice: number;
  totalAmount: number;
  costAtSaleTime?: number;
  lineProfit?: number;
  lineMarginPercent?: number;
  paymentStatus?: string;
  notes?: string;
  rawRecord: Purchase | Sale | CustomerReturn | VendorReturn;
}

interface ProductHistoryModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  purchases: Purchase[];
  sales: Sale[];
  customerReturns?: CustomerReturn[];
  vendorReturns?: VendorReturn[];
  pricingSettings?: GlobalPricingSettings;
  onViewSaleInvoice?: (sale: Sale) => void;
  onViewPurchaseInvoice?: (purchase: Purchase) => void;
}

export const ProductHistoryModal: React.FC<ProductHistoryModalProps> = ({
  product,
  isOpen,
  onClose,
  purchases,
  sales,
  customerReturns = [],
  vendorReturns = [],
  pricingSettings,
  onViewSaleInvoice,
  onViewPurchaseInvoice,
}) => {
  const [activeTab, setActiveTab] = useState<ProductHistoryTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<ProductHistorySortOption>('date_desc');
  const [dateFilter, setDateFilter] = useState<'all' | '30days' | '90days' | 'this_year'>('all');
  const [showTrendGraph, setShowTrendGraph] = useState<boolean>(true);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Prevent background body scroll while modal is active & handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Prevent layout shift if scrollbar disappears
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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

  // Compile all transactions for this specific product
  const allRows: ProductTransactionRow[] = useMemo(() => {
    if (!product) return [];
    const list: ProductTransactionRow[] = [];

    // 1. Extract from Purchases
    for (const p of purchases) {
      const matched = (p.items || []).filter(isItemMatch);
      for (const it of matched) {
        const qty = Number(it.quantity) || 0;
        const retQty = Number(it.returnedQuantity) || 0;
        const rate = Number(it.unitPrice) || 0;
        list.push({
          id: `pur-${p.id}-${it.id || Math.random()}`,
          type: 'purchase',
          transactionId: p.id,
          billNumber: p.billNumber || p.id,
          date: p.date || p.createdAt,
          partyId: p.vendorId,
          partyName: p.vendorName || 'Vendor / Supplier',
          partyType: 'Vendor',
          quantity: qty,
          returnedQuantity: retQty,
          netQuantity: typeof it.netQuantity === 'number' ? it.netQuantity : Math.max(0, qty - retQty),
          unitPrice: rate,
          totalAmount: qty * rate,
          paymentStatus: p.paymentStatus,
          notes: p.notes,
          rawRecord: p,
        });
      }
    }

    // 2. Extract from Sales
    for (const s of sales) {
      const matched = (s.items || []).filter(isItemMatch);
      for (const it of matched) {
        const qty = Number(it.quantity) || 0;
        const retQty = Number(it.returnedQuantity) || 0;
        const rate = Number(it.unitPrice) || 0;
        const costPerUnit = typeof it.fifoCost === 'number' && it.fifoCost > 0
          ? it.fifoCost
          : typeof it.costPrice === 'number' && it.costPrice > 0
          ? it.costPrice
          : (product.costPrice || 0);

        const lineTotal = qty * rate;
        const lineCost = qty * costPerUnit;
        const lineProfit = lineTotal - lineCost;
        const lineMarginPercent = lineTotal > 0 ? (lineProfit / lineTotal) * 100 : 0;

        list.push({
          id: `sale-${s.id}-${it.id || Math.random()}`,
          type: 'sale',
          transactionId: s.id,
          billNumber: s.id,
          date: s.date || s.createdAt,
          partyId: s.customerId,
          partyName: s.customerName || 'Walk-in Customer',
          partyType: s.customerId ? 'Registered Customer' : 'Walk-in Customer',
          partyPhone: s.customerPhone,
          quantity: qty,
          returnedQuantity: retQty,
          netQuantity: typeof it.netQuantity === 'number' ? it.netQuantity : Math.max(0, qty - retQty),
          unitPrice: rate,
          totalAmount: lineTotal,
          costAtSaleTime: costPerUnit,
          lineProfit: lineProfit,
          lineMarginPercent: lineMarginPercent,
          paymentStatus: s.paymentStatus || s.paymentType,
          notes: s.notes,
          rawRecord: s,
        });
      }
    }

    // 3. Extract from Customer Returns
    for (const cr of customerReturns) {
      const matched = (cr.items || []).filter(isItemMatch);
      for (const it of matched) {
        const qty = Number(it.quantity) || 0;
        const rate = Number(it.returnRate) || 0;
        list.push({
          id: `cret-${cr.id}-${it.id || Math.random()}`,
          type: 'customer_return',
          transactionId: cr.id,
          billNumber: cr.returnNumber || cr.creditNoteNumber || cr.id,
          date: cr.date || cr.createdAt,
          partyId: cr.customerId,
          partyName: cr.customerName || 'Customer Return',
          partyType: 'Customer Return',
          quantity: qty,
          unitPrice: rate,
          totalAmount: Number(it.totalAmount) || (qty * rate),
          notes: it.reason ? `${it.reason}${it.notes ? ` • ${it.notes}` : ''}` : cr.notes,
          rawRecord: cr,
        });
      }
    }

    // 4. Extract from Vendor Returns
    for (const vr of vendorReturns) {
      const matched = (vr.items || []).filter(isItemMatch);
      for (const it of matched) {
        const qty = Number(it.quantity) || 0;
        const rate = Number(it.returnRate) || 0;
        list.push({
          id: `vret-${vr.id}-${it.id || Math.random()}`,
          type: 'vendor_return',
          transactionId: vr.id,
          billNumber: vr.returnNumber || vr.debitNoteNumber || vr.id,
          date: vr.date || vr.createdAt,
          partyId: vr.vendorId,
          partyName: vr.vendorName || 'Vendor Return',
          partyType: 'Vendor Return',
          quantity: qty,
          unitPrice: rate,
          totalAmount: Number(it.totalAmount) || (qty * rate),
          notes: it.reason ? `${it.reason}${it.notes ? ` • ${it.notes}` : ''}` : vr.notes,
          rawRecord: vr,
        });
      }
    }

    return list;
  }, [product, purchases, sales, customerReturns, vendorReturns]);

  // Summary Metrics calculation for this product
  const metrics = useMemo(() => {
    let totalPurchasedQty = 0;
    let totalPurchaseSpend = 0;
    let purchaseCount = 0;

    let totalSoldQty = 0;
    let totalSalesRevenue = 0;
    let totalSalesProfit = 0;
    let saleCount = 0;

    let totalCustomerReturnQty = 0;
    let totalCustomerRefundVal = 0;
    let totalVendorReturnQty = 0;
    let totalVendorReturnVal = 0;

    for (const row of allRows) {
      if (row.type === 'purchase') {
        totalPurchasedQty += row.quantity;
        totalPurchaseSpend += row.totalAmount;
        purchaseCount += 1;
      } else if (row.type === 'sale') {
        totalSoldQty += row.quantity;
        totalSalesRevenue += row.totalAmount;
        if (typeof row.lineProfit === 'number') {
          totalSalesProfit += row.lineProfit;
        }
        saleCount += 1;
      } else if (row.type === 'customer_return') {
        totalCustomerReturnQty += row.quantity;
        totalCustomerRefundVal += row.totalAmount;
      } else if (row.type === 'vendor_return') {
        totalVendorReturnQty += row.quantity;
        totalVendorReturnVal += row.totalAmount;
      }
    }

    const avgPurchasePrice = totalPurchasedQty > 0 ? totalPurchaseSpend / totalPurchasedQty : 0;
    const avgSellingPrice = totalSoldQty > 0 ? totalSalesRevenue / totalSoldQty : 0;
    const overallProfitMargin = totalSalesRevenue > 0 ? (totalSalesProfit / totalSalesRevenue) * 100 : 0;

    return {
      totalPurchasedQty,
      totalPurchaseSpend,
      avgPurchasePrice,
      purchaseCount,
      totalSoldQty,
      totalSalesRevenue,
      avgSellingPrice,
      totalSalesProfit,
      overallProfitMargin,
      saleCount,
      totalCustomerReturnQty,
      totalCustomerRefundVal,
      totalVendorReturnQty,
      totalVendorReturnVal,
      totalReturnsCount: totalCustomerReturnQty + totalVendorReturnQty,
    };
  }, [allRows]);

  // Tab Filtering & Date Filtering & Search
  const filteredAndSortedRows = useMemo(() => {
    let list = [...allRows];

    // 1. Tab filter
    if (activeTab === 'purchases') {
      list = list.filter(r => r.type === 'purchase');
    } else if (activeTab === 'sales') {
      list = list.filter(r => r.type === 'sale');
    } else if (activeTab === 'returns') {
      list = list.filter(r => r.type === 'customer_return' || r.type === 'vendor_return');
    }

    // 2. Date Range quick filter
    if (dateFilter !== 'all') {
      const now = new Date();
      list = list.filter(r => {
        const itemDate = new Date(r.date);
        if (isNaN(itemDate.getTime())) return true;
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        if (dateFilter === '30days') return diffDays <= 30;
        if (dateFilter === '90days') return diffDays <= 90;
        if (dateFilter === 'this_year') return itemDate.getFullYear() === now.getFullYear();
        return true;
      });
    }

    // 3. Search query filter (matches bill #, sale id, purchase id, vendor name, customer name, notes)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(r => {
        const bill = (r.billNumber || '').toLowerCase();
        const txId = (r.transactionId || '').toLowerCase();
        const party = (r.partyName || '').toLowerCase();
        const phone = (r.partyPhone || '').toLowerCase();
        const notes = (r.notes || '').toLowerCase();
        const typeStr = r.type.toLowerCase();

        return (
          bill.includes(q) ||
          txId.includes(q) ||
          party.includes(q) ||
          phone.includes(q) ||
          notes.includes(q) ||
          typeStr.includes(q)
        );
      });
    }

    // 4. Sorting logic
    list.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === 'price_desc') {
        return b.unitPrice - a.unitPrice;
      }
      if (sortBy === 'price_asc') {
        return a.unitPrice - b.unitPrice;
      }
      if (sortBy === 'name_asc') {
        return (a.partyName || '').localeCompare(b.partyName || '');
      }
      if (sortBy === 'name_desc') {
        return (b.partyName || '').localeCompare(a.partyName || '');
      }
      if (sortBy === 'qty_desc') {
        return b.quantity - a.quantity;
      }
      if (sortBy === 'amount_desc') {
        return b.totalAmount - a.totalAmount;
      }
      return 0;
    });

    return list;
  }, [allRows, activeTab, dateFilter, searchQuery, sortBy]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!product || filteredAndSortedRows.length === 0) return;
    const headers = [
      'Type',
      'Bill / Invoice #',
      'Date',
      'Vendor / Customer Name',
      'Party Type',
      'Quantity',
      'Returned Qty',
      'Unit Rate (PKR)',
      'Total Amount (PKR)',
      'Profit (PKR)',
      'Margin %',
      'Payment Status',
      'Notes'
    ];

    const rows = filteredAndSortedRows.map(r => [
      r.type.toUpperCase(),
      `"${r.billNumber}"`,
      `"${new Date(r.date).toLocaleDateString('en-PK')}"`,
      `"${r.partyName.replace(/"/g, '""')}"`,
      `"${r.partyType || ''}"`,
      r.quantity,
      r.returnedQuantity || 0,
      r.unitPrice,
      r.totalAmount,
      r.lineProfit ?? '',
      r.lineMarginPercent ? r.lineMarginPercent.toFixed(1) : '',
      `"${r.paymentStatus || ''}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [
      `Product History: ${product.internalId} - ${product.name}`,
      `Brand: ${product.brandName} | Type: ${product.typeName} | Current Stock: ${product.stockQuantity} ${product.unit}`,
      `Export Date: ${new Date().toLocaleString()}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${product.internalId}_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !product) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto overscroll-contain select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        ref={printAreaRef}
        id="product-history-modal-dialog"
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden isolate select-text my-auto"
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-start justify-between gap-4 border-b border-slate-700 shrink-0 z-20">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-red-600/90 text-white flex items-center justify-center font-bold shadow-md border border-red-500 shrink-0 mt-0.5">
              <History className="w-6 h-6" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 bg-red-500 text-white font-mono font-black text-xs rounded-md shadow-2xs">
                  {product.internalId}
                </span>
                <span className="px-2 py-0.5 bg-slate-700/80 text-slate-200 text-xs font-bold rounded-md flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-400" />
                  {product.brandName}
                </span>
                <span className="px-2 py-0.5 bg-slate-700/80 text-slate-300 text-xs font-semibold rounded-md">
                  {product.typeName}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-white mt-1 truncate">
                {product.name}
              </h2>

              <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 flex-wrap font-medium">
                <span className="flex items-center gap-1 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  {product.locationName} (Cabin: <strong className="text-white font-mono">{product.cabinNumber}</strong>)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Box className="w-3.5 h-3.5 text-emerald-400" />
                  Current Stock: <strong className="text-emerald-300 font-mono">{product.stockQuantity} {product.unit}</strong>
                </span>
                <span>•</span>
                <span>
                  Cost: <strong className="text-red-300 font-mono">{formatPKR(product.costPrice)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowTrendGraph(!showTrendGraph)}
              className={`p-2 sm:px-3 sm:py-1.5 text-xs font-bold rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer ${
                showTrendGraph
                  ? 'bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-2xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Toggle 30-Day Stock Level & Demand Trend Graph"
            >
              <Activity className="w-4 h-4 text-current" />
              <span className="hidden sm:inline">{showTrendGraph ? 'Hide Trend' : '30D Trend'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Export History to CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Print Item History"
            >
              <Printer className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* UNIFIED SCROLLABLE MODAL BODY */}
        <div 
          id="product-history-scrollable-body" 
          className="flex-1 overflow-y-auto overscroll-contain touch-pan-y min-h-0 divide-y divide-slate-200"
        >
          {/* SUMMARY KPI CARDS */}
          <div className="p-3 sm:p-4 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Card 1: Purchases Summary */}
            <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
              <div className="flex items-center justify-between text-indigo-700 font-bold text-xs">
                <span className="flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5" /> Total Purchases
                </span>
                <span className="font-mono text-[11px] bg-indigo-50 px-1.5 py-0.2 rounded font-black">
                  {metrics.purchaseCount} bills
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-base sm:text-lg font-black text-slate-900">
                  {metrics.totalPurchasedQty} {product.unit}
                </span>
                <span className="text-xs font-mono font-bold text-indigo-900">
                  {formatPKR(metrics.totalPurchaseSpend)}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Avg Buy Cost: <strong className="font-mono text-slate-700">{formatPKR(metrics.avgPurchasePrice)}</strong> / {product.unit}
              </div>
            </div>

            {/* Card 2: Sales Summary */}
            <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-700 font-bold text-xs">
                <span className="flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5" /> Total Sales
                </span>
                <span className="font-mono text-[11px] bg-emerald-50 px-1.5 py-0.2 rounded font-black">
                  {metrics.saleCount} invoices
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-base sm:text-lg font-black text-slate-900">
                  {metrics.totalSoldQty} {product.unit}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-900">
                  {formatPKR(metrics.totalSalesRevenue)}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Avg Sold Rate: <strong className="font-mono text-slate-700">{formatPKR(metrics.avgSellingPrice)}</strong> / {product.unit}
              </div>
            </div>

            {/* Card 3: Gross Profit & Margin */}
            <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-2xs">
              <div className="flex items-center justify-between text-amber-800 font-bold text-xs">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Gross Profit
                </span>
                <span className={`text-[10px] font-mono font-black px-1.5 py-0.2 rounded ${
                  metrics.totalSalesProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {metrics.overallProfitMargin.toFixed(1)}% margin
                </span>
              </div>
              <div className="mt-1">
                <span className={`text-base sm:text-lg font-black font-mono ${
                  metrics.totalSalesProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {formatPKR(metrics.totalSalesProfit)}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Net profit generated by this item
              </div>
            </div>

            {/* Card 4: Returns / Net Movement */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-700 font-bold text-xs">
                <span className="flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" /> Returns & Vouchers
                </span>
                <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.2 rounded font-black text-slate-700">
                  {metrics.totalReturnsCount} units
                </span>
              </div>
              <div className="mt-1 text-xs space-y-0.5 font-medium text-slate-600">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-amber-800 font-semibold">Cust. Returns:</span>
                  <span className="font-mono font-bold text-slate-800">{metrics.totalCustomerReturnQty} pcs ({formatPKR(metrics.totalCustomerRefundVal)})</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-rose-800 font-semibold">Vendor Returns:</span>
                  <span className="font-mono font-bold text-slate-800">{metrics.totalVendorReturnQty} pcs ({formatPKR(metrics.totalVendorReturnVal)})</span>
                </div>
              </div>
            </div>
          </div>

          {/* 30-DAY STOCK LEVEL & DEMAND TREND GRAPH */}
          {showTrendGraph && (
            <div className="p-3 sm:p-4 bg-slate-900">
              <ProductStockTrendGraph
                product={product}
                purchases={purchases}
                sales={sales}
                customerReturns={customerReturns}
                vendorReturns={vendorReturns}
              />
            </div>
          )}

          {/* CONTROLS & FILTER BAR (Sticky for quick accessibility while scrolling ledger) */}
          <div className="p-3 sm:p-4 bg-white/95 backdrop-blur-md sticky top-0 z-10 space-y-3 shadow-xs">
            {/* Top Row: Tabs + Date quick filters */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Tab switchers */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>All History</span>
                  <span className="px-1.5 py-0.2 bg-slate-200/80 rounded-md text-[10px] font-mono">
                    {allRows.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('purchases')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'purchases' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-indigo-900'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Purchases</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                    activeTab === 'purchases' ? 'bg-indigo-700 text-white' : 'bg-slate-200/80'
                  }`}>
                    {metrics.purchaseCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('sales')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'sales' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-emerald-900'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Sales</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                    activeTab === 'sales' ? 'bg-emerald-700 text-white' : 'bg-slate-200/80'
                  }`}>
                    {metrics.saleCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('returns')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'returns' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-amber-900'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Returns</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                    activeTab === 'returns' ? 'bg-amber-700 text-white' : 'bg-slate-200/80'
                  }`}>
                    {allRows.filter(r => r.type.includes('return')).length}
                  </span>
                </button>
              </div>

              {/* Date filter chips */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-[11px] font-bold text-slate-500 mr-1 hidden sm:inline">Timeframe:</span>
                {(['all', '30days', '90days', 'this_year'] as const).map(df => (
                  <button
                    key={df}
                    type="button"
                    onClick={() => setDateFilter(df)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors border cursor-pointer ${
                      dateFilter === df
                        ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {df === 'all' ? 'All Time' : df === '30days' ? 'Last 30 Days' : df === '90days' ? 'Last 90 Days' : 'This Year'}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Row: Live Search Input + Sorting Dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              {/* Search input: searches Bill #, Sale ID, Vendor, Customer */}
              <div className="sm:col-span-7 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Bill #, Sale ID, Vendor, Customer, Walk-in, or Notes..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort selection dropdown */}
              <div className="sm:col-span-5 flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 shrink-0 flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  Sort:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as ProductHistorySortOption)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white cursor-pointer"
                >
                  <option value="date_desc">Date: Latest to Oldest</option>
                  <option value="date_asc">Date: Oldest to Latest</option>
                  <option value="price_desc">Price / Rate: High to Low</option>
                  <option value="price_asc">Price / Rate: Low to High</option>
                  <option value="name_asc">Party Name: A to Z</option>
                  <option value="name_desc">Party Name: Z to A</option>
                  <option value="qty_desc">Quantity: High to Low</option>
                  <option value="amount_desc">Total Amount: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* MAIN TRANSACTION TABLE LIST */}
          <div id="product-history-main-content" className="p-2 sm:p-4 space-y-4">
            {filteredAndSortedRows.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                No matching transactions found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || dateFilter !== 'all' || activeTab !== 'all'
                  ? 'Try clearing your search query or switching tabs to see all recorded transactions.'
                  : 'No purchases or sales have been recorded for this product yet.'}
              </p>
              {(searchQuery || dateFilter !== 'all' || activeTab !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setDateFilter('all');
                    setActiveTab('all');
                  }}
                  className="px-3.5 py-1.5 bg-red-50 text-red-600 font-bold text-xs rounded-xl hover:bg-red-100 transition-colors"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                  <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 select-none">
                    <tr>
                      <th className="py-3 px-3.5">Type & Bill #</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3.5">Vendor / Customer</th>
                      <th className="py-3 px-3 text-right">Quantity</th>
                      <th className="py-3 px-3 text-right">Unit Rate / Price</th>
                      <th className="py-3 px-3.5 text-right">Total Amount</th>
                      <th className="py-3 px-3 text-right">Profit / Status</th>
                      <th className="py-3 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredAndSortedRows.map((row) => {
                      const isPurchase = row.type === 'purchase';
                      const isSale = row.type === 'sale';
                      const isCustomerReturn = row.type === 'customer_return';
                      const isVendorReturn = row.type === 'vendor_return';

                      const dateObj = new Date(row.date);
                      const formattedDate = !isNaN(dateObj.getTime())
                        ? dateObj.toLocaleDateString('en-PK', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : row.date;

                      return (
                        <tr 
                          key={row.id} 
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          {/* 1. Type & Bill Number */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2">
                              {isPurchase ? (
                                <span className="p-1 rounded-md bg-indigo-100 text-indigo-700 shrink-0" title="Purchase Bill">
                                  <ArrowDownLeft className="w-3.5 h-3.5" />
                                </span>
                              ) : isSale ? (
                                <span className="p-1 rounded-md bg-emerald-100 text-emerald-700 shrink-0" title="Sale Invoice">
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </span>
                              ) : isCustomerReturn ? (
                                <span className="p-1 rounded-md bg-amber-100 text-amber-700 shrink-0" title="Customer Return (Credit Note)">
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <span className="p-1 rounded-md bg-rose-100 text-rose-700 shrink-0" title="Vendor Return (Debit Note)">
                                  <Undo2 className="w-3.5 h-3.5" />
                                </span>
                              )}

                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-mono font-black text-xs ${
                                    isPurchase ? 'text-indigo-900' : isSale ? 'text-emerald-900' : isCustomerReturn ? 'text-amber-900' : 'text-rose-900'
                                  }`}>
                                    {row.billNumber}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                                  isPurchase ? 'text-indigo-600' : isSale ? 'text-emerald-600' : isCustomerReturn ? 'text-amber-600' : 'text-rose-600'
                                }`}>
                                  {isPurchase ? 'Purchase' : isSale ? 'Sale' : isCustomerReturn ? 'Cust Return' : 'Vendor Return'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 2. Date */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-slate-800 font-semibold text-xs">
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{formattedDate}</span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </td>

                          {/* 3. Vendor / Customer */}
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              {isPurchase || isVendorReturn ? (
                                <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              ) : (
                                <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              )}
                              <span className="truncate max-w-[180px]" title={row.partyName}>
                                {row.partyName}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.2 bg-slate-100 rounded text-[9px] font-medium border border-slate-200">
                                {row.partyType || (isPurchase ? 'Vendor' : 'Customer')}
                              </span>
                              {row.partyPhone && (
                                <span className="font-mono text-slate-400">{row.partyPhone}</span>
                              )}
                            </div>
                          </td>

                          {/* 4. Quantity */}
                          <td className="py-3 px-3 text-right">
                            <div className="font-mono font-black text-xs text-slate-900">
                              {isPurchase ? `+${row.quantity}` : isSale ? `-${row.quantity}` : `${row.quantity}`} {product.unit}
                            </div>
                            {(row.returnedQuantity ?? 0) > 0 && (
                              <div className="text-[10px] font-bold text-amber-700">
                                (ret: {row.returnedQuantity})
                              </div>
                            )}
                          </td>

                          {/* 5. Unit Rate / Price */}
                          <td className="py-3 px-3 text-right font-mono">
                            <div className={`font-black text-xs ${
                              isPurchase ? 'text-red-700' : isSale ? 'text-emerald-700' : 'text-slate-800'
                            }`}>
                              {formatPKR(row.unitPrice)}
                            </div>
                            <div className="text-[9px] text-slate-400">
                              {isPurchase ? 'Buying Cost' : isSale ? 'Sold Rate' : 'Return Rate'}
                            </div>
                          </td>

                          {/* 6. Total Amount */}
                          <td className="py-3 px-3.5 text-right font-mono font-black text-xs text-slate-900">
                            <div>{formatPKR(row.totalAmount)}</div>
                            {isSale && typeof row.costAtSaleTime === 'number' && (
                              <div className="text-[9px] font-normal text-slate-400">
                                Cost: {formatPKR(row.costAtSaleTime * row.quantity)}
                              </div>
                            )}
                          </td>

                          {/* 7. Profit / Status */}
                          <td className="py-3 px-3 text-right">
                            {isSale && typeof row.lineProfit === 'number' ? (
                              <div>
                                <span className={`font-mono font-bold text-xs ${
                                  row.lineProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                                }`}>
                                  {row.lineProfit >= 0 ? '+' : ''}{formatPKR(row.lineProfit)}
                                </span>
                                {row.lineMarginPercent !== undefined && (
                                  <div className="text-[9px] font-mono text-slate-400 font-bold">
                                    {row.lineMarginPercent.toFixed(1)}% margin
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                row.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                row.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-800' :
                                row.paymentStatus === 'credit' || row.paymentStatus === 'unpaid' ? 'bg-rose-100 text-rose-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {row.paymentStatus || 'Settled'}
                              </span>
                            )}
                          </td>

                          {/* 8. Action Button (Open Invoice / Purchase Bill Receipt) */}
                          <td className="py-3 px-3 text-center">
                            {isSale && onViewSaleInvoice ? (
                              <button
                                type="button"
                                onClick={() => onViewSaleInvoice(row.rawRecord as Sale)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1 border border-emerald-200"
                                title="View Complete Sales Invoice"
                              >
                                <Receipt className="w-3 h-3 text-emerald-600" />
                                <span>Invoice</span>
                              </button>
                            ) : isPurchase && onViewPurchaseInvoice ? (
                              <button
                                type="button"
                                onClick={() => onViewPurchaseInvoice(row.rawRecord as Purchase)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1 border border-indigo-200"
                                title="View Purchase Bill Receipt"
                              >
                                <ShoppingBag className="w-3 h-3 text-indigo-600" />
                                <span>Bill</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer summary */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                <div>
                  Showing <span className="font-bold text-slate-900">{filteredAndSortedRows.length}</span> recorded entries
                </div>

                <div className="flex items-center gap-3 text-xs font-mono font-bold">
                  <span className="text-indigo-800">
                    Buy Total: {formatPKR(filteredAndSortedRows.filter(r => r.type === 'purchase').reduce((sum, r) => sum + r.totalAmount, 0))}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-800">
                    Sale Total: {formatPKR(filteredAndSortedRows.filter(r => r.type === 'sale').reduce((sum, r) => sum + r.totalAmount, 0))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* End of UNIFIED SCROLLABLE MODAL BODY */}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Internal ID: <strong className="text-slate-800 font-mono">{product.internalId}</strong> • 
            Part Name: <strong className="text-slate-800">{product.name}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              Download CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
