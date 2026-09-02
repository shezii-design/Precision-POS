import React, { useState, useMemo } from 'react';
import { 
  Customer, 
  Product, 
  Quotation, 
  QuotationFilterOptions, 
  QuotationStatus 
} from '../types';
import { formatPKR, formatPKRShort } from '../services/pricing';
import { 
  getQuotationDaysRemaining, 
  getQuotationEffectiveStatus,
  isQuotationExpired 
} from '../services/storage';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Building2, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  Edit3, 
  Trash2, 
  ArrowRight, 
  RotateCcw, 
  Printer, 
  Sparkles,
  Info,
  Check,
  ChevronDown,
  Layers
} from 'lucide-react';

interface QuotationsPageProps {
  quotations: Quotation[];
  products: Product[];
  customers: Customer[];
  onOpenCreateQuotation: () => void;
  onViewQuotation: (quotation: Quotation) => void;
  onEditQuotation: (quotation: Quotation) => void;
  onDeleteQuotation: (quotationId: string) => void;
  onConvertToSale: (quotation: Quotation) => void;
  onRenewValidity: (quotationId: string, days?: number) => void;
}

export const QuotationsPage: React.FC<QuotationsPageProps> = ({
  quotations = [],
  products = [],
  customers = [],
  onOpenCreateQuotation,
  onViewQuotation,
  onEditQuotation,
  onDeleteQuotation,
  onConvertToSale,
  onRenewValidity
}) => {
  const safeQuotations = quotations || [];
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'converted'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'customer' | 'company'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'validity_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // KPI Calculations
  const stats = useMemo(() => {
    let totalCount = safeQuotations.length;
    let activeCount = 0;
    let expiredCount = 0;
    let convertedCount = 0;
    let totalQuotedValue = 0;
    let activeQuotedValue = 0;

    safeQuotations.forEach(q => {
      const effStatus = getQuotationEffectiveStatus(q);
      totalQuotedValue += q.totalAmount || 0;

      if (effStatus === 'active') {
        activeCount++;
        activeQuotedValue += q.totalAmount || 0;
      } else if (effStatus === 'expired') {
        expiredCount++;
      } else if (effStatus === 'converted') {
        convertedCount++;
      }
    });

    return {
      totalCount,
      activeCount,
      expiredCount,
      convertedCount,
      totalQuotedValue,
      activeQuotedValue
    };
  }, [quotations]);

  // Filtered and Sorted Quotations
  const filteredQuotations = useMemo(() => {
    return quotations
      .filter(q => {
        const effStatus = getQuotationEffectiveStatus(q);

        // Status Filter
        if (statusFilter !== 'all' && effStatus !== statusFilter) {
          return false;
        }

        // Customer Type Filter
        if (typeFilter !== 'all' && (q.customerType || 'customer') !== typeFilter) {
          return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchNum = q.quotationNumber?.toLowerCase().includes(query);
          const matchId = q.id?.toLowerCase().includes(query);
          const matchCustomer = q.customerName?.toLowerCase().includes(query);
          const matchContact = q.contactPerson?.toLowerCase().includes(query);
          const matchPhone = q.customerPhone?.toLowerCase().includes(query);
          const matchCity = q.customerCity?.toLowerCase().includes(query);
          const matchItems = q.items?.some(it => 
            it.productName?.toLowerCase().includes(query) ||
            it.internalId?.toLowerCase().includes(query) ||
            it.brandName?.toLowerCase().includes(query) ||
            it.machineNames?.toLowerCase().includes(query)
          );

          if (!matchNum && !matchId && !matchCustomer && !matchContact && !matchPhone && !matchCity && !matchItems) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime();
        }
        if (sortBy === 'validity_asc') {
          return new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime();
        }
        if (sortBy === 'amount_desc') {
          return (b.totalAmount || 0) - (a.totalAmount || 0);
        }
        if (sortBy === 'amount_asc') {
          return (a.totalAmount || 0) - (b.totalAmount || 0);
        }
        return 0;
      });
  }, [quotations, searchQuery, statusFilter, typeFilter, sortBy]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 text-white flex items-center justify-center shadow-xs">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Quotations & Estimates
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                7-Day Validity
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Create commercial price estimates for customers & companies. <strong>Stock is NOT deducted.</strong>
            </p>
          </div>
        </div>

        {/* Create Quotation Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            id="create-quotation-btn"
            onClick={onOpenCreateQuotation}
            className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-xs font-black rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create New Quotation</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Stat 1: Total Active Quotations */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-2xs ${
            statusFilter === 'active' 
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20' 
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Active / Valid Quotes
            </span>
            <span className="text-lg sm:text-2xl font-black text-emerald-700 tracking-tight">
              {stats.activeCount} Quotes
            </span>
            <span className="text-[10px] text-slate-500 font-medium block">
              ₨ {formatPKRShort(stats.activeQuotedValue)} Active PKR
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200 shrink-0 ml-1">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Stat 2: Expired Quotations (> 7 Days) */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'expired' ? 'all' : 'expired')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-2xs ${
            statusFilter === 'expired' 
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20' 
              : 'bg-white border-slate-200 hover:border-amber-200'
          }`}
        >
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Expired (&gt; 7 Days)
            </span>
            <span className="text-lg sm:text-2xl font-black text-amber-700 tracking-tight">
              {stats.expiredCount} Quotes
            </span>
            <span className="text-[10px] text-amber-800 font-semibold block">
              Details Preserved
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold border border-amber-200 shrink-0 ml-1">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Stat 3: Converted to Sales */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'converted' ? 'all' : 'converted')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-2xs ${
            statusFilter === 'converted' 
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20' 
              : 'bg-white border-slate-200 hover:border-blue-200'
          }`}
        >
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Converted to Sales
            </span>
            <span className="text-lg sm:text-2xl font-black text-blue-700 tracking-tight">
              {stats.convertedCount} Invoices
            </span>
            <span className="text-[10px] text-slate-500 font-medium block">
              Successful Bids
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold border border-blue-200 shrink-0 ml-1">
            <ArrowRight className="w-5 h-5" />
          </div>
        </div>

        {/* Stat 4: Total Quoted Pipeline */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Quoted Value
            </span>
            <span className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              {formatPKRShort(stats.totalQuotedValue)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono block">
              {stats.totalCount} Total Quotes Issued
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg border border-red-100 shrink-0 ml-1">
            ₨
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS BAR */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Quotation #, Customer / Company Name, Phone, Item Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
            >
              <option value="date_desc">Newest Issued First</option>
              <option value="date_asc">Oldest Issued First</option>
              <option value="validity_asc">Expiring Soonest</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Status:</span>
            {[
              { id: 'all', label: 'All Quotations', count: stats.totalCount },
              { id: 'active', label: 'Active (Valid)', count: stats.activeCount, color: 'text-emerald-700' },
              { id: 'expired', label: 'Expired (7-Day)', count: stats.expiredCount, color: 'text-amber-700' },
              { id: 'converted', label: 'Converted to Sale', count: stats.convertedCount, color: 'text-blue-700' }
            ].map(pill => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStatusFilter(pill.id as any)}
                className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                  statusFilter === pill.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{pill.label}</span>
                <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                  statusFilter === pill.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {pill.count}
                </span>
              </button>
            ))}
          </div>

          {/* Customer / Company Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-0.8 rounded-lg transition-colors cursor-pointer ${
                typeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('customer')}
              className={`px-2.5 py-0.8 rounded-lg transition-colors cursor-pointer ${
                typeFilter === 'customer' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Customers
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('company')}
              className={`px-2.5 py-0.8 rounded-lg transition-colors cursor-pointer ${
                typeFilter === 'company' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Companies (B2B)
            </button>
          </div>
        </div>
      </div>

      {/* QUOTATIONS DATA TABLE & CARD LIST */}
      {filteredQuotations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 mx-auto flex items-center justify-center border border-red-100">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-slate-800">No Quotations Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'No quotations match the active search and filter criteria. Try clearing search filters.'
              : 'Create your first price quotation for walk-in customers or corporate companies with automated 7-day rate validity.'}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenCreateQuotation}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-sm transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create First Quotation</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Quotation # & Date</th>
                  <th className="py-3 px-4 min-w-[200px]">Recipient (Customer / Company)</th>
                  <th className="py-3 px-4">Validity & Expiry Status</th>
                  <th className="py-3 px-4">Quoted Items Summary</th>
                  <th className="py-3 px-4 text-right">Total Amount (PKR)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotations.map(quotation => {
                  const effStatus = getQuotationEffectiveStatus(quotation);
                  const daysRemaining = getQuotationDaysRemaining(quotation);
                  const isExpired = effStatus === 'expired';
                  const isConverted = effStatus === 'converted';

                  return (
                    <tr 
                      key={quotation.id} 
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => onViewQuotation(quotation)}
                    >
                      {/* Quotation Number & Date */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-black text-slate-900 font-mono text-sm group-hover:text-red-600 transition-colors flex items-center gap-1.5">
                          <span>{quotation.quotationNumber}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Issued: {quotation.date}</span>
                        </div>
                      </td>

                      {/* Recipient Details */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-black text-slate-900 flex items-center gap-1.5">
                          {quotation.customerType === 'company' ? (
                            <Building2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                          <span className="truncate max-w-xs">{quotation.customerName}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                            {quotation.customerType === 'company' ? 'Company' : 'Customer'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {quotation.contactPerson ? `Attn: ${quotation.contactPerson} • ` : ''}
                          {quotation.customerPhone || quotation.customerCity || 'No phone recorded'}
                        </div>
                      </td>

                      {/* Validity & Expiry Status */}
                      <td className="py-3.5 px-4 align-top">
                        {isConverted ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black bg-blue-50 text-blue-800 border border-blue-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Converted to Sale</span>
                          </div>
                        ) : isExpired ? (
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Expired (7 Days)</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                              Ended on {quotation.validUntil}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Active ({daysRemaining}d left)</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Expires: {quotation.validUntil}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Items Summary */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-slate-800">
                          {quotation.items.length} {quotation.items.length === 1 ? 'Part Quoted' : 'Parts Quoted'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                          {quotation.items.map(it => `${it.productName} (x${it.quantity})`).join(', ')}
                        </div>
                      </td>

                      {/* Total Quoted Amount */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="font-mono text-sm sm:text-base font-black text-slate-900">
                          ₨ {formatPKR(quotation.totalAmount)}
                        </div>
                        {quotation.discountAmount > 0 && (
                          <div className="text-[10px] text-amber-700 font-semibold">
                            Disc: -₨ {formatPKR(quotation.discountAmount)}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-top text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Button */}
                          <button
                            type="button"
                            title="View Full Quotation & Print"
                            onClick={() => onViewQuotation(quotation)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Convert to Sale Button */}
                          <button
                            type="button"
                            title="Convert into Official Sale Invoice (Stock will be deducted at sale time)"
                            onClick={() => onConvertToSale(quotation)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <span>Convert to Sale</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          {/* Renew Button (if expired) */}
                          {isExpired && (
                            <button
                              type="button"
                              title="Renew quotation validity for 7 more days"
                              onClick={() => onRenewValidity(quotation.id, 7)}
                              className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit Button */}
                          <button
                            type="button"
                            title="Edit Quotation"
                            onClick={() => onEditQuotation(quotation)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            title="Delete Quotation"
                            onClick={() => {
                              if (window.confirm(`Delete quotation ${quotation.quotationNumber}?`)) {
                                onDeleteQuotation(quotation.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
