import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Phone, 
  User, 
  MapPin, 
  Boxes, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShoppingBag, 
  Receipt, 
  DollarSign, 
  ExternalLink, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  SlidersHorizontal,
  X,
  Layers,
  Sparkles,
  Link as LinkIcon,
  Download
} from 'lucide-react';
import { Vendor, Purchase, Sale, VendorLedgerEntry, Product } from '../types';
import { calculateVendorBalance, getVendorFullLedger } from '../services/storage';
import { downloadVendorLedgerPDF } from '../services/pdfReportGenerator';

interface VendorsPageProps {
  vendors: Vendor[];
  purchases: Purchase[];
  sales: Sale[];
  ledgerEntries: VendorLedgerEntry[];
  products: Product[];
  onSelectVendor: (vendor: Vendor) => void;
  onOpenAddVendorModal: () => void;
  onOpenEditVendorModal: (vendor: Vendor) => void;
  onOpenCashModal: (vendorId?: string) => void;
  onOpenConfigureLinksModal: (vendor: Vendor) => void;
  onDeleteVendor: (vendorId: string) => void;
}

export const VendorsPage: React.FC<VendorsPageProps> = ({
  vendors = [],
  purchases = [],
  sales = [],
  ledgerEntries = [],
  products = [],
  onSelectVendor,
  onOpenAddVendorModal,
  onOpenEditVendorModal,
  onOpenCashModal,
  onOpenConfigureLinksModal,
  onDeleteVendor,
}) => {
  const safeVendors = vendors || [];
  const safePurchases = purchases || [];
  const safeSales = sales || [];
  const safeLedgerEntries = ledgerEntries || [];

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'we_owe' | 'they_owe' | 'settled'>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'balance_desc' | 'balance_asc' | 'recent'>('name_asc');

  // Compute vendor balances map
  const vendorBalances = useMemo(() => {
    const map = new Map<string, number>();
    safeVendors.forEach(v => {
      const bal = calculateVendorBalance(v.id, safeVendors, safePurchases, safeSales, safeLedgerEntries);
      map.set(v.id, bal);
    });
    return map;
  }, [safeVendors, safePurchases, safeSales, safeLedgerEntries]);

  // Overall Financial Metrics across all vendors
  const totalBalanceWeOwe = useMemo(() => {
    let sum = 0;
    vendorBalances.forEach(bal => {
      if (bal > 0) sum += bal;
    });
    return sum;
  }, [vendorBalances]);

  const totalAdvanceBalances = useMemo(() => {
    let sum = 0;
    vendorBalances.forEach(bal => {
      if (bal < 0) sum += Math.abs(bal);
    });
    return sum;
  }, [vendorBalances]);

  const totalPurchasesAcrossAll = useMemo(() => {
    return purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  }, [purchases]);

  const totalCashSentAcrossAll = useMemo(() => {
    return ledgerEntries
      .filter(e => e.type === 'cash_sent')
      .reduce((sum, e) => sum + (e.amount || e.debit || 0), 0);
  }, [ledgerEntries]);

  // Unique cities for filter
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach(v => {
      if (v.city) set.add(v.city.trim());
    });
    return Array.from(set).sort();
  }, [vendors]);

  // Filtered & Searched Vendors
  const filteredVendors = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return vendors.filter(vendor => {
      const balance = vendorBalances.get(vendor.id) || 0;

      // Search across all data of vendor (business name, contact person, phone, address, notes, linked product names & IDs)
      let matchesSearch = true;
      if (q) {
        const linkedProds = products.filter(p => (vendor.linkedProductIds || []).includes(p.id) || p.vendorId === vendor.id);
        const linkedNames = linkedProds.map(p => `${p.name} ${p.internalId} ${p.brandName || ''}`).join(' ').toLowerCase();

        matchesSearch = (
          vendor.businessName.toLowerCase().includes(q) ||
          vendor.contactPerson.toLowerCase().includes(q) ||
          vendor.phone.toLowerCase().includes(q) ||
          (vendor.secondaryPhone && vendor.secondaryPhone.toLowerCase().includes(q)) ||
          (vendor.city && vendor.city.toLowerCase().includes(q)) ||
          (vendor.address && vendor.address.toLowerCase().includes(q)) ||
          (vendor.notes && vendor.notes.toLowerCase().includes(q)) ||
          linkedNames.includes(q)
        );
      }

      // Balance Filter
      let matchesBalance = true;
      if (balanceFilter === 'we_owe') matchesBalance = balance > 0;
      else if (balanceFilter === 'they_owe') matchesBalance = balance < 0;
      else if (balanceFilter === 'settled') matchesBalance = balance === 0;

      // City Filter
      let matchesCity = true;
      if (cityFilter !== 'all') matchesCity = vendor.city === cityFilter;

      return matchesSearch && matchesBalance && matchesCity;
    }).sort((a, b) => {
      const balA = vendorBalances.get(a.id) || 0;
      const balB = vendorBalances.get(b.id) || 0;

      if (sortBy === 'name_asc') return a.businessName.localeCompare(b.businessName);
      if (sortBy === 'balance_desc') return balB - balA;
      if (sortBy === 'balance_asc') return balA - balB;
      if (sortBy === 'recent') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      return 0;
    });
  }, [vendors, vendorBalances, searchTerm, balanceFilter, cityFilter, sortBy, products]);

  return (
    <div id="vendors-page" className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white border border-neutral-200 shadow-xs p-5 sm:p-6 rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/15 text-amber-700">
                <Building2 className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-neutral-900">
                  Vendor Management & Supplier Ledgers
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500">
                  Track balances owed, linked inventory items, sales, purchases, and cash payments
                </p>
              </div>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              id="btn-vendors-record-cash"
              onClick={() => onOpenCashModal()}
              className="px-4 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4 text-amber-600" />
              <span>+ Cash Payment / Receipt</span>
            </button>

            <button
              type="button"
              id="btn-add-new-vendor-top"
              onClick={onOpenAddVendorModal}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Vendor</span>
            </button>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold">
              <span>Total Vendors</span>
              <Building2 className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="text-2xl font-black text-neutral-900 mt-1">
              {vendors.length}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">Active supplier accounts</p>
          </div>

          <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-amber-800 font-bold">
              <span>Total Balance We Owe (Payable)</span>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            </div>
            <div className="text-2xl font-black text-amber-900 mt-1">
              ₨ {totalBalanceWeOwe.toLocaleString()}
            </div>
            <p className="text-[11px] text-amber-700 mt-0.5 font-medium">Outstanding to suppliers</p>
          </div>

          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold">
              <span>Total Purchases</span>
              <ShoppingBag className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-neutral-900 mt-1">
              ₨ {totalPurchasesAcrossAll.toLocaleString()}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5 font-medium">{purchases.length} total bills recorded</p>
          </div>

          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold">
              <span>Total Cash Paid</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              ₨ {totalCashSentAcrossAll.toLocaleString()}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5 font-medium">Voucher & bank payments</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs space-y-3">
          {/* Main Search Input */}
          <div className="relative">
            <input
              type="text"
              id="vendor-main-search-input"
              placeholder="Search across all vendor data (Business name, contact person, phone number, city, address, linked item part #)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none transition-all shadow-inner"
              autoFocus
            />
            <Search className="w-5 h-5 text-neutral-400 absolute left-3.5 top-3.5 pointer-events-none" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Buttons & Dropdowns */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Balance Status Filter Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                id="filter-balance-all"
                onClick={() => setBalanceFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  balanceFilter === 'all'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                All Vendors ({vendors.length})
              </button>

              <button
                type="button"
                id="filter-balance-we-owe"
                onClick={() => setBalanceFilter('we_owe')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  balanceFilter === 'we_owe'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span>We Owe Money</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-700 text-white">
                  {Array.from(vendorBalances.values()).filter((b: number) => b > 0).length}
                </span>
              </button>

              <button
                type="button"
                id="filter-balance-settled"
                onClick={() => setBalanceFilter('settled')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  balanceFilter === 'settled'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Settled (₨ 0)
              </button>

              <button
                type="button"
                id="filter-balance-they-owe"
                onClick={() => setBalanceFilter('they_owe')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  balanceFilter === 'they_owe'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                }`}
              >
                Advance Balance
              </button>
            </div>

            {/* City & Sort Dropdowns */}
            <div className="flex items-center gap-2">
              {uniqueCities.length > 0 && (
                <select
                  id="vendor-city-filter-select"
                  value={cityFilter}
                  onChange={e => setCityFilter(e.target.value)}
                  className="px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700"
                >
                  <option value="all">All Cities</option>
                  {uniqueCities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}

              <select
                id="vendor-sort-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700"
              >
                <option value="name_asc">Sort: Name (A-Z)</option>
                <option value="balance_desc">Sort: Highest Balance Owed</option>
                <option value="balance_asc">Sort: Lowest Balance Owed</option>
                <option value="recent">Sort: Recently Added</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tip Indicator */}
        <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
          <span>
            💡 <strong>Double-click any vendor card</strong> to open full ledger statement, purchase/sale history, and cash vouchers.
          </span>
          <span>Showing <strong>{filteredVendors.length}</strong> of {vendors.length} vendors</span>
        </div>

        {/* Vendor Cards Grid */}
        {filteredVendors.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-neutral-400 space-y-3">
            <Building2 className="w-12 h-12 mx-auto text-neutral-300" />
            <h3 className="text-base font-bold text-neutral-700">No Vendors Found</h3>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              No vendor records matched your search query. Try adjusting your filters or add a new vendor.
            </p>
            <button
              type="button"
              onClick={onOpenAddVendorModal}
              className="mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Vendor</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVendors.map(vendor => {
              const balanceOwed = vendorBalances.get(vendor.id) || 0;
              const linkedProds = products.filter(p => (vendor.linkedProductIds || []).includes(p.id) || p.vendorId === vendor.id);
              const vendorPurCount = purchases.filter(p => p.vendorId === vendor.id).length;
              const vendorSaleCount = sales.filter(s => s.vendorId === vendor.id || (s.isVendorSale && s.customerId === vendor.id)).length;

              return (
                <div
                  key={vendor.id}
                  id={`vendor-card-${vendor.id}`}
                  onDoubleClick={() => onSelectVendor(vendor)}
                  className="bg-white rounded-2xl border border-neutral-200 hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group select-none cursor-pointer"
                  title="Double click to open Vendor Details & Full Ledger"
                >
                  {/* Card Main Body */}
                  <div className="p-5 space-y-3.5">
                    {/* Top Row: Business Name & City */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.2 rounded">
                            {vendor.id}
                          </span>
                          {vendor.city && (
                            <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                              {vendor.city}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-black text-neutral-900 group-hover:text-amber-900 transition-colors mt-1">
                          {vendor.businessName}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onOpenEditVendorModal(vendor)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-700 hover:bg-neutral-100 transition-colors"
                          title="Edit vendor profile"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Contact Person & Phone */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-neutral-700">
                        <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="text-neutral-500">Contact:</span>
                        <strong className="font-bold text-neutral-900">{vendor.contactPerson}</strong>
                      </div>

                      <div className="flex items-center gap-2 text-neutral-700">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-neutral-500">Phone:</span>
                        <a 
                          href={`tel:${vendor.phone}`} 
                          onClick={e => e.stopPropagation()}
                          className="font-bold text-neutral-900 hover:text-emerald-700 hover:underline"
                        >
                          {vendor.phone}
                        </a>
                      </div>

                      {vendor.address && (
                        <div className="flex items-center gap-2 text-neutral-600 text-[11px] truncate">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="truncate">{vendor.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Prominent Balance Owed Banner */}
                    <div className={`p-3 rounded-xl border flex items-center justify-between ${
                      balanceOwed > 0 
                        ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                        : balanceOwed < 0
                        ? 'bg-blue-50/90 border-blue-300 text-blue-950'
                        : 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                    }`}>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          {balanceOwed > 0 ? 'Balance We Owe' : balanceOwed < 0 ? 'Advance Balance' : 'Account Balance'}
                        </div>
                        <div className="text-lg font-black">
                          ₨ {Math.abs(balanceOwed).toLocaleString()}
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        balanceOwed > 0 ? 'bg-amber-200/80 text-amber-900' :
                        balanceOwed < 0 ? 'bg-blue-200/80 text-blue-900' : 'bg-emerald-200/80 text-emerald-900'
                      }`}>
                        {balanceOwed > 0 ? 'We Owe' : balanceOwed < 0 ? 'Advance' : 'Settled'}
                      </span>
                    </div>

                    {/* Linked Inventory Items Preview */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-600 flex items-center gap-1">
                          <Boxes className="w-3.5 h-3.5 text-neutral-400" />
                          Linked Inventory ({linkedProds.length})
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenConfigureLinksModal(vendor);
                          }}
                          className="text-[11px] font-bold text-amber-700 hover:underline"
                        >
                          Configure →
                        </button>
                      </div>

                      {linkedProds.length === 0 ? (
                        <p className="text-[11px] text-neutral-400 italic">No inventory products linked yet</p>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-h-14 overflow-hidden">
                          {linkedProds.slice(0, 4).map(p => (
                            <span 
                              key={p.id}
                              className="px-2 py-0.5 bg-neutral-100 text-neutral-800 rounded-md text-[11px] font-medium border border-neutral-200"
                            >
                              <strong className="font-mono text-amber-900">{p.internalId}</strong> {p.name}
                            </span>
                          ))}
                          {linkedProds.length > 4 && (
                            <span className="px-1.5 py-0.5 bg-neutral-200 text-neutral-700 rounded text-[10px] font-bold">
                              +{linkedProds.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                    <div className="text-[11px] text-neutral-500 font-medium">
                      <span>{vendorPurCount} Purchases</span> • <span>{vendorSaleCount} Sales</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        id={`btn-card-download-pdf-${vendor.id}`}
                        onClick={() => {
                          const vLedger = getVendorFullLedger(vendor.id, safeVendors, safePurchases, safeSales, safeLedgerEntries);
                          downloadVendorLedgerPDF(vendor, vLedger, balanceOwed, 'Complete Ledger Statement');
                        }}
                        className="px-2.5 py-1 rounded-lg border border-neutral-300 hover:bg-amber-50 text-neutral-800 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Download complete vendor statement report as PDF"
                      >
                        <Download className="w-3 h-3 text-amber-700" />
                        <span>PDF</span>
                      </button>

                      <button
                        type="button"
                        id={`btn-card-add-cash-${vendor.id}`}
                        onClick={() => onOpenCashModal(vendor.id)}
                        className="px-2.5 py-1 rounded-lg border border-neutral-300 hover:bg-white text-neutral-800 text-xs font-bold transition-colors cursor-pointer"
                        title="Add cash entry for this vendor"
                      >
                        + Cash
                      </button>

                      <button
                        type="button"
                        id={`btn-card-open-details-${vendor.id}`}
                        onClick={() => onSelectVendor(vendor)}
                        className="px-3 py-1 rounded-lg bg-neutral-900 hover:bg-amber-600 text-white text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <span>Open Ledger</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
