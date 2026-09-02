import React, { useState, useMemo } from 'react';
import { 
  Purchase, 
  Vendor, 
  Product, 
  PurchaseFilterOptions 
} from '../types';
import { formatPKR, formatPKRShort } from '../services/pricing';
import { 
  Search, 
  Plus, 
  ShoppingBag, 
  Building2, 
  Calendar, 
  DollarSign, 
  FileText, 
  Filter, 
  ArrowUpDown, 
  Printer, 
  Eye, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  X, 
  TrendingUp, 
  SlidersHorizontal,
  Package,
  Layers,
  ArrowUpRight,
  Sparkles,
  Download,
  Truck
} from 'lucide-react';

interface PurchasesPageProps {
  purchases: Purchase[];
  vendors: Vendor[];
  products: Product[];
  onOpenNewPurchase: (vendorId?: string) => void;
  onViewPurchase: (purchase: Purchase) => void;
  onEditPurchase: (purchase: Purchase) => void;
  onDeletePurchase: (purchaseId: string) => void;
  onSelectVendor?: (vendor: Vendor) => void;
  onExportExcel?: () => void;
  onGoToPurchaseOrders?: () => void;
}

export const PurchasesPage: React.FC<PurchasesPageProps> = ({
  purchases,
  vendors,
  products,
  onOpenNewPurchase,
  onViewPurchase,
  onEditPurchase,
  onDeletePurchase,
  onSelectVendor,
  onExportExcel,
  onGoToPurchaseOrders,
}) => {
  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'bill_desc'>('date_desc');
  const [showFiltersDrawer, setShowFiltersDrawer] = useState<boolean>(false);

  // Quick Date Presets
  const setDatePreset = (preset: 'today' | '7days' | 'thisMonth' | 'all') => {
    const today = new Date();
    const toDateStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(toDateStr);
      setEndDate(toDateStr);
    } else if (preset === '7days') {
      const past7 = new Date(Date.now() - 7 * 86400000);
      setStartDate(past7.toISOString().split('T')[0]);
      setEndDate(toDateStr);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(toDateStr);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setVendorFilter('all');
    setStartDate('');
    setEndDate('');
    setPaymentStatusFilter('all');
    setSortBy('date_desc');
  };

  const hasActiveFilters = Boolean(
    searchQuery || vendorFilter !== 'all' || startDate || endDate || paymentStatusFilter !== 'all' || sortBy !== 'date_desc'
  );

  // Filtered and Sorted Purchases
  const filteredPurchases = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return purchases.filter(purchase => {
      // 1. Text Search
      if (normalizedQuery) {
        const matchBill = (purchase.billNumber || '').toLowerCase().includes(normalizedQuery);
        const matchId = (purchase.id || '').toLowerCase().includes(normalizedQuery);
        const matchVendor = (purchase.vendorName || '').toLowerCase().includes(normalizedQuery);
        const matchNotes = (purchase.notes || '').toLowerCase().includes(normalizedQuery);
        const matchPO = (purchase.poNumber || '').toLowerCase().includes(normalizedQuery) ||
                        (purchase.biltyNumber || '').toLowerCase().includes(normalizedQuery) ||
                        (purchase.transporterName || '').toLowerCase().includes(normalizedQuery);

        const matchItems = purchase.items?.some(it => 
          (it.productName || '').toLowerCase().includes(normalizedQuery) ||
          (it.internalId || '').toLowerCase().includes(normalizedQuery) ||
          (it.brandName || '').toLowerCase().includes(normalizedQuery)
        );

        if (!matchBill && !matchId && !matchVendor && !matchNotes && !matchItems && !matchPO) {
          return false;
        }
      }

      // 2. Vendor Filter
      if (vendorFilter && vendorFilter !== 'all' && purchase.vendorId !== vendorFilter) {
        return false;
      }

      // 3. Date Range Filter
      if (startDate) {
        const purchaseDate = new Date(purchase.date || purchase.createdAt).getTime();
        const start = new Date(`${startDate}T00:00:00`).getTime();
        if (purchaseDate < start) return false;
      }

      if (endDate) {
        const purchaseDate = new Date(purchase.date || purchase.createdAt).getTime();
        const end = new Date(`${endDate}T23:59:59`).getTime();
        if (purchaseDate > end) return false;
      }

      // 4. Payment Status Filter
      if (paymentStatusFilter && paymentStatusFilter !== 'all') {
        if (purchase.paymentStatus !== paymentStatusFilter) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt).getTime();
      const dateB = new Date(b.date || b.createdAt).getTime();

      switch (sortBy) {
        case 'date_asc':
          return dateA - dateB;
        case 'amount_desc':
          return (b.totalAmount || 0) - (a.totalAmount || 0);
        case 'amount_asc':
          return (a.totalAmount || 0) - (b.totalAmount || 0);
        case 'bill_desc':
          return (b.billNumber || b.id).localeCompare(a.billNumber || a.id);
        case 'date_desc':
        default:
          return dateB - dateA;
      }
    });
  }, [purchases, searchQuery, vendorFilter, startDate, endDate, paymentStatusFilter, sortBy]);

  // Financial aggregates for purchases
  const summaryStats = useMemo(() => {
    let totalPurchasesAmount = 0;
    let totalPaidAmount = 0;
    let totalBalanceDue = 0;
    let totalUnits = 0;

    for (const p of filteredPurchases) {
      totalPurchasesAmount += p.totalAmount || 0;
      totalPaidAmount += p.amountPaid || 0;
      totalBalanceDue += p.balanceDue || 0;
      if (p.items) {
        for (const it of p.items) {
          totalUnits += it.quantity || 1;
        }
      }
    }

    return {
      totalBillsCount: filteredPurchases.length,
      totalPurchasesAmount,
      totalPaidAmount,
      totalBalanceDue,
      totalUnits,
    };
  }, [filteredPurchases]);

  return (
    <div id="purchases-page" className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-white rounded-3xl p-5 sm:p-7 shadow-xs border border-amber-800/40 relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-amber-200 border border-white/20 shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>Purchases & Vendor Bills</span>
                  <span className="px-2.5 py-0.5 bg-amber-900/60 text-amber-200 text-xs font-bold rounded-lg border border-amber-500/30">
                    FIFO Tracked
                  </span>
                </h1>
                <p className="text-xs text-amber-100/90 font-medium mt-0.5">
                  Record stock buying bills, auto-update inventory costs, and maintain supplier purchase histories
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
            {onGoToPurchaseOrders && (
              <button
                type="button"
                id="btn-goto-purchase-orders"
                onClick={onGoToPurchaseOrders}
                className="px-3.5 py-2 bg-amber-900/60 hover:bg-amber-900/80 active:bg-amber-950 text-white text-xs font-bold rounded-xl border border-amber-400/40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="View Purchase Orders & Receive Cargo"
              >
                <Truck className="w-4 h-4 text-amber-300" />
                <span>Cargo & POs</span>
              </button>
            )}

            {onExportExcel && (
              <button
                type="button"
                onClick={onExportExcel}
                className="px-3.5 py-2 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-bold rounded-xl border border-white/25 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Export purchases data"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            )}

            <button
              type="button"
              id="btn-open-new-purchase"
              onClick={() => onOpenNewPurchase()}
              className="px-4 py-2 bg-white hover:bg-amber-50 active:bg-amber-100 text-amber-900 text-xs font-black rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer select-none"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Record Purchase Bill</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-amber-500/30">
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-white/20">
            <div className="text-[11px] font-bold text-amber-100 uppercase tracking-wider">
              Total Purchases Volume
            </div>
            <div className="text-lg sm:text-xl font-black text-white font-mono mt-0.5">
              {formatPKR(summaryStats.totalPurchasesAmount)}
            </div>
            <div className="text-[10px] text-amber-200 mt-0.5">
              {summaryStats.totalBillsCount} Bills Recorded
            </div>
          </div>

          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-white/20">
            <div className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
              Paid to Vendors
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-100 font-mono mt-0.5">
              {formatPKR(summaryStats.totalPaidAmount)}
            </div>
            <div className="text-[10px] text-emerald-200 mt-0.5">
              Cash payments cleared
            </div>
          </div>

          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-white/20">
            <div className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">
              Balance Due Owed
            </div>
            <div className="text-lg sm:text-xl font-black text-white font-mono mt-0.5">
              {formatPKR(summaryStats.totalBalanceDue)}
            </div>
            <div className="text-[10px] text-amber-200 mt-0.5">
              Payable supplier credit
            </div>
          </div>

          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-white/20">
            <div className="text-[11px] font-bold text-amber-100 uppercase tracking-wider">
              Units Stocked
            </div>
            <div className="text-lg sm:text-xl font-black text-white font-mono mt-0.5">
              {summaryStats.totalUnits.toLocaleString()} Pcs
            </div>
            <div className="text-[10px] text-amber-200 mt-0.5">
              Across all purchase bills
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              id="purchase-page-search-input"
              placeholder="Search by Bill #, Vendor Name, Item Part #, Product Name, Notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setDatePreset('all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer select-none ${
                !startDate && !endDate
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('today')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors cursor-pointer select-none"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('7days')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors cursor-pointer select-none"
            >
              Past 7 Days
            </button>
            <button
              type="button"
              onClick={() => setDatePreset('thisMonth')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors cursor-pointer select-none"
            >
              This Month
            </button>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer select-none ${
                hasActiveFilters || showFiltersDrawer
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-amber-600" />
              )}
            </button>
          </div>
        </div>

        {/* Expandable Advanced Filters Drawer */}
        {showFiltersDrawer && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in">
            {/* Vendor Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Vendor / Supplier
              </label>
              <select
                value={vendorFilter}
                onChange={e => setVendorFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All Vendors ({vendors.length})</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.businessName}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Payment Status
              </label>
              <select
                value={paymentStatusFilter}
                onChange={e => setPaymentStatusFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All Payment Statuses</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Sort Order
              </label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="date_desc">Date (Newest First)</option>
                <option value="date_asc">Date (Oldest First)</option>
                <option value="amount_desc">Amount (Highest First)</option>
                <option value="amount_asc">Amount (Lowest First)</option>
                <option value="bill_desc">Bill Number</option>
              </select>
            </div>

            {/* Reset Action */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Purchases List Table */}
      {filteredPurchases.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200/60 shadow-xs">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900">
            {hasActiveFilters ? 'No purchase bills matched your search' : 'No Purchase Bills Recorded Yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            {hasActiveFilters 
              ? 'Try adjusting your search keywords, clearing date filters, or switching vendor selections.'
              : 'Record vendor purchase bills to update stock counts, adjust inventory buying rates, and maintain FIFO cost batches.'}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Clear Search Filters
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenNewPurchase()}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Record First Purchase Bill</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="px-4 py-3.5">Bill # / Date</th>
                  <th className="px-4 py-3.5">Vendor / Supplier</th>
                  <th className="px-4 py-3.5">Purchased Items</th>
                  <th className="px-4 py-3.5 text-right">Total Bill</th>
                  <th className="px-4 py-3.5 text-right">Paid (Cash)</th>
                  <th className="px-4 py-3.5 text-right">Balance</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.map(purchase => {
                  const formattedDate = new Date(purchase.date || purchase.createdAt).toLocaleDateString('en-PK', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  const totalItemsCount = (purchase.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
                  const returnedItemsCount = (purchase.items || []).reduce((acc, it) => acc + (Number(it.returnedQuantity) || 0), 0);
                  const returnedAmount = typeof purchase.totalReturnedAmount === 'number' && purchase.totalReturnedAmount > 0
                    ? purchase.totalReturnedAmount
                    : (purchase.returnsList || []).reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);

                  const hasReturns = (purchase.hasReturns ?? false) || returnedAmount > 0 || returnedItemsCount > 0;
                  const isFullyReturned = totalItemsCount > 0 && returnedItemsCount >= totalItemsCount;

                  return (
                    <tr 
                      key={purchase.id}
                      onDoubleClick={() => onViewPurchase ? onViewPurchase(purchase) : (onEditPurchase && onEditPurchase(purchase))}
                      className={`transition-colors cursor-pointer select-none group ${
                        isFullyReturned 
                          ? 'bg-slate-50/70 hover:bg-slate-100/70 opacity-85' 
                          : hasReturns 
                          ? 'bg-amber-50/20 hover:bg-amber-50/40' 
                          : 'hover:bg-amber-50/40'
                      }`}
                      title="Double-click to view & print full purchase bill receipt"
                    >
                      {/* Bill # & Date */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-mono font-black text-xs ${isFullyReturned ? 'text-slate-500 line-through' : 'text-amber-900'}`}>
                            {purchase.billNumber || purchase.id}
                          </span>
                          {purchase.poNumber && (
                            <span 
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200"
                              title={`Derived from Purchase Order #${purchase.poNumber}${purchase.biltyNumber ? ` (Bilty: ${purchase.biltyNumber})` : ''}`}
                            >
                              PO: {purchase.poNumber}
                            </span>
                          )}
                          {isFullyReturned ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                              Fully Returned
                            </span>
                          ) : hasReturns ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              Returned ({returnedItemsCount}/{totalItemsCount})
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{formattedDate}</span>
                          </div>
                          {purchase.cargoCost && purchase.cargoCost > 0 ? (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              Freight: ₨ {purchase.cargoCost.toLocaleString()}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Vendor */}
                      <td className="px-4 py-3.5">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            const found = vendors.find(v => v.id === purchase.vendorId);
                            if (found && onSelectVendor) onSelectVendor(found);
                          }}
                          className="font-black text-slate-900 hover:text-amber-700 cursor-pointer flex items-center gap-1.5"
                        >
                          <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate max-w-[180px]">{purchase.vendorName}</span>
                        </div>
                        {purchase.notes && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">
                            {purchase.notes}
                          </div>
                        )}
                      </td>

                      {/* Items */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1 max-w-xs">
                          {purchase.items?.slice(0, 2).map((it, idx) => {
                            const isItemReturned = (Number(it.returnedQuantity) || 0) > 0;
                            const isItemFullyReturned = isItemReturned && (Number(it.returnedQuantity) || 0) >= (Number(it.quantity) || 0);

                            return (
                              <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                <span className="font-mono font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded text-[10px]">
                                  {it.internalId}
                                </span>
                                <span className={`font-semibold truncate ${isItemFullyReturned ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                  {it.productName}
                                </span>
                                <span className="text-slate-500 text-[10px] whitespace-nowrap">
                                  ({it.quantity} {it.unit || 'Pcs'}{isItemReturned ? ` • ret ${it.returnedQuantity}` : ''} @ ₨ {it.unitPrice.toLocaleString()})
                                </span>
                              </div>
                            );
                          })}
                          {purchase.items && purchase.items.length > 2 && (
                            <div className="text-[10px] text-amber-700 font-bold">
                              + {purchase.items.length - 2} more line items
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Total Bill */}
                      <td className="px-4 py-3.5 text-right font-mono font-black text-slate-900 text-xs">
                        <div>{formatPKR(purchase.totalAmount)}</div>
                        {returnedAmount > 0 && (
                          <div className="text-[10px] text-amber-800 font-bold">
                            - ₨ {returnedAmount.toLocaleString()} ret
                          </div>
                        )}
                      </td>

                      {/* Paid */}
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-700 text-xs">
                        {formatPKR(purchase.amountPaid)}
                      </td>

                      {/* Balance Due */}
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-xs">
                        <span className={purchase.balanceDue > 0 ? 'text-red-700 font-black' : 'text-slate-400'}>
                          {formatPKR(purchase.balanceDue)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isFullyReturned
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : purchase.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            purchase.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            'bg-red-100 text-red-800 border border-red-300'
                        }`}>
                          {isFullyReturned ? 'RETURNED' : purchase.paymentStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onViewPurchase(purchase)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                            title="View / Print Purchase Bill Receipt"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditPurchase(purchase)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Purchase Bill"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeletePurchase(purchase.id)}
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                            title="Delete Purchase Bill & Rollback Stock"
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
      )}
    </div>
  );
};
