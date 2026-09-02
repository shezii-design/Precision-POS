import React, { useState, useMemo } from 'react';
import { 
  RotateCcw, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  PackageCheck, 
  PackageMinus, 
  FileText, 
  Printer, 
  Edit, 
  Trash2, 
  User, 
  Building2, 
  ArrowUpDown, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingDown,
  Layers,
  ChevronRight,
  Tag
} from 'lucide-react';
import { 
  Customer, 
  CustomerReturn, 
  Product, 
  Purchase, 
  Sale, 
  Vendor, 
  VendorReturn 
} from '../types';

interface ReturnsPageProps {
  customerReturns: CustomerReturn[];
  vendorReturns: VendorReturn[];
  products: Product[];
  customers: Customer[];
  vendors: Vendor[];
  sales: Sale[];
  purchases: Purchase[];
  onOpenCustomerReturnModal: (returnDoc?: CustomerReturn) => void;
  onOpenVendorReturnModal: (returnDoc?: VendorReturn) => void;
  onViewVoucher: (returnDoc: CustomerReturn | VendorReturn, type: 'customer' | 'vendor') => void;
  onDeleteCustomerReturn: (returnId: string) => void;
  onDeleteVendorReturn: (returnId: string) => void;
}

type ActiveTab = 'customer' | 'vendor';

