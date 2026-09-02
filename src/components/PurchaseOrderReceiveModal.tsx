import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Vendor, PurchaseOrder, PurchaseOrderItem, QuantityUnit, CostBatch } from '../types';
import { 
  X, 
  Plus, 
  Trash2, 
  Search, 
  Truck, 
  Building2, 
  Calendar, 
  Box, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Layers,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Clock,
  Sparkles,
  Receipt,
  Scale
} from 'lucide-react';

interface PurchaseOrderReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder?: PurchaseOrder | null;
  po?: PurchaseOrder | null;
  vendors: Vendor[];
  products: Product[];
  onProcessReceiving: (
    poData: PurchaseOrder,
    isPendingBill: boolean
  ) => void;
}

interface ReceiveItemState {
  tempId: string;
  productId: string;
  internalId: string;
  productName: string;
  brandName?: string;
  typeName?: string;
  unit: QuantityUnit;
  orderedQuantity: number;
  receivedQuantity: number;
  actualUnitPrice: number;
  isExtraItem?: boolean;
  notes?: string;
}

export const PurchaseOrderReceiveModal: React.FC<PurchaseOrderReceiveModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  po: poProp,
  vendors = [],
  products = [],
  onProcessReceiving
}) => {
  const po = purchaseOrder || poProp || null;

  const isFinalizingPendingBill = po?.status === 'pending_bill';
  const wasStockAlreadyReceived = Boolean(po?.isStockReceived) || isFinalizingPendingBill || po?.status === 'completed';

  // Form State
  const [receivingDate, setReceivingDate] = useState<string>(
    po?.receivingDate || new Date().toISOString().split('T')[0]
  );
  const [billNumber, setBillNumber] = useState<string>(po?.billNumber || '');
  const [biltyNumber, setBiltyNumber] = useState<string>(po?.biltyNumber || '');
  const [transporterName, setTransporterName] = useState<string>(po?.transporterName || '');
  const [cargoCost, setCargoCost] = useState<number>(po?.cargoCost || 0);
  const [amountPaid, setAmountPaid] = useState<number>(po?.amountPaid || 0);
  const [notes, setNotes] = useState<string>(po?.notes || '');

  // Mode: Delayed billing (pending bill) vs Immediate finalized bill
  const [isPendingBill, setIsPendingBill] = useState<boolean>(false);

  // Items State
  const [items, setItems] = useState<ReceiveItemState[]>([]);

  // Extra product search dropdown state
  const [showAddExtraDropdown, setShowAddExtraDropdown] = useState<boolean>(false);
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Initialize items from PO
  useEffect(() => {
    if (!po) return;

    setReceivingDate(po.receivingDate || new Date().toISOString().split('T')[0]);
    setBillNumber(po.billNumber || '');
    setBiltyNumber(po.biltyNumber || '');
    setTransporterName(po.transporterName || '');
    setCargoCost(po.cargoCost || 0);
    setAmountPaid(po.amountPaid || 0);
    setNotes(po.notes || '');

    // Reset workflow mode: if finalizing a pending bill or completed PO, default isPendingBill to false!
    setIsPendingBill(false);

    // Map existing PO items
    const mappedItems: ReceiveItemState[] = po.items.map(it => {
      const matchProd = products.find(p => p.id === it.productId);
      const defaultRecQty = it.receivedQuantity > 0 
        ? it.receivedQuantity 
        : (it.orderedQuantity > 0 ? it.orderedQuantity : 1);
      
      const defaultActualPrice = (it.actualUnitPrice !== undefined && it.actualUnitPrice > 0)
        ? it.actualUnitPrice
        : (it.estimatedUnitPrice || matchProd?.costPrice || 0);

      return {
        tempId: it.id || `poi-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: it.productId,
        internalId: it.internalId || matchProd?.internalId || '',
        productName: it.productName || matchProd?.name || '',
        brandName: it.brandName || matchProd?.brandName || '',
        typeName: it.typeName || matchProd?.typeName || '',
        unit: it.unit || matchProd?.unit || 'Pcs',
        orderedQuantity: it.orderedQuantity || 0,
        receivedQuantity: defaultRecQty,
        actualUnitPrice: defaultActualPrice,
        isExtraItem: it.isExtraItem || false,
        notes: it.notes || ''
      };
    });

    setItems(mappedItems);
  }, [po, products]);

  // Total received units calculation
  const totalReceivedUnits = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.receivedQuantity) || 0), 0);
  }, [items]);

  const totalOrderedUnits = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.orderedQuantity) || 0), 0);
  }, [items]);

  // Cargo cost per unit (e.g. 1000 / 20 = 50 PKR/unit)
  const cargoCostPerUnit = useMemo(() => {
    const safeCargo = Math.max(0, Number(cargoCost) || 0);
    return totalReceivedUnits > 0 ? Math.round((safeCargo / totalReceivedUnits) * 100) / 100 : 0;
  }, [cargoCost, totalReceivedUnits]);

  // Subtotal base cost
  const subtotalBaseCost = useMemo(() => {
    return items.reduce((sum, it) => {
      const qty = Number(it.receivedQuantity) || 0;
      const unitPrice = Number(it.actualUnitPrice) || 0;
      return sum + (qty * unitPrice);
    }, 0);
  }, [items]);

  // Total landed cost (Base Cost + Cargo)
  const totalLandedCost = useMemo(() => {
    return Math.round(subtotalBaseCost + (Number(cargoCost) || 0));
  }, [subtotalBaseCost, cargoCost]);

  // Close extra product dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAddExtraDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter products for extra search
  const filteredSearchProducts = useMemo(() => {
    if (!productSearchQuery.trim()) {
      return products.slice(0, 8);
    }
    const q = productSearchQuery.toLowerCase().trim();
    return products.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.internalId && p.internalId.toLowerCase().includes(q)) ||
      (p.brandName && p.brandName.toLowerCase().includes(q)) ||
      (p.typeName && p.typeName.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [products, productSearchQuery]);

  const handleAddExtraProduct = (prod: Product) => {
    const existingIndex = items.findIndex(it => it.productId === prod.id);
    if (existingIndex >= 0) {
      setItems(prev => prev.map((it, idx) => 
        idx === existingIndex 
          ? { ...it, receivedQuantity: it.receivedQuantity + 1 }
          : it
      ));
    } else {
      const newItem: ReceiveItemState = {
        tempId: `poi-extra-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: prod.id,
        internalId: prod.internalId,
        productName: prod.name,
        brandName: prod.brandName,
        typeName: prod.typeName,
        unit: prod.unit || 'Pcs',
        orderedQuantity: 0, // was not in original PO
        receivedQuantity: 1,
        actualUnitPrice: prod.costPrice || 0,
        isExtraItem: true,
        notes: 'Arrived extra in cargo'
      };
      setItems(prev => [...prev, newItem]);
    }
    setProductSearchQuery('');
    setShowAddExtraDropdown(false);
  };

  const handleUpdateItem = (index: number, field: keyof ReceiveItemState, value: any) => {
    setItems(prev => prev.map((it, idx) => {
      if (idx !== index) return it;
      return { ...it, [field]: value };
    }));
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    if (!po) return;

    if (items.length === 0) {
      alert('Please specify at least one received product.');
      return;
    }

    if (totalReceivedUnits <= 0) {
      alert('Total received quantity must be greater than 0.');
      return;
    }

    // Prepare items with allocated landed costs
    const finalItems: PurchaseOrderItem[] = items.map(it => {
      const recQty = Number(it.receivedQuantity) || 0;
      const unitPrice = Number(it.actualUnitPrice) || 0;
      const allocatedCargo = cargoCostPerUnit;
      const landedUnitCost = unitPrice + allocatedCargo;
      const totalLineCost = Math.round(recQty * landedUnitCost);

      return {
        id: it.tempId,
        productId: it.productId,
        internalId: it.internalId,
        productName: it.productName,
        brandName: it.brandName,
        typeName: it.typeName,
        unit: it.unit,
        orderedQuantity: Number(it.orderedQuantity) || 0,
        receivedQuantity: recQty,
        estimatedUnitPrice: it.actualUnitPrice,
        actualUnitPrice: unitPrice,
        allocatedCargoCost: allocatedCargo,
        landedUnitCost,
        totalLineCost,
        isExtraItem: it.isExtraItem,
        notes: it.notes
      };
    });

    const updatedPO: PurchaseOrder = {
      ...po,
      receivingDate: receivingDate || new Date().toISOString().split('T')[0],
      billNumber: billNumber.trim() || undefined,
      biltyNumber: biltyNumber.trim() || undefined,
      transporterName: transporterName.trim() || undefined,
      items: finalItems,
      totalOrderedQty: totalOrderedUnits,
      totalReceivedQty: totalReceivedUnits,
      cargoCost: Number(cargoCost) || 0,
      cargoCostPerUnit,
      subtotalBaseCost,
      totalLandedCost,
      amountPaid: Number(amountPaid) || 0,
      paymentStatus: (Number(amountPaid) || 0) >= totalLandedCost ? 'paid' : ((Number(amountPaid) || 0) > 0 ? 'partial' : 'unpaid'),
      notes: notes.trim() || undefined
    };

    const finalIsPending = isFinalizingPendingBill ? false : isPendingBill;
    onProcessReceiving(updatedPO, finalIsPending);
    onClose();
  };

  if (!isOpen || !po) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 px-5 sm:px-7 py-4 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-emerald-200 border border-white/20 shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {isFinalizingPendingBill 
                    ? `Finalize Bill Costs & Vendor Ledger (${po.poNumber})` 
                    : `Process Cargo Receiving & Landed Costs (${po.poNumber})`}
                </h2>
                <span className="px-2.5 py-0.5 bg-emerald-950/60 text-emerald-200 text-[10px] font-bold rounded-md border border-emerald-500/30">
                  {po.vendorName}
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">
                {isFinalizingPendingBill
                  ? 'Physical stock is already added. Enter invoice unit costs to update inventory pricing and post the vendor ledger entry on the original receiving date.'
                  : 'Receive physical shipment, adjust quantities, allocate freight across items, and update inventory.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Important Status Banner */}
          {wasStockAlreadyReceived ? (
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 mt-0.5 shadow-2xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-xs text-blue-950">
                <h4 className="font-black text-blue-900 flex items-center gap-2">
                  <span>Physical Stock Already Added in Inventory</span>
                  <span className="px-1.5 py-0.2 bg-blue-200 text-blue-900 text-[10px] font-bold rounded">
                    Received on {po.receivingDate || 'earlier'}
                  </span>
                </h4>
                <p className="text-[11px] text-blue-800 mt-1">
                  Physical stock (+{totalReceivedUnits} units) was logged on receiving. Saving this form will <strong>NOT duplicate your stock quantities</strong>; it will update the item cost prices in inventory and record the vendor ledger balance on <strong>{receivingDate}</strong>.
                </p>
              </div>
            </div>
          ) : (
            /* Workflow Mode Selector for New Receiving */
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  <span>Select Receiving & Billing Workflow:</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Full Finalized Bill */}
                <div 
                  onClick={() => setIsPendingBill(false)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    !isPendingBill 
                      ? 'bg-emerald-50/80 border-emerald-600 shadow-xs ring-2 ring-emerald-500/20' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        !isPendingBill ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        1
                      </div>
                      <span className="font-black text-xs text-slate-900">
                        Bill & Unit Costs Available
                      </span>
                    </div>
                    {!isPendingBill && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2 font-medium">
                    Adjusts stock, calculates landed costs (Base + Cargo distribution), updates inventory pricing formulas, and posts balance to Vendor Ledger immediately.
                  </p>
                </div>

                {/* Option 2: Stock Only / Pending Bill */}
                <div 
                  onClick={() => setIsPendingBill(true)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    isPendingBill 
                      ? 'bg-amber-50/80 border-amber-600 shadow-xs ring-2 ring-amber-500/20' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        isPendingBill ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        2
                      </div>
                      <span className="font-black text-xs text-slate-900">
                        Bill Pending / Costs Unknown
                      </span>
                    </div>
                    {isPendingBill && (
                      <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2 font-medium">
                    Records physical stock receipt into inventory immediately so goods can be sold at POS, and posts an entry in the Vendor Ledger on the receiving date with <strong>₨ 0 balance</strong> until costs are finalized.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Receiving Logistics & Cargo Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
            {/* Receiving Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cargo Arrival Date *</span>
              </label>
              <input
                type="date"
                value={receivingDate}
                onChange={(e) => setReceivingDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-2xs"
              />
            </div>

            {/* Vendor Bill Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Supplier Invoice / Bill #</span>
              </label>
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder={isPendingBill ? 'Bill pending...' : 'e.g. SF-9921'}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-mono shadow-2xs"
              />
            </div>

            {/* Cargo / Freight Expense (PKR) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cargo / Bilty Cost (₨)</span>
                </span>
                {totalReceivedUnits > 0 && cargoCost > 0 && (
                  <span className="text-[10px] text-emerald-700 font-bold font-mono">
                    = ₨ {cargoCostPerUnit}/pc
                  </span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₨</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={cargoCost || ''}
                  onChange={(e) => setCargoCost(parseFloat(e.target.value) || 0)}
                  placeholder="0 (e.g. 1000)"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Bilty Tracking Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-slate-500" />
                <span>Bilty / Tracking #</span>
              </label>
              <input
                type="text"
                value={biltyNumber}
                onChange={(e) => setBiltyNumber(e.target.value)}
                placeholder="e.g. BLT-78923"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-mono shadow-2xs"
              />
            </div>

            {/* Transporter Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-500" />
                <span>Goods Transporter / Cargo Service</span>
              </label>
              <input
                type="text"
                value={transporterName}
                onChange={(e) => setTransporterName(e.target.value)}
                placeholder="e.g. Faisal Movers Cargo, Al-Madina Goods Transport..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-2xs"
              />
            </div>

            {/* Amount Paid on Spot */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Amount Paid on Spot (₨)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {amountPaid > 0 ? `Paid: ₨ ${amountPaid.toLocaleString()}` : 'Unpaid (on credit)'}
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₨</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  placeholder="0 (leave 0 if paid on credit)"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Items Table with Flexible Received Qty, Costs, and Cargo Distribution */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-emerald-600" />
                  <span>Cargo Items & Landed Cost Breakdown ({items.length} items • {totalReceivedUnits} units)</span>
                </label>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Edit received quantities (e.g. if 4 arrived instead of 2), edit bill rates, or add extra products that arrived in cargo.
                </p>
              </div>

              {/* Add Extra Product Button */}
              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowAddExtraDropdown(!showAddExtraDropdown)}
                  className="px-3 py-1.5 bg-emerald-100/90 hover:bg-emerald-200 text-emerald-900 text-xs font-black rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-emerald-300/80 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add Extra Product Arrived in Cargo</span>
                </button>

                {showAddExtraDropdown && (
                  <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-40 p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        placeholder="Search extra product..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-600"
                        autoFocus
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {filteredSearchProducts.map(prod => (
                        <div
                          key={prod.id}
                          onClick={() => handleAddExtraProduct(prod)}
                          className="p-2 hover:bg-emerald-50 rounded-xl cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1">
                              <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded font-bold">
                                {prod.internalId}
                              </span>
                              <span>{prod.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              Stock: {prod.stockQuantity || 0} {prod.unit} • Cost: ₨ {(prod.costPrice || 0).toLocaleString()}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-700">+ Add</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto max-h-[42vh]">
                <table className="w-full min-w-[700px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                      <th className="py-2.5 px-3 w-8 text-center">#</th>
                      <th className="py-2.5 px-3">Product / Part</th>
                      <th className="py-2.5 px-2 text-center w-20">Ordered</th>
                      <th className="py-2.5 px-2 text-center w-28">Received Qty *</th>
                      <th className="py-2.5 px-3 text-right w-32">Bill Unit Rate (₨)</th>
                      <th className="py-2.5 px-2 text-center w-24">Cargo/Unit</th>
                      <th className="py-2.5 px-3 text-right w-32">Landed Cost (₨)</th>
                      <th className="py-2.5 px-3 text-right w-32">Line Total (₨)</th>
                      <th className="py-2.5 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {items.map((item, index) => {
                      const recQty = Number(item.receivedQuantity) || 0;
                      const unitRate = Number(item.actualUnitPrice) || 0;
                      const allocatedCargo = cargoCostPerUnit;
                      const landedUnitCost = unitRate + allocatedCargo;
                      const lineTotal = Math.round(recQty * landedUnitCost);
                      const isExtra = item.isExtraItem || item.orderedQuantity === 0;
                      const qtyDiff = recQty - (item.orderedQuantity || 0);

                      return (
                        <tr key={item.tempId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {index + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[11px] text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded font-bold">
                                {item.internalId}
                              </span>
                              <span>{item.productName}</span>
                              {isExtra && (
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 text-[10px] font-bold rounded">
                                  Extra Arrived
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {item.brandName && <span>Brand: {item.brandName} • </span>}
                              {item.typeName && <span>Type: {item.typeName}</span>}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold text-slate-500">
                            {item.orderedQuantity > 0 ? `${item.orderedQuantity} ${item.unit}` : '-'}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={item.receivedQuantity}
                                onChange={(e) => handleUpdateItem(index, 'receivedQuantity', parseInt(e.target.value, 10) || 0)}
                                className="w-20 px-2 py-1 bg-white border-2 border-emerald-500 rounded-lg text-xs font-black text-center text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                              />
                              {item.orderedQuantity > 0 && qtyDiff !== 0 && (
                                <span className={`text-[10px] font-bold ${
                                  qtyDiff > 0 ? 'text-emerald-700' : 'text-rose-600'
                                }`}>
                                  {qtyDiff > 0 ? `+${qtyDiff} extra` : `${qtyDiff} short`}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.actualUnitPrice || ''}
                              onChange={(e) => handleUpdateItem(index, 'actualUnitPrice', parseFloat(e.target.value) || 0)}
                              placeholder={isPendingBill ? 'Pending...' : '0'}
                              className="w-28 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-right text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono shadow-2xs"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-600 text-[11px]">
                            {cargoCost > 0 ? `+₨ ${cargoCostPerUnit}` : '₨ 0'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-800 font-mono">
                            ₨ {landedUnitCost.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono">
                            ₨ {lineTotal.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {isExtra && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                                title="Remove extra item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 3: Detailed Landed Cost Calculation Summary Card */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-emerald-800/60 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-300" />
                <h4 className="font-black text-xs sm:text-sm text-emerald-100 tracking-tight">
                  Proportional Cargo Distribution Engine
                </h4>
              </div>
              <p className="text-[11px] text-emerald-200/90 font-medium max-w-xl">
                Total <strong>{totalReceivedUnits} units</strong> received. Cargo freight of <strong>₨ {cargoCost.toLocaleString()}</strong> is distributed across all <strong>{totalReceivedUnits} units</strong> (≈ <strong>₨ {cargoCostPerUnit}/pc</strong>), accurately increasing unit inventory value and profit margins.
              </p>
            </div>

            <div className="flex items-center gap-4 text-right shrink-0 bg-white/10 p-3 rounded-xl backdrop-blur-xs border border-white/10">
              <div>
                <span className="text-[10px] font-bold text-emerald-200 uppercase block">Subtotal Base</span>
                <span className="text-xs font-bold text-white font-mono">
                  ₨ {subtotalBaseCost.toLocaleString()}
                </span>
              </div>
              <div className="text-xs font-bold text-emerald-300">+</div>
              <div>
                <span className="text-[10px] font-bold text-emerald-200 uppercase block">Total Cargo</span>
                <span className="text-xs font-bold text-emerald-300 font-mono">
                  ₨ {cargoCost.toLocaleString()}
                </span>
              </div>
              <div className="text-xs font-bold text-emerald-300">=</div>
              <div>
                <span className="text-[10px] font-black text-emerald-200 uppercase block">Total Landed Cost</span>
                <span className="text-base font-black text-white font-mono">
                  ₨ {totalLandedCost.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Receiving Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Cargo Inspection Notes / Warehouse Remarks</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. All 10 cartons arrived in intact condition via Faisal Movers Bilty #78923; verified by warehouse supervisor."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-2xs"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              className={`px-5 py-2.5 text-white text-xs font-black rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer select-none ${
                isPendingBill 
                  ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800' 
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isFinalizingPendingBill 
                  ? 'Finalize Landed Costs & Post Ledger' 
                  : isPendingBill 
                    ? 'Receive Stock (Bill Pending)' 
                    : 'Confirm Receiving & Finalize Costs'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
