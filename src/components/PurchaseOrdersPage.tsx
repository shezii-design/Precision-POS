import React, { useState, useMemo } from 'react';
import { PurchaseOrder, Vendor, Product, PurchaseOrderStatus } from '../types';
import { 
  Truck, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Building2, 
  Box, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  FileText, 
  Scale, 
  Printer, 
  Trash2, 
  Edit3, 
  ArrowRight,
  Sparkles,
  Info,
  ExternalLink
} from 'lucide-react';

interface PurchaseOrdersPageProps {
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  products: Product[];
  onOpenCreatePO: (vendorId?: string) => void;
  onOpenReceiveCargo: (po: PurchaseOrder) => void;
  onViewPO: (po: PurchaseOrder) => void;
  onEditPO: (po: PurchaseOrder) => void;
  onDeletePO: (poId: string) => void;
  onSelectVendor?: (vendor: Vendor) => void;
}

export const PurchaseOrdersPage: React.FC<PurchaseOrdersPageProps> = ({
  purchaseOrders,
  vendors,
  products,
  onOpenCreatePO,
  onOpenReceiveCargo,
  onViewPO,
  onEditPO,
  onDeletePO,
  onSelectVendor
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | PurchaseOrderStatus>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');

  // KPI Computations
  const totalPOsCount = purchaseOrders.length;
  const inTransitCount = purchaseOrders.filter(po => po.status === 'ordered').length;
  const pendingBillCount = purchaseOrders.filter(po => po.status === 'pending_bill').length;
  const completedCount = purchaseOrders.filter(po => po.status === 'completed').length;
  const totalLandedCostSum = purchaseOrders
    .filter(po => po.status === 'completed')
    .reduce((sum, po) => sum + (po.totalLandedCost || 0), 0);

  // Filtered list
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(po => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNumber = po.poNumber && po.poNumber.toLowerCase().includes(q);
        const matchesVendor = po.vendorName && po.vendorName.toLowerCase().includes(q);
        const matchesBill = po.billNumber && po.billNumber.toLowerCase().includes(q);
        const matchesBilty = po.biltyNumber && po.biltyNumber.toLowerCase().includes(q);
        const matchesTransporter = po.transporterName && po.transporterName.toLowerCase().includes(q);
        const matchesItems = po.items.some(it => 
          (it.productName && it.productName.toLowerCase().includes(q)) ||
          (it.internalId && it.internalId.toLowerCase().includes(q))
        );

        if (!matchesNumber && !matchesVendor && !matchesBill && !matchesBilty && !matchesTransporter && !matchesItems) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && po.status !== statusFilter) {
        return false;
      }

      // Vendor filter
      if (vendorFilter !== 'all' && po.vendorId !== vendorFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      // Prioritize pending bill, then ordered, then completed
      const priority = (s: PurchaseOrderStatus) => {
        if (s === 'pending_bill') return 1;
        if (s === 'ordered') return 2;
        if (s === 'draft') return 3;
        return 4;
      };
      const pA = priority(a.status);
      const pB = priority(b.status);
      if (pA !== pB) return pA - pB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [purchaseOrders, searchQuery, statusFilter, vendorFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-800 font-bold">
              <Truck className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Purchase Orders & Cargo Receiving
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Issue orders, receive shipments with flexible quantities & extra items, distribute cargo freight proportionally, and manage delayed billings.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            id="btn-create-po"
            onClick={() => onOpenCreatePO()}
            className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs sm:text-sm font-black rounded-2xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer select-none"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Purchase Order</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total POs */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total PO Orders
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {totalPOsCount}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block">
              All active & historic
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold border border-slate-200">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: In-Transit Cargo */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'ordered' ? 'all' : 'ordered')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
            statusFilter === 'ordered' 
              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-400/20' 
              : 'bg-white border-slate-200 shadow-2xs hover:border-blue-300'
          }`}
        >
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
              In Transit / Ordered
            </span>
            <span className="text-xl sm:text-2xl font-black text-blue-900 tracking-tight">
              {inTransitCount} Orders
            </span>
            <span className="text-[10px] text-blue-700/80 font-medium block">
              Awaiting cargo arrival
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold border border-blue-200">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Stock Received • Bill Pending */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'pending_bill' ? 'all' : 'pending_bill')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
            statusFilter === 'pending_bill' 
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20' 
              : 'bg-white border-slate-200 shadow-2xs hover:border-amber-300'
          }`}
        >
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
              Stock In • Bill Pending
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-950 tracking-tight">
              {pendingBillCount} Orders
            </span>
            <span className="text-[10px] text-amber-800/90 font-bold block">
              Requires invoice costs
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold border border-amber-200 animate-pulse">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Completed Landed Total */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
            statusFilter === 'completed' 
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/20' 
              : 'bg-white border-slate-200 shadow-2xs hover:border-emerald-300'
          }`}
        >
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Completed Landed Value
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-950 tracking-tight font-mono">
              ₨ {totalLandedCostSum.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium block">
              {completedCount} orders costed
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold border border-emerald-200">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Feature Guide Notice */}
      <div className="bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-50 p-4 rounded-2xl border border-amber-200 flex items-start gap-3 text-xs text-amber-950">
        <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold shrink-0 mt-0.5 shadow-2xs">
          <Scale className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h4 className="font-black text-amber-900">Flexible Receiving & Cargo Cost Logic:</h4>
          <p className="text-amber-800/90 text-[11px] leading-relaxed">
            1. <strong>Cargo Freight Distribution:</strong> Total cargo expense (e.g. ₨ 1,000 for 20 total pieces) is distributed equally across all units (₨ 50.00/pc), updating item cost in inventory.<br />
            2. <strong>Delayed Billing:</strong> Receive stock into inventory immediately when shipment arrives so you can start selling at POS, while keeping the PO in "Bill Pending" until vendor sends invoice.
          </p>
        </div>
      </div>

      {/* Search & Filters Section */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search PO#, Supplier, Bill#, Item..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all shadow-2xs"
          />
        </div>

        {/* Status Filter Chips & Vendor Dropdown */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({totalPOsCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ordered')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'ordered' ? 'bg-blue-600 text-white shadow-2xs font-black' : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              In Transit ({inTransitCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending_bill')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'pending_bill' ? 'bg-amber-600 text-white shadow-2xs font-black' : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              Bill Pending ({pendingBillCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'completed' ? 'bg-emerald-600 text-white shadow-2xs font-black' : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-amber-600 cursor-pointer shadow-2xs"
          >
            <option value="all">All Suppliers</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.businessName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* PO Orders List */}
      {filteredPOs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-100">
            <Truck className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900">No purchase orders found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Create your first purchase order to track vendor orders, cargo receipts, and proportional freight allocations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenCreatePO()}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Purchase Order</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredPOs.map((po) => {
            const isCompleted = po.status === 'completed';
            const isPendingBill = po.status === 'pending_bill';
            const isOrdered = po.status === 'ordered';
            const isDraft = po.status === 'draft';

            const displayQty = po.isStockReceived ? po.totalReceivedQty : po.totalOrderedQty;

            return (
              <div
                key={po.id}
                className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-2xs hover:shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
                  isPendingBill
                    ? 'border-amber-300 ring-2 ring-amber-400/20 bg-gradient-to-r from-white via-amber-50/30 to-white'
                    : isCompleted
                    ? 'border-emerald-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Left: PO Identification & Supplier */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                      {po.poNumber}
                    </span>

                    {/* Status Badge */}
                    {isCompleted && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-black rounded-md border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Completed • Landed Finalized
                      </span>
                    )}
                    {isPendingBill && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[11px] font-black rounded-md border border-amber-300 flex items-center gap-1 animate-pulse">
                        <Clock className="w-3 h-3" /> Stock In • Bill Pending
                      </span>
                    )}
                    {isOrdered && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-black rounded-md border border-blue-300 flex items-center gap-1">
                        <Truck className="w-3 h-3" /> In Transit
                      </span>
                    )}
                    {isDraft && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-md">
                        Draft
                      </span>
                    )}

                    {/* Cargo / Bilty Info */}
                    {po.biltyNumber && (
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                        Bilty: {po.biltyNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="font-bold text-slate-900 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>{po.vendorName}</span>
                    </span>

                    <span className="text-slate-400">•</span>

                    <span className="text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Ordered: {po.orderDate}</span>
                    </span>

                    {po.receivingDate && (
                      <>
                        <span className="text-slate-400">•</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Received: {po.receivingDate}</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Items preview */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-500">
                      {po.items.length} items ({displayQty} units):
                    </span>
                    {po.items.slice(0, 3).map((it, idx) => (
                      <span 
                        key={idx} 
                        className="text-[10px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200"
                      >
                        {it.productName} ({po.isStockReceived ? it.receivedQuantity : it.orderedQuantity} {it.unit})
                      </span>
                    ))}
                    {po.items.length > 3 && (
                      <span className="text-[10px] text-slate-400 font-bold">
                        +{po.items.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle: Financial & Cargo Distribution Breakdown */}
                <div className="flex items-center gap-4 sm:gap-6 bg-slate-50/90 px-4 py-2.5 rounded-2xl border border-slate-200/80 shrink-0">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Cargo Freight</span>
                    <span className="text-xs font-bold text-slate-700 font-mono">
                      ₨ {(po.cargoCost || 0).toLocaleString()}
                    </span>
                    {po.cargoCostPerUnit > 0 && (
                      <span className="text-[9px] text-amber-700 font-semibold block font-mono">
                        ₨ {po.cargoCostPerUnit}/unit
                      </span>
                    )}
                  </div>

                  <div className="h-7 w-px bg-slate-200" />

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      {isPendingBill ? 'Est. Landed Total' : 'Total Landed Cost'}
                    </span>
                    <span className="text-sm font-black text-slate-900 font-mono">
                      ₨ {(po.totalLandedCost || 0).toLocaleString()}
                    </span>
                    <span className={`text-[9px] font-bold block ${
                      po.isBilled ? 'text-emerald-700' : 'text-amber-800'
                    }`}>
                      {po.isBilled ? 'Ledger posted' : 'Ledger pending bill'}
                    </span>
                  </div>
                </div>

                {/* Right: Quick Action Controls */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end shrink-0">
                  {/* Primary CTA depends on state */}
                  {isPendingBill && (
                    <button
                      type="button"
                      onClick={() => onOpenReceiveCargo(po)}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-black rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer select-none"
                    >
                      <DollarSign className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Finalize Bill Costs</span>
                    </button>
                  )}

                  {isOrdered && (
                    <button
                      type="button"
                      onClick={() => onOpenReceiveCargo(po)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-black rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer select-none"
                    >
                      <Truck className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Receive Cargo</span>
                    </button>
                  )}

                  {isCompleted && (
                    <button
                      type="button"
                      onClick={() => onOpenReceiveCargo(po)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                      title="Edit cargo receiving or costs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Receiving</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onViewPO(po)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                    title="View & Print PO"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View / Print</span>
                  </button>

                  {isOrdered && (
                    <button
                      type="button"
                      onClick={() => onEditPO(po)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Edit Order"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete purchase order ${po.poNumber}?`)) {
                        onDeletePO(po.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete PO"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