export const ReturnsPage: React.FC<ReturnsPageProps> = ({
  customerReturns,
  vendorReturns,
  products,
  customers,
  vendors,
  sales,
  purchases,
  onOpenCustomerReturnModal,
  onOpenVendorReturnModal,
  onViewVoucher,
  onDeleteCustomerReturn,
  onDeleteVendorReturn,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('customer');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    number: string;
    type: 'customer' | 'vendor';
  } | null>(null);

  // Filter and Sort Customer Returns
  const filteredCustomerReturns = useMemo(() => {
    return customerReturns.filter(ret => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNumber = ret.returnNumber?.toLowerCase().includes(q) || ret.id?.toLowerCase().includes(q);
        const matchCreditNote = ret.creditNoteNumber?.toLowerCase().includes(q);
        const matchCustomer = ret.customerName?.toLowerCase().includes(q) || ret.customerPhone?.includes(q);
        const matchSaleId = ret.saleId?.toLowerCase().includes(q);
        const matchItems = ret.items?.some(it => 
          it.productName?.toLowerCase().includes(q) || 
          it.internalId?.toLowerCase().includes(q) ||
          it.reason?.toLowerCase().includes(q)
        );

        if (!matchNumber && !matchCreditNote && !matchCustomer && !matchSaleId && !matchItems) {
          return false;
        }
      }

      // 2. Date Filter
      if (dateFilter !== 'all') {
        const retDate = new Date(ret.date).getTime();
        const now = new Date().getTime();

        if (dateFilter === 'today') {
          const today = new Date().toISOString().split('T')[0];
          if (!ret.date.startsWith(today)) return false;
        } else if (dateFilter === '7days') {
          if (now - retDate > 7 * 86400000) return false;
        } else if (dateFilter === 'month') {
          if (now - retDate > 30 * 86400000) return false;
        } else if (dateFilter === 'custom') {
          if (customStartDate && new Date(ret.date) < new Date(customStartDate)) return false;
          if (customEndDate && new Date(ret.date) > new Date(customEndDate + 'T23:59:59')) return false;
        }
      }

      // 3. Method Filter
      if (methodFilter !== 'all' && ret.refundMethod !== methodFilter) {
        return false;
      }

      // 4. Condition Filter
      if (conditionFilter !== 'all') {
        const hasCondition = ret.items?.some(it => it.condition === conditionFilter);
        if (!hasCondition) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'amount_desc') return (b.totalRefundAmount || 0) - (a.totalRefundAmount || 0);
      if (sortBy === 'amount_asc') return (a.totalRefundAmount || 0) - (b.totalRefundAmount || 0);
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [customerReturns, searchQuery, dateFilter, customStartDate, customEndDate, methodFilter, conditionFilter, sortBy]);

  // Filter and Sort Vendor Returns
  const filteredVendorReturns = useMemo(() => {
    return vendorReturns.filter(ret => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNumber = ret.returnNumber?.toLowerCase().includes(q) || ret.id?.toLowerCase().includes(q);
        const matchDebitNote = ret.debitNoteNumber?.toLowerCase().includes(q);
        const matchVendor = ret.vendorName?.toLowerCase().includes(q);
        const matchPurchaseId = ret.purchaseId?.toLowerCase().includes(q);
        const matchItems = ret.items?.some(it => 
          it.productName?.toLowerCase().includes(q) || 
          it.internalId?.toLowerCase().includes(q) ||
          it.reason?.toLowerCase().includes(q)
        );

        if (!matchNumber && !matchDebitNote && !matchVendor && !matchPurchaseId && !matchItems) {
          return false;
        }
      }

      // 2. Date Filter
      if (dateFilter !== 'all') {
        const retDate = new Date(ret.date).getTime();
        const now = new Date().getTime();

        if (dateFilter === 'today') {
          const today = new Date().toISOString().split('T')[0];
          if (!ret.date.startsWith(today)) return false;
        } else if (dateFilter === '7days') {
          if (now - retDate > 7 * 86400000) return false;
        } else if (dateFilter === 'month') {
          if (now - retDate > 30 * 86400000) return false;
        } else if (dateFilter === 'custom') {
          if (customStartDate && new Date(ret.date) < new Date(customStartDate)) return false;
          if (customEndDate && new Date(ret.date) > new Date(customEndDate + 'T23:59:59')) return false;
        }
      }

      // 3. Method Filter
      if (methodFilter !== 'all' && ret.settlementMethod !== methodFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'amount_desc') return (b.totalAmount || 0) - (a.totalAmount || 0);
      if (sortBy === 'amount_asc') return (a.totalAmount || 0) - (b.totalAmount || 0);
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [vendorReturns, searchQuery, dateFilter, customStartDate, customEndDate, methodFilter, sortBy]);

  // Analytics Metrics
  const customerStats = useMemo(() => {
    const totalAmount = customerReturns.reduce((sum, r) => sum + (Number(r.totalRefundAmount) || 0), 0);
    let totalRestockedQty = 0;
    let totalDamagedQty = 0;
    let khataCreditTotal = 0;
    let cashRefundTotal = 0;

    for (const r of customerReturns) {
      if (r.refundMethod === 'khata_credit') khataCreditTotal += Number(r.totalRefundAmount) || 0;
      else if (r.refundMethod === 'cash_refund') cashRefundTotal += Number(r.totalRefundAmount) || 0;

      for (const item of r.items || []) {
        if (item.condition === 'restock') totalRestockedQty += Number(item.quantity) || 0;
        else totalDamagedQty += Number(item.quantity) || 0;
      }
    }

    return {
      totalAmount,
      totalCount: customerReturns.length,
      totalRestockedQty,
      totalDamagedQty,
      khataCreditTotal,
      cashRefundTotal,
    };
  }, [customerReturns]);

  const vendorStats = useMemo(() => {
    const totalAmount = vendorReturns.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
    let debitNoteTotal = 0;
    let pendingReplacements = 0;
    let totalItemsReturned = 0;

    for (const r of vendorReturns) {
      if (r.settlementMethod === 'debit_note') debitNoteTotal += Number(r.totalAmount) || 0;
      if (r.settlementStatus === 'pending' || r.settlementMethod === 'replacement_pending') {
        pendingReplacements++;
      }
      for (const it of r.items || []) {
        totalItemsReturned += Number(it.quantity) || 0;
      }
    }

    return {
      totalAmount,
      totalCount: vendorReturns.length,
      debitNoteTotal,
      pendingReplacements,
      totalItemsReturned,
    };
  }, [vendorReturns]);

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'customer') {
      onDeleteCustomerReturn(deleteConfirm.id);
    } else {
      onDeleteVendorReturn(deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

  return (
    <div id="returns-page" className="space-y-6">
      {/* Workspace Header Banner */}
      <div className="bg-white border border-slate-200 shadow-xs p-5 sm:p-6 rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center shadow-md shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Returns & Debit / Credit Notes
                </h1>
                <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-800 rounded-full">
                  {customerReturns.length + vendorReturns.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Manage customer sales returns (inward), restock vs damaged scrap, and vendor purchase returns (outward debit notes).
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenCustomerReturnModal()}
              className="px-3.5 sm:px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Customer Return</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenVendorReturnModal()}
              className="px-3.5 sm:px-4 py-2 text-xs font-black text-slate-800 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-red-600" />
              <span>+ Vendor Return (Debit Note)</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Toggle */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 flex-wrap">
          <button
            type="button"
            onClick={() => { setActiveTab('customer'); setMethodFilter('all'); }}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-colors flex items-center gap-2 cursor-pointer select-none ${
              activeTab === 'customer'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span>Customer Returns (Inward)</span>
            <span className={`px-2 py-0.2 text-[10px] rounded-full font-bold ${
              activeTab === 'customer' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {customerReturns.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('vendor'); setMethodFilter('all'); }}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-colors flex items-center gap-2 cursor-pointer select-none ${
              activeTab === 'vendor'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Vendor Returns (Outward / Debit Notes)</span>
            <span className={`px-2 py-0.2 text-[10px] rounded-full font-bold ${
              activeTab === 'vendor' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {vendorReturns.length}
            </span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* KPI Metrics Banner */}
        {activeTab === 'customer' ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Customer Returns */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-black uppercase tracking-wider">Total Customer Returns</span>
                <RotateCcw className="w-4 h-4 text-red-600" />
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900">
                Rs. {customerStats.totalAmount.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                {customerStats.totalCount} sales return transactions
              </p>
            </div>

            {/* Card 2: Restocked Inventory */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-black uppercase tracking-wider">Restocked Filters</span>
                <PackageCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-black text-emerald-600">
                {customerStats.totalRestockedQty} Pcs
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Added back to sellable stock
              </p>
            </div>

            {/* Card 3: Damaged / Scrap */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-black uppercase tracking-wider">Damaged / Scrap</span>
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-black text-amber-600">
                {customerStats.totalDamagedQty} Pcs
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Defective units (not restocked)
              </p>
            </div>

            {/* Card 4: Khata Credit Settlement */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-black uppercase tracking-wider">Khata Balance Credits</span>
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-black text-blue-600">
                Rs. {customerStats.khataCreditTotal.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Deducted from customer receivables
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Vendor Returns */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-black uppercase tracking-wider">Total Purchase Returns</span>
                <RotateCcw className="w-4 h-4 text-red-600" />
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900">
                Rs. {vendorStats.totalAmount.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                {vendorStats.totalCount} supplier return notes
              </p>
            </div>

            {/* Card 2: Items Shipped Back */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-black uppercase tracking-wider">Parts Returned</span>
                <PackageMinus className="w-4 h-4 text-rose-600" />
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-black text-rose-600">
                {vendorStats.totalItemsReturned} Pcs
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Deducted from store inventory
              </p>
            </div>

            {/* Card 3: Debit Notes Claimed */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-black uppercase tracking-wider">Debit Notes Adjusted</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-black text-emerald-600">
                Rs. {vendorStats.debitNoteTotal.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Deducted from supplier payables
              </p>
            </div>

            {/* Card 4: Pending Replacements */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-black uppercase tracking-wider">Pending Claims</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-black text-amber-600">
                {vendorStats.pendingReplacements} Claims
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Awaiting supplier replacement / credit
              </p>
            </div>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Search Input */}
            <div className="sm:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'customer' 
                  ? "Search by Customer, Return #, Credit Note, Part #, Reason..." 
                  : "Search by Vendor, Debit Note #, Bill #, Part #, Reason..."}
                className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Date Filter */}
            <div className="sm:col-span-2">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {/* Method Filter */}
            <div className="sm:col-span-3">
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="all">All Settlement Methods</option>
                {activeTab === 'customer' ? (
                  <>
                    <option value="khata_credit">💳 Khata Credit Note</option>
                    <option value="cash_refund">💵 Cash Refund (Counter)</option>
                    <option value="bank_refund">🏦 Bank Transfer</option>
                    <option value="exchange">🔁 Exchange / Replacement</option>
                  </>
                ) : (
                  <>
                    <option value="debit_note">💳 Debit Note (Payable Deduction)</option>
                    <option value="cash_refund">💵 Cash Refund Received</option>
                    <option value="bank_refund">🏦 Bank Transfer</option>
                    <option value="replacement_pending">⏳ Replacement Pending</option>
                  </>
                )}
              </select>
            </div>

            {/* Condition Filter (Customer Only) */}
            {activeTab === 'customer' && (
              <div className="sm:col-span-2">
                <select
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="all">All Conditions</option>
                  <option value="restock">🟢 Restocked (Sellable)</option>
                  <option value="damaged">🔴 Damaged / Defective</option>
                  <option value="scrap">⚪ Scrap</option>
                </select>
              </div>
            )}

            {/* Sort Filter */}
            <div className={activeTab === 'customer' ? "sm:col-span-1" : "sm:col-span-3"}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full h-10 px-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="amount_desc">Amount (High to Low)</option>
                <option value="amount_asc">Amount (Low to High)</option>
              </select>
            </div>
          </div>

          {/* Custom Date Range Row */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg"
              />
              <span className="text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Data Table Section */}
        {activeTab === 'customer' ? (
          /* CUSTOMER RETURNS TABLE */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Customer Sales Returns List
                </span>
                <span className="px-2 py-0.5 text-[11px] font-bold bg-slate-200 text-slate-700 rounded-md">
                  {filteredCustomerReturns.length} Records
                </span>
              </div>
            </div>

            {filteredCustomerReturns.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">No customer returns found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery || dateFilter !== 'all' || methodFilter !== 'all' || conditionFilter !== 'all'
                    ? 'No return records matched your search filters. Try adjusting your criteria.'
                    : 'No sales returns have been recorded yet. Click below to record your first customer return.'}
                </p>
                <button
                  type="button"
                  onClick={() => onOpenCustomerReturnModal()}
                  className="px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record Customer Return</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-black">
                      <th className="py-3 px-4">Date & Return #</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Items Returned & Condition</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Settlement</th>
                      <th className="py-3 px-4 text-right">Net Refund (Rs.)</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCustomerReturns.map(ret => (
                      <tr key={ret.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Date & Return # */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-black text-slate-900">{ret.returnNumber}</div>
                          <div className="text-[11px] font-medium text-slate-500">
                            {new Date(ret.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          {ret.creditNoteNumber && (
                            <span className="inline-block px-1.5 py-0.2 text-[10px] font-mono font-bold bg-red-50 text-red-700 border border-red-200 rounded mt-1">
                              {ret.creditNoteNumber}
                            </span>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-bold text-slate-900">{ret.customerName}</div>
                          {ret.customerPhone && (
                            <div className="text-[11px] text-slate-500">{ret.customerPhone}</div>
                          )}
                          {ret.saleId ? (
                            <div className="text-[10px] text-slate-600 mt-0.5">
                              Inv Ref: <span className="font-mono font-bold text-red-700">{ret.saleId}</span>
                            </div>
                          ) : (
                            <span className="inline-block text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded mt-0.5">
                              Direct Return
                            </span>
                          )}
                        </td>

                        {/* Items Returned */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1 max-w-xs">
                            {ret.items?.map((item, idx) => (
                              <div key={idx} className="flex items-start justify-between gap-1 text-[11px]">
                                <div>
                                  <span className="font-bold text-slate-800">{item.productName}</span>
                                  {item.internalId && (
                                    <span className="text-[10px] text-slate-500 font-mono ml-1">[{item.internalId}]</span>
                                  )}
                                  <span className="text-slate-600 font-bold ml-1">x{item.quantity}</span>
                                </div>
                                <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded shrink-0 ${
                                  item.condition === 'restock'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {item.condition === 'restock' ? 'Restocked' : 'Damaged'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Reason */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="text-[11px] font-semibold text-slate-700">
                            {ret.items?.[0]?.reason || 'Return'}
                          </div>
                          {ret.notes && (
                            <div className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">
                              {ret.notes}
                            </div>
                          )}
                        </td>

                        {/* Settlement Method */}
                        <td className="py-3.5 px-4 align-top">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md ${
                            ret.refundMethod === 'khata_credit'
                              ? 'bg-red-100 text-red-800'
                              : ret.refundMethod === 'cash_refund'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {ret.refundMethod === 'khata_credit' && '💳 Khata Credit'}
                            {ret.refundMethod === 'cash_refund' && '💵 Cash Refund'}
                            {ret.refundMethod === 'bank_refund' && '🏦 Bank Transfer'}
                            {ret.refundMethod === 'exchange' && '🔁 Exchange'}
                          </span>
                        </td>

                        {/* Net Refund Amount */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="font-black text-sm text-slate-900">
                            Rs. {ret.totalRefundAmount?.toLocaleString()}
                          </div>
                          {ret.deductionOrRestockFee && ret.deductionOrRestockFee > 0 ? (
                            <div className="text-[10px] text-amber-600 font-medium">
                              Fee: -Rs. {ret.deductionOrRestockFee.toLocaleString()}
                            </div>
                          ) : null}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onViewVoucher(ret, 'customer')}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Print Credit Note Voucher"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenCustomerReturnModal(ret)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Return"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm({ id: ret.id, number: ret.returnNumber, type: 'customer' })}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Return Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* VENDOR RETURNS TABLE */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Vendor Purchase Returns & Debit Notes List
                </span>
                <span className="px-2 py-0.5 text-[11px] font-bold bg-slate-200 text-slate-700 rounded-md">
                  {filteredVendorReturns.length} Records
                </span>
              </div>
            </div>

            {filteredVendorReturns.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">No vendor returns found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery || dateFilter !== 'all' || methodFilter !== 'all'
                    ? 'No return records matched your search filters. Try adjusting your criteria.'
                    : 'No supplier purchase returns have been recorded yet. Click below to record your first vendor debit note.'}
                </p>
                <button
                  type="button"
                  onClick={() => onOpenVendorReturnModal()}
                  className="px-4 py-2 text-xs font-black text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4 text-red-500" />
                  <span>Record Vendor Return (Debit Note)</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-black">
                      <th className="py-3 px-4">Date & Return #</th>
                      <th className="py-3 px-4">Supplier / Vendor</th>
                      <th className="py-3 px-4">Items Returned to Supplier</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Settlement</th>
                      <th className="py-3 px-4 text-right">Debit Note (Rs.)</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVendorReturns.map(ret => (
                      <tr key={ret.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Date & Return # */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-black text-slate-900">{ret.returnNumber}</div>
                          <div className="text-[11px] font-medium text-slate-500">
                            {new Date(ret.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          {ret.debitNoteNumber && (
                            <span className="inline-block px-1.5 py-0.2 text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 rounded mt-1">
                              {ret.debitNoteNumber}
                            </span>
                          )}
                        </td>

                        {/* Vendor */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-bold text-slate-900">{ret.vendorName}</div>
                          {ret.purchaseId ? (
                            <div className="text-[10px] text-slate-600 mt-0.5">
                              Purchase Bill: <span className="font-mono font-bold text-red-700">{ret.purchaseId}</span>
                            </div>
                          ) : (
                            <span className="inline-block text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded mt-0.5">
                              Direct Return
                            </span>
                          )}
                        </td>

                        {/* Items Returned */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1 max-w-xs">
                            {ret.items?.map((item, idx) => (
                              <div key={idx} className="flex items-start justify-between gap-1 text-[11px]">
                                <div>
                                  <span className="font-bold text-slate-800">{item.productName}</span>
                                  {item.internalId && (
                                    <span className="text-[10px] text-slate-500 font-mono ml-1">[{item.internalId}]</span>
                                  )}
                                  <span className="text-slate-600 font-bold ml-1">x{item.quantity}</span>
                                </div>
                                <span className="text-slate-500 font-medium">
                                  @ Rs.{item.unitCost}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Reason */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="text-[11px] font-semibold text-slate-700">
                            {ret.items?.[0]?.reason || 'Return'}
                          </div>
                          {ret.notes && (
                            <div className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">
                              {ret.notes}
                            </div>
                          )}
                        </td>

                        {/* Settlement Method */}
                        <td className="py-3.5 px-4 align-top">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md ${
                            ret.settlementMethod === 'debit_note'
                              ? 'bg-red-100 text-red-800'
                              : ret.settlementMethod === 'cash_refund'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {ret.settlementMethod === 'debit_note' && '💳 Debit Note'}
                            {ret.settlementMethod === 'cash_refund' && '💵 Cash Received'}
                            {ret.settlementMethod === 'bank_refund' && '🏦 Bank Transfer'}
                            {ret.settlementMethod === 'replacement_pending' && '⏳ Replacement Pending'}
                          </span>
                        </td>

                        {/* Total Debit Note Amount */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="font-black text-sm text-slate-900">
                            Rs. {ret.totalAmount?.toLocaleString()}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onViewVoucher(ret, 'vendor')}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Print Debit Note Voucher"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenVendorReturnModal(ret)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Return"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm({ id: ret.id, number: ret.returnNumber, type: 'vendor' })}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Return Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Return Record?</h3>
                <p className="text-xs text-slate-500">Return #{deleteConfirm.number}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this return record?
              {deleteConfirm.type === 'customer' 
                ? ' Any restocked items will be deducted from your inventory, and linked Khata credit ledger entries will be removed.'
                : ' Any returned items will be re-added back to your inventory, and linked supplier debit note ledger entries will be removed.'}
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                Confirm Delete & Revert Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
