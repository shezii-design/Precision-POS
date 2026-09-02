import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShoppingBag, 
  Receipt, 
  Boxes, 
  Edit, 
  Trash2, 
  Download, 
  Search, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Tag,
  Eye,
  Printer,
  Truck
} from 'lucide-react';
import { 
  Vendor, 
  Purchase, 
  Sale, 
  VendorLedgerEntry, 
  Product, 
  ComputedLedgerRow,
  PurchaseOrder
} from '../types';
import { 
  calculateVendorBalance, 
  getVendorFullLedger 
} from '../services/storage';
import { VendorLedgerPrintModal } from './VendorLedgerPrintModal';
import { downloadVendorLedgerPDF } from '../services/pdfReportGenerator';

interface VendorDetailsPageProps {
  vendor: Vendor;
  vendors: Vendor[];
  purchases: Purchase[];
  sales: Sale[];
  ledgerEntries: VendorLedgerEntry[];
  products: Product[];
  purchaseOrders?: PurchaseOrder[];
  onBack: () => void;
  onOpenCashModal: (vendorId: string, editingEntry?: VendorLedgerEntry | null) => void;
  onOpenPurchaseModal: (vendorId: string, editingPurchase?: Purchase | null) => void;
  onOpenCreatePO?: (vendorId: string) => void;
  onOpenReceivePO?: (po: PurchaseOrder) => void;
  onViewPO?: (po: PurchaseOrder) => void;
  onOpenConfigureLinksModal: (vendor: Vendor) => void;
  onOpenEditVendorModal: (vendor: Vendor) => void;
  onEditSale: (sale: Sale) => void;
  onDeleteLedgerEntry: (entryId: string) => void;
  onDeletePurchase: (purchaseId: string) => void;
  onViewInvoice?: (sale: Sale) => void;
  onViewPurchase?: (purchase: Purchase) => void;
}

