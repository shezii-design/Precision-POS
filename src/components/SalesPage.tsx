import React, { useState, useMemo, useRef } from 'react';
import { Customer, CustomerReturn, Product, Sale, SaleFilterOptions } from '../types';
import { formatPKR, formatPKRShort } from '../services/pricing';
import { calculateSalesSummary, filterAndSortSales, formatItemInvoiceName } from '../services/sales';
import { 
  Search, 
  Plus, 
  Calendar, 
  DollarSign, 
  Filter, 
  ArrowUpDown, 
  FileText, 
  User, 
  Phone, 
  CreditCard, 
  Banknote, 
  Printer, 
  Eye, 
  Trash2, 
  Edit,
  RefreshCw, 
  ChevronDown, 
  SlidersHorizontal,
  X,
  TrendingUp,
  Receipt,
  ShoppingCart,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

interface SalesPageProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  customerReturns?: CustomerReturn[];
  onOpenNewSale: () => void;
  onViewInvoice: (sale: Sale) => void;
  onEditSale?: (sale: Sale) => void;
  onDeleteSale?: (saleId: string) => void;
  onOpenCustomerReturn?: (sale: Sale) => void;
}

export const SalesPage: React.FC<SalesPageProps> = ({
  sales,
  products,
  customers,
  customerReturns = [],
  onOpenNewSale,
  onViewInvoice,
  onEditSale,
  onDeleteSale,
  onOpenCustomerReturn,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'all' | 'cash' | 'credit' | 'partial'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'id_desc' | 'id_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [showFiltersDrawer, setShowFiltersDrawer] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

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
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setPaymentTypeFilter('all');
    setSortBy('date_desc');
  };

  const hasActiveFilters = Boolean(
    searchQuery || startDate || endDate || minAmount || maxAmount || paymentTypeFilter !== 'all' || sortBy !== 'date_desc'
  );

  // Filtered & Sorted Sales
  const filteredSales = useMemo(() => {
    const filterOptions: SaleFilterOptions = {
      searchQuery,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
      paymentType: paymentTypeFilter,
      sortBy,
    };
    return filterAndSortSales(sales, filterOptions);
  }, [sales, searchQuery, startDate, endDate, minAmount, maxAmount, paymentTypeFilter, sortBy]);

  // Summary Metrics
  const summary = useMemo(() => {
    return calculateSalesSummary(filteredSales);
  }, [filteredSales]);

  return (
    <div id="sales-page" className="space-y-6">
      {/* Top Banner / Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
        {/* Metric 1: Total Invoices */}
        <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-2xs min-w-0">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Total Invoices</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate">
            {summary.totalInvoices}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
            {summary.totalItemsSold} parts sold
          </p>
        </div>

        {/* Metric 2: Total Sales Revenue */}
        <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-2xs min-w-0">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Total Sales</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-black text-xs shrink-0">
              ₨
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-red-600 tracking-tight truncate">
            {formatPKRShort(summary.totalRevenue)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
            Gross sales revenue
          </p>
        </div>

        {/* Metric 3: Gross Profit (FIFO) */}
        <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-2xs min-w-0">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Gross Profit</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 tracking-tight truncate">
            {formatPKRShort(summary.totalGrossProfit)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
            COGS: {formatPKRShort(summary.totalCogs)} (FIFO)
          </p>
        </div>

        {/* Metric 4: Cash Collected */}
        <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-2xs min-w-0">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Cash Received</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Banknote className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 tracking-tight truncate">
            {formatPKRShort(summary.totalCashReceived)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
            Realized cash receipts
          </p>
        </div>

        {/* Metric 5: Credit / Receivables */}
        <div className="bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-2xs min-w-0 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate">Credit Due</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-600 tracking-tight truncate">
            {formatPKRShort(summary.totalCreditOutstanding)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
            Pending customer credit
          </p>
        </div>
      </div>

      {/* Main Control Card: Search, Sort & Action Button */}
      <div className="bg-white rounded-3xl p-3.5 sm:p-6 border border-slate-200 shadow-xs space-y-3 sm:space-y-4">
        {/* Row 1: Search Bar & + Make Sale Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
          {/* Main Sales Search Bar */}
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Invoice ID, Date, Customer Name, Phone, Item..."
              className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2.5 sm:py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-colors shadow-2xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right Action: Filters Toggle & + New Sale Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
              className={`flex-1 sm:flex-initial justify-center px-3 py-2 sm:py-3 rounded-2xl text-xs font-bold transition-colors flex items-center gap-1.5 border cursor-pointer select-none ${
                showFiltersDrawer || hasActiveFilters
                  ? 'bg-red-50 text-red-700 border-red-300 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
              )}
            </button>

            {/* + Button for Recording a Sale */}
            <button
              type="button"
              onClick={() => onOpenNewSale()}
              className="flex-1 sm:flex-initial justify-center px-3.5 sm:px-5 py-2 sm:py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs sm:text-sm font-black rounded-2xl shadow-xs transition-colors flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none"
              title="Record a Sale (Shortcut: F5)"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Record Sale</span>
              <kbd className="hidden md:inline-flex text-[10px] font-mono font-bold bg-black/20 text-white/90 px-1.5 py-0.2 rounded border border-white/20">
                F5
              </kbd>
            </button>
          </div>
        </div>

        {/* Row 2: Advanced Filters Drawer (Date Range, Amount Range, Sort & Sale Type) */}
        {showFiltersDrawer && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
            {/* Quick Date Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider mr-1">Date Presets:</span>
              <button
                type="button"
                onClick={() => setDatePreset('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  !startDate && !endDate ? 'bg-red-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('today')}
                className="px-2.5 py-1 bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('7days')}
                className="px-2.5 py-1 bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('thisMonth')}
                className="px-2.5 py-1 bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                This Month
              </button>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Date From */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-hidden focus:border-red-500"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-hidden focus:border-red-500"
                />
              </div>

              {/* Min Amount */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Min Amount (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-hidden focus:border-red-500"
                />
              </div>

              {/* Max Amount */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Max Amount (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-hidden focus:border-red-500"
                />
              </div>
            </div>

            {/* Bottom Row: Sort & Sale Type */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-3">
                {/* Sale Type (Cash vs Credit vs Semi-Paid) */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-600">Type:</span>
                  <select
                    value={paymentTypeFilter}
                    onChange={(e) => setPaymentTypeFilter(e.target.value as any)}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-red-500 cursor-pointer"
                  >
                    <option value="all">All Types</option>
                    <option value="cash">Full Cash (Paid)</option>
                    <option value="partial">Semi-Paid / Half Paid</option>
                    <option value="credit">Credit Sale (Unpaid)</option>
                  </select>
                </div>

                {/* Sort Option */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-600">Sort By:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-red-500"
                  >
                    <option value="date_desc">Date: Latest to Oldest</option>
                    <option value="date_asc">Date: Oldest to Latest</option>
                    <option value="id_desc">Sales ID: Highest to Lowest</option>
                    <option value="id_asc">Sales ID: Lowest to Highest</option>
                    <option value="amount_desc">Amount: High to Low</option>
                    <option value="amount_asc">Amount: Low to High</option>
                  </select>
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-red-600 hover:text-red-800 underline cursor-pointer"
                >
                  Reset all filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Instruction Note for Double-Click */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-red-600"></span>
            <strong>Tip:</strong> Double-click any row to view complete contents, invoice items & print receipt.
          </span>
          <span className="font-semibold text-slate-600">
            Showing {filteredSales.length} of {sales.length} sales
          </span>
        </div>

        {/* SALES TABLE */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Sales ID</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Type of Sale</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-bold text-slate-600">No sales found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {hasActiveFilters ? 'Try adjusting your search or filters' : 'Click "+ Record Sale" or press F5 to make your first sale'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => {
                    const formattedDate = new Date(sale.date || sale.createdAt).toLocaleDateString('en-PK', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    const totalItemsCount = (sale.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
                    const returnedItemsCount = (sale.items || []).reduce((acc, it) => acc + (Number(it.returnedQuantity) || 0), 0);
                    const returnedAmount = typeof sale.totalReturnedAmount === 'number' && sale.totalReturnedAmount > 0
                      ? sale.totalReturnedAmount
                      : (sale.returnsList || []).reduce((sum, r) => sum + (Number(r.totalRefundAmount) || 0), 0);

                    const hasReturns = (sale.hasReturns ?? false) || returnedAmount > 0 || returnedItemsCount > 0;
                    const isFullyReturned = totalItemsCount > 0 && returnedItemsCount >= totalItemsCount;

                    return (
                      <tr
                        key={sale.id}
                        onDoubleClick={() => onViewInvoice ? onViewInvoice(sale) : (onEditSale && onEditSale(sale))}
                        className={`transition-colors cursor-pointer select-none group ${
                          isFullyReturned 
                            ? 'bg-slate-50/70 hover:bg-slate-100/70 opacity-80' 
                            : hasReturns 
                            ? 'bg-amber-50/20 hover:bg-amber-50/40' 
                            : 'hover:bg-red-50/40'
                        }`}
                        title="Double-click to view & print full invoice details"
                      >
                        {/* 1. Sales ID */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-slate-900 bg-slate-100 group-hover:bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs">
                              {sale.id}
                            </span>
                          </div>
                        </td>

                        {/* 2. Date & Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                          {formattedDate}
                        </td>

                        {/* 3. Customer Name & Phone */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {sale.customerName}
                          </div>
                          {sale.customerPhone && (
                            <div className="text-[11px] text-slate-500 font-mono">
                              {sale.customerPhone}
                            </div>
                          )}
                        </td>

                        {/* 4. Type of Sale: Cash vs Semi-Paid vs Credit + Return Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            {sale.paymentType === 'cash' || (sale.amountReceived >= sale.totalAmount && sale.totalAmount > 0) ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-bold border border-emerald-200">
                                <Banknote className="w-3 h-3" />
                                <span>Cash (Paid)</span>
                              </span>
                            ) : sale.amountReceived > 0 && sale.amountReceived < sale.totalAmount ? (
                              <div className="inline-flex flex-col">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-900 rounded-full text-[11px] font-bold border border-amber-300">
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  <span>Semi-Paid</span>
                                </span>
                                <span className="text-[10px] text-amber-800 font-bold mt-0.5 ml-1">
                                  Due: {formatPKR(sale.balanceDue || (sale.totalAmount - sale.amountReceived))}
                                </span>
                              </div>
                            ) : (
                              <div className="inline-flex flex-col">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-[11px] font-bold border border-red-200">
                                  <CreditCard className="w-3 h-3" />
                                  <span>Credit Sale</span>
                                </span>
                                <span className="text-[10px] text-red-600 font-bold mt-0.5 ml-1">
                                  Due: {formatPKR(sale.balanceDue || sale.totalAmount)}
                                </span>
                              </div>
                            )}

                            {/* Return indicator chip */}
                            {hasReturns && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border ${
                                isFullyReturned 
                                  ? 'bg-slate-200 text-slate-800 border-slate-300' 
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}>
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>{isFullyReturned ? 'Fully Returned' : `Return: -${formatPKR(returnedAmount)}`}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5. Items Summary */}
                        <td className="py-3.5 px-4 text-slate-700">
                          <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
                            <span>{totalItemsCount} item{totalItemsCount === 1 ? '' : 's'}</span>
                            {hasReturns && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                                {returnedItemsCount}/{totalItemsCount} ret
                              </span>
                            )}
                            {(() => {
                              const locationsUsed = Array.from(new Set(sale.items?.map(it => it.locationName).filter(Boolean)));
                              if (locationsUsed.length === 1) {
                                return (
                                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-medium">
                                    {locationsUsed[0]}
                                  </span>
                                );
                              }
                              if (locationsUsed.length > 1) {
                                return (
                                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-medium">
                                    {locationsUsed.length} Locs
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {sale.items?.map(it => formatItemInvoiceName(it, sale.invoiceNamingPreference)).join(', ')}
                          </div>
                        </td>

                        {/* 6. Total Amount */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="text-sm font-black text-slate-900">
                            {formatPKR(sale.totalAmount)}
                          </div>
                          {hasReturns && (
                            <div className="text-[10px] text-amber-700 font-bold">
                              Net: {formatPKR(sale.netAmount ?? (sale.totalAmount - returnedAmount))}
                            </div>
                          )}
                          {sale.discountAmount > 0 && (
                            <div className="text-[10px] text-amber-600 font-bold">
                              Discount: -{formatPKR(sale.discountAmount)}
                            </div>
                          )}
                          {sale.totalProfit !== undefined ? (
                            <div className={`text-[10px] font-bold ${sale.totalProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                              Profit: {sale.totalProfit >= 0 ? '+' : ''}{formatPKR(sale.totalProfit)}
                            </div>
                          ) : (() => {
                            const calculatedCost = sale.items?.reduce((acc, it) => acc + ((it.costPrice || it.fifoCost || 0) * (it.quantity || 1)), 0) || 0;
                            const profit = (sale.totalAmount || 0) - calculatedCost;
                            return (
                              <div className={`text-[10px] font-bold ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                Profit: {profit >= 0 ? '+' : ''}{formatPKR(profit)}
                              </div>
                            );
                          })()}
                        </td>

                        {/* 7. Actions */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {onOpenCustomerReturn && !isFullyReturned && (
                              <button
                                type="button"
                                onClick={() => onOpenCustomerReturn(sale)}
                                className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 rounded-lg transition-colors cursor-pointer"
                                title="Process Customer Return for this Sale"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            {onEditSale && (
                              <button
                                type="button"
                                onClick={() => onEditSale(sale)}
                                className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 rounded-lg transition-colors cursor-pointer"
                                title="Edit Sale"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onViewInvoice(sale)}
                              className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
                              title="View / Print Invoice"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onViewInvoice(sale)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Print Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