export const VendorDetailsPage: React.FC<VendorDetailsPageProps> = ({
  vendor,
  vendors = [],
  purchases = [],
  sales = [],
  ledgerEntries = [],
  products = [],
  purchaseOrders = [],
  onBack,
  onOpenCashModal,
  onOpenPurchaseModal,
  onOpenCreatePO,
  onOpenReceivePO,
  onViewPO,
  onOpenConfigureLinksModal,
  onOpenEditVendorModal,
  onEditSale,
  onDeleteLedgerEntry,
  onDeletePurchase,
  onViewInvoice,
  onViewPurchase,
}) => {
  const [activeTab, setActiveTab] = useState<'ledger' | 'sales' | 'purchases' | 'cash' | 'products'>('ledger');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');
  const [ledgerSortOrder, setLedgerSortOrder] = useState<'statement' | 'recent'>('statement');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Calculate dynamic balance we owe to this vendor
  const currentBalance = useMemo(() => {
    return calculateVendorBalance(vendor.id, vendors, purchases, sales, ledgerEntries);
  }, [vendor.id, vendors, purchases, sales, ledgerEntries]);

  // Compute full chronological ledger with running balance
  const fullLedger = useMemo(() => {
    return getVendorFullLedger(vendor.id, vendors, purchases, sales, ledgerEntries);
  }, [vendor.id, vendors, purchases, sales, ledgerEntries]);

  // Display rows according to chosen sort order
  const orderedLedger = useMemo(() => {
    if (ledgerSortOrder === 'statement') {
      return fullLedger;
    }
    return [...fullLedger].reverse();
  }, [fullLedger, ledgerSortOrder]);

  // Filtered ledger rows with comprehensive search
  const filteredLedger = useMemo(() => {
    if (!ledgerSearch.trim()) return orderedLedger;
    const q = ledgerSearch.toLowerCase().trim();
    return orderedLedger.filter(row => {
      const dateStr = new Date(row.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }).toLowerCase();
      const codeStr = (row.entryCode || row.billNumber || '').toLowerCase();
      const descStr = (row.description || '').toLowerCase();
      const typeStr = (row.sourceType || '').toLowerCase();
      const methodStr = (row.paymentMethod || '').toLowerCase();
      const debitStr = row.debit ? String(row.debit) : '';
      const creditStr = row.credit ? String(row.credit) : '';
      const balanceStr = String(Math.abs(row.runningBalance));

      return (
        codeStr.includes(q) ||
        descStr.includes(q) ||
        typeStr.includes(q) ||
        methodStr.includes(q) ||
        dateStr.includes(q) ||
        debitStr.includes(q) ||
        creditStr.includes(q) ||
        balanceStr.includes(q)
      );
    });
  }, [orderedLedger, ledgerSearch]);

  // Vendor's specific purchases
  const vendorPurchases = useMemo(() => {
    return purchases
      .filter(p => p.vendorId === vendor.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchases, vendor.id]);

  // Vendor's specific sales (from us to vendor)
  const vendorSales = useMemo(() => {
    return sales
      .filter(s => s.vendorId === vendor.id || (s.isVendorSale && s.customerId === vendor.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, vendor.id]);

  // Vendor's cash entries (sent and received)
  const vendorCashEntries = useMemo(() => {
    return ledgerEntries
      .filter(e => e.vendorId === vendor.id && (e.type === 'cash_sent' || e.type === 'cash_received'))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ledgerEntries, vendor.id]);

  // Linked products
  const linkedProducts = useMemo(() => {
    const ids = new Set(vendor.linkedProductIds || []);
    return products.filter(p => ids.has(p.id) || p.vendorId === vendor.id);
  }, [products, vendor]);

  // Summary Metrics
  const totalPurchasesAmount = useMemo(() => {
    return vendorPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  }, [vendorPurchases]);

  const totalCashSent = useMemo(() => {
    return ledgerEntries
      .filter(e => e.vendorId === vendor.id && e.type === 'cash_sent')
      .reduce((sum, e) => sum + (e.amount || e.debit || 0), 0);
  }, [ledgerEntries, vendor.id]);

  const totalSalesToVendor = useMemo(() => {
    return vendorSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  }, [vendorSales]);

  const totalCashReceived = useMemo(() => {
    return ledgerEntries
      .filter(e => e.vendorId === vendor.id && e.type === 'cash_received')
      .reduce((sum, e) => sum + (e.amount || e.credit || 0), 0);
  }, [ledgerEntries, vendor.id]);

  // Handle double clicking a ledger row to open full transaction details/editor
  const handleDoubleClickLedgerRow = (row: ComputedLedgerRow) => {
    if (row.sourceType === 'cash_sent' || row.sourceType === 'cash_received' || row.sourceType === 'adjustment') {
      const entry = (row.rawObject && 'vendorId' in row.rawObject)
        ? (row.rawObject as VendorLedgerEntry)
        : ledgerEntries.find(e => e.id === row.id || e.id === row.referenceId);
      if (entry) {
        onOpenCashModal(vendor.id, entry);
      }
    } else if (row.sourceType === 'purchase') {
      const pur = (row.rawObject && 'items' in row.rawObject)
        ? (row.rawObject as Purchase)
        : purchases.find(p => p.id === row.id || p.id === row.referenceId || (row.billNumber && p.billNumber === row.billNumber));
      if (pur) {
        if (onViewPurchase) {
          onViewPurchase(pur);
        } else {
          onOpenPurchaseModal(vendor.id, pur);
        }
      } else {
        const linkedPO = purchaseOrders?.find(p => p.id === row.id || p.id === row.referenceId || p.poNumber === row.entryCode || p.poNumber === row.billNumber || row.description?.includes(p.poNumber));
        if (linkedPO) {
          if (onOpenReceivePO && linkedPO.status === 'pending_bill') {
            onOpenReceivePO(linkedPO);
          } else if (onViewPO) {
            onViewPO(linkedPO);
          } else if (onOpenReceivePO) {
            onOpenReceivePO(linkedPO);
          }
        }
      }
    } else if (row.sourceType === 'sale') {
      const sale = (row.rawObject && 'items' in row.rawObject)
        ? (row.rawObject as Sale)
        : sales.find(s => s.id === row.id || s.id === row.referenceId);
      if (sale) {
        if (onViewInvoice) {
          onViewInvoice(sale);
        } else {
          onEditSale(sale);
        }
      }
    } else if (row.sourceType === 'opening_balance') {
      onOpenEditVendorModal(vendor);
    }
  };

  return (
    <div id="vendor-details-page" className="space-y-6">
      {/* Top Breadcrumb Header */}
      <div className="bg-white border border-neutral-200 shadow-xs p-4 sm:p-5 rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-back-to-vendors"
              onClick={onBack}
              className="p-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors flex items-center gap-1.5 text-sm font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Vendors</span>
            </button>
            <span className="text-neutral-300">/</span>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              <h1 className="text-base sm:text-lg font-bold text-neutral-900 truncate">
                {vendor.businessName}
              </h1>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenCreatePO && (
              <button
                type="button"
                id="btn-vendor-details-create-po"
                onClick={() => onOpenCreatePO(vendor.id)}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Create Purchase Order for this supplier"
              >
                <Truck className="w-4 h-4" />
                <span>+ Issue PO</span>
              </button>
            )}

            <button
              type="button"
              id="btn-vendor-details-add-cash"
              onClick={() => onOpenCashModal(vendor.id)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Entry (Cash)</span>
            </button>

            <button
              type="button"
              id="btn-vendor-details-record-purchase"
              onClick={() => onOpenPurchaseModal(vendor.id)}
              className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>+ Record Purchase</span>
            </button>

            <button
              type="button"
              id="btn-vendor-details-download-pdf"
              onClick={() => downloadVendorLedgerPDF(vendor, fullLedger, currentBalance, 'Complete Ledger Statement')}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Download complete vendor statement report as PDF"
            >
              <Download className="w-4 h-4 text-amber-700" />
              <span className="hidden md:inline">Download PDF</span>
            </button>

            <button
              type="button"
              id="btn-vendor-details-print-statement"
              onClick={() => setShowPrintModal(true)}
              className="p-2 sm:px-3 sm:py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-100 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Print Account Statement"
            >
              <Printer className="w-4 h-4 text-neutral-600" />
              <span className="hidden md:inline">Print</span>
            </button>

            <button
              type="button"
              id="btn-vendor-details-edit-profile"
              onClick={() => onOpenEditVendorModal(vendor)}
              className="p-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Edit Vendor Information"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Vendor Profile & Balance Overview Card */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Vendor Profile Details */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-neutral-100 text-neutral-700 uppercase tracking-wider">
                      Vendor ID: {vendor.id}
                    </span>
                    {vendor.city && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        {vendor.city}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-neutral-900 mt-1">
                    {vendor.businessName}
                  </h2>
                </div>
              </div>

              {/* Contact Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-sm">
                <div className="flex items-center gap-2 text-neutral-700">
                  <User className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span className="text-neutral-500 text-xs">Contact:</span>
                  <strong className="font-semibold text-neutral-900">{vendor.contactPerson}</strong>
                </div>

                <div className="flex items-center gap-2 text-neutral-700">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-neutral-500 text-xs">Phone:</span>
                  <a href={`tel:${vendor.phone}`} className="font-bold text-neutral-900 hover:text-emerald-700 hover:underline">
                    {vendor.phone}
                  </a>
                  {vendor.secondaryPhone && (
                    <span className="text-xs text-neutral-400">/ {vendor.secondaryPhone}</span>
                  )}
                </div>

                {vendor.address && (
                  <div className="flex items-center gap-2 text-neutral-700 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="text-neutral-500 text-xs">Address:</span>
                    <span className="text-neutral-800 truncate">{vendor.address}</span>
                  </div>
                )}

                {vendor.notes && (
                  <div className="sm:col-span-2 p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80 text-xs text-neutral-600">
                    <strong className="text-neutral-800">Notes: </strong>{vendor.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Prominent Balance We Owe Widget */}
            <div className="lg:col-span-5 bg-neutral-900 text-white rounded-2xl p-5 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                  <span className="uppercase tracking-wider font-semibold">Account Balance Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    currentBalance > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    currentBalance < 0 ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {currentBalance > 0 ? 'We Owe to Vendor' : currentBalance < 0 ? 'Advance with Vendor' : 'Settled (Zero Balance)'}
                  </span>
                </div>

                <div className="mt-2">
                  <div className="text-xs text-neutral-400 font-medium">Balance That We Owe to Them</div>
                  <div className={`text-2xl sm:text-3xl font-black mt-1 ${
                    currentBalance > 0 ? 'text-amber-400' : currentBalance < 0 ? 'text-blue-300' : 'text-emerald-400'
                  }`}>
                    ₨ {Math.abs(currentBalance).toLocaleString()}
                    {currentBalance < 0 && <span className="text-xs text-blue-300 ml-1 font-normal">(Advance)</span>}
                  </div>
                </div>
              </div>

              {/* Sub metrics inside balance box */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-neutral-800 text-xs">
                <div>
                  <span className="text-neutral-400">Total Purchases:</span>
                  <div className="font-bold text-white mt-0.5">₨ {totalPurchasesAmount.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-neutral-400">Total Paid (Sent):</span>
                  <div className="font-bold text-emerald-400 mt-0.5">₨ {totalCashSent.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial KPI Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
              <ShoppingBag className="w-4 h-4 text-purple-600" />
              <span>Total Purchases</span>
            </div>
            <div className="text-lg font-bold text-neutral-900 mt-1">
              ₨ {totalPurchasesAmount.toLocaleString()}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">{vendorPurchases.length} purchase bills</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
              <ArrowUpRight className="w-4 h-4 text-amber-600" />
              <span>Payments Sent</span>
            </div>
            <div className="text-lg font-bold text-amber-700 mt-1">
              ₨ {totalCashSent.toLocaleString()}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">Cash & online transfers</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>Sales to Vendor</span>
            </div>
            <div className="text-lg font-bold text-blue-700 mt-1">
              ₨ {totalSalesToVendor.toLocaleString()}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">{vendorSales.length} invoices to vendor</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
              <Boxes className="w-4 h-4 text-emerald-600" />
              <span>Linked Products</span>
            </div>
            <div className="text-lg font-bold text-neutral-900 mt-1">
              {linkedProducts.length} <span className="text-xs font-normal text-neutral-500">items</span>
            </div>
            <button
              type="button"
              onClick={() => onOpenConfigureLinksModal(vendor)}
              className="text-[11px] text-amber-700 hover:underline font-semibold mt-0.5 block"
            >
              Configure items →
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="px-4 border-b border-neutral-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2">
              <button
                type="button"
                id="tab-btn-ledger"
                onClick={() => setActiveTab('ledger')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none ${
                  activeTab === 'ledger'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <Receipt className="w-4 h-4 shrink-0" />
                <span>Complete Statement / Ledger</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'ledger' ? 'bg-amber-700 text-white' : 'bg-neutral-200 text-neutral-700'
                }`}>
                  {fullLedger.length}
                </span>
              </button>

              <button
                type="button"
                id="tab-btn-sales"
                onClick={() => setActiveTab('sales')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none ${
                  activeTab === 'sales'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <Receipt className="w-4 h-4 shrink-0" />
                <span>Sales to Vendor</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'sales' ? 'bg-amber-700 text-white' : 'bg-neutral-200 text-neutral-700'
                }`}>
                  {vendorSales.length}
                </span>
              </button>

              <button
                type="button"
                id="tab-btn-purchases"
                onClick={() => setActiveTab('purchases')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none ${
                  activeTab === 'purchases'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>Purchases</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'purchases' ? 'bg-amber-700 text-white' : 'bg-neutral-200 text-neutral-700'
                }`}>
                  {vendorPurchases.length}
                </span>
              </button>

              <button
                type="button"
                id="tab-btn-cash"
                onClick={() => setActiveTab('cash')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none ${
                  activeTab === 'cash'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 shrink-0" />
                <span>Cash Payments</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'cash' ? 'bg-amber-700 text-white' : 'bg-neutral-200 text-neutral-700'
                }`}>
                  {vendorCashEntries.length}
                </span>
              </button>

              <button
                type="button"
                id="tab-btn-products"
                onClick={() => setActiveTab('products')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none ${
                  activeTab === 'products'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <Boxes className="w-4 h-4 shrink-0" />
                <span>Linked Inventory ({linkedProducts.length})</span>
              </button>
            </div>

            {activeTab === 'ledger' && (
              <div className="flex items-center gap-2 py-2 flex-wrap">
                {/* Statement View Toggle */}
                <div className="flex bg-neutral-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setLedgerSortOrder('statement')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      ledgerSortOrder === 'statement'
                        ? 'bg-white text-neutral-900 shadow-xs font-black'
                        : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                    title="Statement Order (Oldest to newest, purchase bills appear before payments on the same date)"
                  >
                    Statement Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerSortOrder('recent')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      ledgerSortOrder === 'recent'
                        ? 'bg-white text-neutral-900 shadow-xs font-black'
                        : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                    title="Recent First: Newest transactions at top"
                  >
                    Recent First
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filter ledger entries..."
                    value={ledgerSearch}
                    onChange={e => setLedgerSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none w-44 sm:w-56"
                  />
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5 pointer-events-none" />
                </div>

                <button
                  type="button"
                  id="btn-vendor-tab-download-pdf"
                  onClick={() => downloadVendorLedgerPDF(vendor, fullLedger, currentBalance, 'Complete Ledger Statement')}
                  className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-amber-200 shadow-2xs"
                  title="Download complete vendor statement report as PDF"
                >
                  <Download className="w-3.5 h-3.5 text-amber-700" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-neutral-200"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Statement</span>
                </button>
              </div>
            )}
          </div>

          {/* TAB 1: COMPLETE LEDGER STATEMENT */}
          {activeTab === 'ledger' && (
            <div>
              <div className="p-3 bg-amber-50/70 border-b border-amber-100 px-4 flex items-center justify-between text-xs text-amber-900">
                <span>
                  💡 <strong>Tip:</strong> Double click on any row below to view or edit the full transaction details.
                </span>
                <span className="font-semibold text-neutral-600">
                  Total Entries: <strong>{filteredLedger.length}</strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100 text-neutral-700 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-3 py-3">Entry Code / ID</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-4 py-3">Description / Remarks</th>
                      <th className="px-3 py-3 text-right">Debit (₨)</th>
                      <th className="px-3 py-3 text-right">Credit (₨)</th>
                      <th className="px-4 py-3 text-right font-black">Running Balance</th>
                      <th className="px-3 py-3 text-center w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {filteredLedger.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-neutral-400">
                          <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm font-medium">No ledger records found for this vendor.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredLedger.map((row, index) => {
                        const dateFormatted = new Date(row.date).toLocaleDateString('en-PK', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        });

                        return (
                          <tr
                            key={row.id || index}
                            id={`vendor-ledger-row-${row.id}`}
                            onDoubleClick={() => handleDoubleClickLedgerRow(row)}
                            className="hover:bg-amber-50/60 cursor-pointer transition-colors group select-none"
                            title="Double-click to edit or view details"
                          >
                            <td className="px-4 py-3 whitespace-nowrap font-medium text-neutral-600">
                              {dateFormatted}
                            </td>

                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className="font-mono font-bold text-xs bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-200 group-hover:border-amber-300">
                                {row.entryCode}
                              </span>
                            </td>

                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                row.sourceType === 'cash_sent' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                row.sourceType === 'cash_received' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                                row.sourceType === 'purchase' ? (
                                  (row.credit === 0 && row.debit === 0) || row.description?.includes('Cost Pending') || row.description?.includes('Pending')
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                                    : 'bg-purple-100 text-purple-900 border border-purple-300'
                                ) :
                                row.sourceType === 'sale' ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                                'bg-neutral-100 text-neutral-800'
                              }`}>
                                {row.sourceType === 'cash_sent' ? 'Cash Sent' :
                                 row.sourceType === 'cash_received' ? 'Cash Recv' :
                                 row.sourceType === 'purchase' ? (
                                   (row.credit === 0 && row.debit === 0) || row.description?.includes('Cost Pending') || row.description?.includes('Pending')
                                     ? 'PO (Pending)'
                                     : 'Purchase'
                                 ) :
                                 row.sourceType === 'sale' ? 'Sale' : 'Opening'}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-neutral-800 max-w-xs sm:max-w-md truncate font-medium">
                              {row.description}
                            </td>

                            {/* Debit (Decreases What We Owe - Cash Paid or Sale from us) */}
                            <td className="px-3 py-3 text-right font-bold text-neutral-700 whitespace-nowrap">
                              {row.debit > 0 ? (
                                <span className="text-amber-800">₨ {row.debit.toLocaleString()}</span>
                              ) : (
                                <span className="text-neutral-300">-</span>
                              )}
                            </td>

                            {/* Credit (Increases What We Owe - Purchases or Cash Received) */}
                            <td className="px-3 py-3 text-right font-bold text-neutral-700 whitespace-nowrap">
                              {row.credit > 0 ? (
                                <span className="text-purple-900">₨ {row.credit.toLocaleString()}</span>
                              ) : (row.sourceType === 'purchase' && ((row.credit === 0 && row.debit === 0) || row.description?.includes('Cost Pending') || row.description?.includes('Pending'))) ? (
                                <span className="inline-flex items-center text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md text-[11px] font-bold border border-amber-200">
                                  ₨ 0 (Cost Pending)
                                </span>
                              ) : (
                                <span className="text-neutral-300">-</span>
                              )}
                            </td>

                            {/* Running Balance */}
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <span className={`font-black text-xs sm:text-sm ${
                                row.runningBalance > 0 ? 'text-amber-900' :
                                row.runningBalance < 0 ? 'text-blue-700' : 'text-emerald-700'
                              }`}>
                                ₨ {Math.abs(row.runningBalance).toLocaleString()}
                                {row.runningBalance < 0 ? ' (Adv)' : ''}
                              </span>
                            </td>

                            {/* Row Action buttons */}
                            <td className="px-3 py-3 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                {row.sourceType === 'purchase' && (() => {
                                  const pur = (row.rawObject && 'items' in row.rawObject)
                                    ? (row.rawObject as Purchase)
                                    : purchases.find(p => p.id === row.id || p.id === row.referenceId || (row.billNumber && p.billNumber === row.billNumber));
                                  const linkedPO = !pur ? purchaseOrders?.find(p => p.id === row.id || p.id === row.referenceId || p.poNumber === row.entryCode || p.poNumber === row.billNumber || row.description?.includes(p.poNumber)) : undefined;

                                  return (
                                    <>
                                      {pur ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (onViewPurchase) onViewPurchase(pur);
                                              else onOpenPurchaseModal(vendor.id, pur);
                                            }}
                                            className="p-1 rounded text-neutral-400 hover:text-amber-700 hover:bg-neutral-100"
                                            title="View Purchase Bill"
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => onOpenPurchaseModal(vendor.id, pur)}
                                            className="p-1 rounded text-neutral-400 hover:text-blue-700 hover:bg-neutral-100"
                                            title="Edit Purchase Bill"
                                          >
                                            <Edit className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => onDeletePurchase(row.id)}
                                            className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-neutral-100"
                                            title="Delete Purchase Bill"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      ) : linkedPO ? (
                                        <>
                                          {onOpenReceivePO && (
                                            <button
                                              type="button"
                                              onClick={() => onOpenReceivePO(linkedPO)}
                                              className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 shadow-2xs"
                                              title="Finalize PO Bill & Landed Costs"
                                            >
                                              <Edit className="w-3 h-3" />
                                              <span>Finalize Cost</span>
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (onViewPO) onViewPO(linkedPO);
                                              else if (onOpenReceivePO) onOpenReceivePO(linkedPO);
                                            }}
                                            className="p-1 rounded text-neutral-400 hover:text-amber-700 hover:bg-neutral-100"
                                            title="View Purchase Order & Cargo Receipt"
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => onDeleteLedgerEntry(row.id)}
                                            className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-neutral-100"
                                            title="Remove from Ledger"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => onDeleteLedgerEntry(row.id)}
                                            className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-neutral-100"
                                            title="Delete Entry"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      )}
                                    </>
                                  );
                                })()}

                                {row.sourceType === 'sale' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const sale = (row.rawObject && 'items' in row.rawObject)
                                        ? (row.rawObject as Sale)
                                        : sales.find(s => s.id === row.id || s.id === row.referenceId);
                                      if (sale) {
                                        if (onViewInvoice) onViewInvoice(sale);
                                        else onEditSale(sale);
                                      }
                                    }}
                                    className="p-1 rounded text-neutral-400 hover:text-indigo-700 hover:bg-neutral-100"
                                    title="View / Edit Invoice"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {(row.sourceType === 'cash_sent' || row.sourceType === 'cash_received' || row.sourceType === 'adjustment') && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleDoubleClickLedgerRow(row)}
                                      className="p-1 rounded text-neutral-400 hover:text-amber-700 hover:bg-neutral-100"
                                      title="Edit entry"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteLedgerEntry(row.id)}
                                      className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-neutral-100"
                                      title="Delete entry"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}

                                {row.sourceType === 'opening_balance' && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenEditVendorModal(vendor)}
                                    className="p-1 rounded text-neutral-400 hover:text-amber-700 hover:bg-neutral-100"
                                    title="Edit Opening Balance"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                )}
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
          )}

          {/* TAB 2: SALES TO VENDOR */}
          {activeTab === 'sales' && (
            <div className="divide-y divide-neutral-200">
              <div className="p-3 bg-neutral-50 px-4 flex items-center justify-between text-xs text-neutral-600">
                <span>Invoices generated for parts sold to this vendor from our inventory:</span>
                <span className="font-bold text-neutral-800">Total: {vendorSales.length} sales</span>
              </div>

              {vendorSales.length === 0 ? (
                <div className="py-12 text-center text-neutral-400">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No sales recorded to this vendor yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-100 text-neutral-700 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-3 py-3">Invoice / Bill #</th>
                        <th className="px-4 py-3">Items Sold</th>
                        <th className="px-3 py-3 text-right">Total Amount</th>
                        <th className="px-3 py-3 text-right">Received</th>
                        <th className="px-3 py-3 text-right">Balance Due</th>
                        <th className="px-3 py-3 text-center w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {vendorSales.map(sale => {
                        const itemsSummary = sale.items?.map(it => `${it.productName} (${it.quantity})`).join(', ') || '';
                        return (
                          <tr
                            key={sale.id}
                            id={`vendor-sale-row-${sale.id}`}
                            onDoubleClick={() => onEditSale(sale)}
                            className="hover:bg-amber-50/50 cursor-pointer transition-colors"
                            title="Double-click to edit sale"
                          >
                            <td className="px-4 py-3 whitespace-nowrap font-medium text-neutral-600">
                              {new Date(sale.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>

                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className="font-mono font-bold text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                                {sale.id}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-neutral-800 max-w-xs truncate">
                              <span className="font-semibold text-neutral-900">{sale.items?.length || 0} items: </span>
                              {itemsSummary}
                            </td>

                            <td className="px-3 py-3 text-right font-black text-neutral-900 whitespace-nowrap">
                              ₨ {sale.totalAmount?.toLocaleString()}
                            </td>

                            <td className="px-3 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                              ₨ {sale.amountReceived?.toLocaleString()}
                            </td>

                            <td className="px-3 py-3 text-right font-bold text-neutral-700 whitespace-nowrap">
                              ₨ {sale.balanceDue?.toLocaleString()}
                            </td>

                            <td className="px-3 py-3 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onEditSale(sale)}
                                  className="px-2 py-1 rounded bg-neutral-100 hover:bg-amber-100 text-neutral-800 text-[11px] font-bold"
                                >
                                  Edit Sale
                                </button>
                                {onViewInvoice && (
                                  <button
                                    type="button"
                                    onClick={() => onViewInvoice(sale)}
                                    className="p-1 rounded text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
                                    title="View Invoice"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
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

          {/* TAB 3: PURCHASES FROM VENDOR */}
          {activeTab === 'purchases' && (
            <div className="divide-y divide-neutral-200">
              <div className="p-3 bg-neutral-50 px-4 flex items-center justify-between text-xs text-neutral-600">
                <span>Purchases and stock intake bills received from this vendor:</span>
                <button
                  type="button"
                  onClick={() => onOpenPurchaseModal(vendor.id)}
                  className="text-amber-700 hover:underline font-bold"
                >
                  + Add New Purchase Bill
                </button>
              </div>

              {vendorPurchases.length === 0 ? (
                <div className="py-12 text-center text-neutral-400">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No purchase bills recorded for this vendor yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-100 text-neutral-700 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-3 py-3">Bill #</th>
                        <th className="px-4 py-3">Items Purchased</th>
                        <th className="px-3 py-3 text-right">Bill Total (₨)</th>
                        <th className="px-3 py-3 text-right">Paid on Spot</th>
                        <th className="px-3 py-3 text-right">Balance Due</th>
                        <th className="px-3 py-3 text-center">Status</th>
                        <th className="px-3 py-3 text-center w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {vendorPurchases.map(pur => {
                        const itemsSummary = pur.items?.map(it => `${it.productName} (${it.quantity})`).join(', ') || '';
                        return (
                          <tr
                            key={pur.id}
                            id={`vendor-purchase-row-${pur.id}`}
                            onDoubleClick={() => onOpenPurchaseModal(vendor.id, pur)}
                            className="hover:bg-amber-50/50 cursor-pointer transition-colors"
                            title="Double-click to edit purchase"
                          >
                            <td className="px-4 py-3 whitespace-nowrap font-medium text-neutral-600">
                              {new Date(pur.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>

                            <td className="px-3 py-3 whitespace-nowrap font-mono font-bold text-neutral-900">
                              {pur.billNumber || pur.id}
                            </td>

                            <td className="px-4 py-3 text-neutral-800 max-w-xs truncate">
                              <span className="font-semibold">{pur.items?.length || 0} items: </span>
                              {itemsSummary}
                            </td>

                            <td className="px-3 py-3 text-right font-black text-neutral-900 whitespace-nowrap">
                              ₨ {pur.totalAmount?.toLocaleString()}
                            </td>

                            <td className="px-3 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                              ₨ {pur.amountPaid?.toLocaleString()}
                            </td>

                            <td className="px-3 py-3 text-right font-bold text-amber-800 whitespace-nowrap">
                              ₨ {pur.balanceDue?.toLocaleString()}
                            </td>

                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                pur.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                pur.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {pur.paymentStatus}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                {onViewPurchase && (
                                  <button
                                    type="button"
                                    onClick={() => onViewPurchase(pur)}
                                    className="p-1 rounded text-neutral-400 hover:text-amber-700 hover:bg-neutral-100"
                                    title="View & Print Purchase Bill"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onOpenPurchaseModal(vendor.id, pur)}
                                  className="p-1 rounded text-neutral-400 hover:text-amber-700 hover:bg-neutral-100"
                                  title="Edit purchase"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeletePurchase(pur.id)}
                                  className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-neutral-100"
                                  title="Delete purchase"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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

          {/* TAB 4: CASH PAYMENTS & RECEIPTS */}
          {activeTab === 'cash' && (
            <div className="divide-y divide-neutral-200">
              <div className="p-3 bg-neutral-50 px-4 flex items-center justify-between text-xs text-neutral-600">
                <span>Direct cash vouchers and online payments made to/from this vendor:</span>
                <button
                  type="button"
                  onClick={() => onOpenCashModal(vendor.id)}
                  className="text-amber-700 hover:underline font-bold"
                >
                  + Add Cash Entry
                </button>
              </div>

              {vendorCashEntries.length === 0 ? (
                <div className="py-12 text-center text-neutral-400">
                  <ArrowUpRight className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No cash entries recorded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-100 text-neutral-700 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-3 py-3">Entry Code / ID</th>
                        <th className="px-3 py-3">Type</th>
                        <th className="px-3 py-3">Payment Method</th>
                        <th className="px-4 py-3">Description / Voucher #</th>
                        <th className="px-3 py-3 text-right">Amount (₨)</th>
                        <th className="px-3 py-3 text-center w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {vendorCashEntries.map(entry => (
                        <tr
                          key={entry.id}
                          id={`vendor-cash-row-${entry.id}`}
                          onDoubleClick={() => onOpenCashModal(vendor.id, entry)}
                          className="hover:bg-amber-50/50 cursor-pointer transition-colors"
                          title="Double-click to edit cash entry"
                        >
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-neutral-600">
                            {new Date(entry.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>

                          <td className="px-3 py-3 whitespace-nowrap font-mono font-bold text-neutral-800">
                            {entry.entryCode || 'Cash'}
                          </td>

                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              entry.type === 'cash_sent' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                            }`}>
                              {entry.type === 'cash_sent' ? 'Cash Sent' : 'Cash Received'}
                            </span>
                          </td>

                          <td className="px-3 py-3 whitespace-nowrap text-neutral-700 font-medium">
                            {entry.paymentMethod || 'Cash'}
                          </td>

                          <td className="px-4 py-3 text-neutral-800 max-w-xs truncate">
                            {entry.description}
                            {entry.receiptNumber && (
                              <span className="text-neutral-400 text-[11px] ml-1.5">(Ref: {entry.receiptNumber})</span>
                            )}
                          </td>

                          <td className="px-3 py-3 text-right font-black text-neutral-900 whitespace-nowrap">
                            ₨ {entry.amount?.toLocaleString()}
                          </td>

                          <td className="px-3 py-3 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => onOpenCashModal(vendor.id, entry)}
                                className="p-1 rounded text-neutral-400 hover:text-amber-700 hover:bg-neutral-100"
                                title="Edit entry"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteLedgerEntry(entry.id)}
                                className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-neutral-100"
                                title="Delete entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

          {/* TAB 5: LINKED INVENTORY PRODUCTS */}
          {activeTab === 'products' && (
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Products Linked to {vendor.businessName}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Catalog parts supplied or sourced from this vendor
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-configure-items-from-tab"
                  onClick={() => onOpenConfigureLinksModal(vendor)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Boxes className="w-4 h-4" />
                  <span>Configure / Link More Products</span>
                </button>
              </div>

              {linkedProducts.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-neutral-200 rounded-2xl text-center text-neutral-400">
                  <Boxes className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No inventory products linked to this vendor yet.</p>
                  <button
                    type="button"
                    onClick={() => onOpenConfigureLinksModal(vendor)}
                    className="mt-3 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold"
                  >
                    Link Products Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {linkedProducts.map(prod => {
                    const retailPrice = prod.sellingPrices?.find(p => p.tierId === 'tier-retail')?.price || prod.costPrice * 1.25;

                    return (
                      <div
                        key={prod.id}
                        className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200 hover:border-amber-300 hover:bg-white transition-all shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <span className="font-mono text-[11px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                              {prod.internalId}
                            </span>
                            <h4 className="text-sm font-bold text-neutral-900 mt-1">
                              {prod.name}
                            </h4>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            prod.stockQuantity > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            Stock: {prod.stockQuantity}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
                          {prod.brandName && (
                            <span className="font-medium text-neutral-700">{prod.brandName}</span>
                          )}
                          {prod.typeName && (
                            <span>• {prod.typeName}</span>
                          )}
                        </div>

                        {prod.cabinNumber && (
                          <div className="text-[11px] text-neutral-500 mt-1">
                            Location: <strong>{prod.cabinNumber}</strong> ({prod.locationName || 'Main'})
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-200 text-xs">
                          <span className="text-neutral-500">
                            Cost: <strong className="text-neutral-900">₨ {prod.costPrice?.toLocaleString()}</strong>
                          </span>
                          <span className="text-neutral-500">
                            Retail: <strong className="text-amber-800 font-bold">₨ {Math.round(retailPrice).toLocaleString()}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Vendor Ledger Print Statement Modal */}
      {showPrintModal && (
        <VendorLedgerPrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          vendor={vendor}
          ledgerRows={fullLedger}
          currentBalance={currentBalance}
        />
      )}
    </div>
  );
};
