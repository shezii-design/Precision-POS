import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Vendor, PurchaseOrder, PurchaseOrderItem, QuantityUnit, PurchaseOrderStatus } from '../types';
import { getNextPurchaseOrderId } from '../services/storage';
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
  Clock,
  Sparkles,
  Info
} from 'lucide-react';

interface PurchaseOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePO: (po: PurchaseOrder) => void;
  vendors: Vendor[];
  products: Product[];
  initialPO?: PurchaseOrder | null;
  editingPO?: PurchaseOrder | null;
  initialVendorId?: string;
  nextPONumber?: string;
  purchaseOrdersList?: PurchaseOrder[];
}

interface POFormItemState {
  tempId: string;
  productId: string;
  internalId: string;
  productName: string;
  brandName?: string;
  typeName?: string;
  unit: QuantityUnit;
  stockInHand: number;
  orderedQuantity: number;
  estimatedUnitPrice: number;
  notes?: string;
}

export const PurchaseOrderFormModal: React.FC<PurchaseOrderFormModalProps> = ({
  isOpen,
  onClose,
  onSavePO,
  vendors = [],
  products = [],
  initialPO: initialPOProp,
  editingPO,
  initialVendorId,
  nextPONumber: customNextPONumber,
  purchaseOrdersList = []
}) => {
  const initialPO = editingPO !== undefined ? editingPO : initialPOProp;

  const autoNextPONumber = useMemo(() => {
    if (customNextPONumber) return customNextPONumber;
    return getNextPurchaseOrderId(purchaseOrdersList).poNumber;
  }, [customNextPONumber, purchaseOrdersList]);

  const [vendorId, setVendorId] = useState<string>('');
  const [vendorName, setVendorName] = useState<string>('');
  const [vendorPhone, setVendorPhone] = useState<string>('');
  const [vendorAddress, setVendorAddress] = useState<string>('');
  const [poNumber, setPoNumber] = useState<string>(autoNextPONumber);
  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>('');
  const [estimatedCargoCost, setEstimatedCargoCost] = useState<number>(0);
  const [status, setStatus] = useState<PurchaseOrderStatus>('ordered');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<POFormItemState[]>([]);

  // Product search dropdown state
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [showProductDropdown, setShowProductDropdown] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Initialize form state
  useEffect(() => {
    if (!isOpen) return;

    if (initialPO) {
      setVendorId(initialPO.vendorId || '');
      setVendorName(initialPO.vendorName || '');
      setVendorPhone(initialPO.vendorPhone || '');
      setVendorAddress(initialPO.vendorAddress || '');
      setPoNumber(initialPO.poNumber || autoNextPONumber);
      setOrderDate(initialPO.orderDate || new Date().toISOString().split('T')[0]);
      setExpectedDeliveryDate(initialPO.expectedDeliveryDate || '');
      setEstimatedCargoCost(initialPO.cargoCost || 0);
      setStatus(initialPO.status || 'ordered');
      setNotes(initialPO.notes || '');

      setItems(
        initialPO.items.map(it => {
          const matchProd = products.find(p => p.id === it.productId);
          return {
            tempId: it.id || `poi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            productId: it.productId,
            internalId: it.internalId || matchProd?.internalId || '',
            productName: it.productName || matchProd?.name || '',
            brandName: it.brandName || matchProd?.brandName || '',
            typeName: it.typeName || matchProd?.typeName || '',
            unit: it.unit || matchProd?.unit || 'Pcs',
            stockInHand: matchProd?.stockQuantity || 0,
            orderedQuantity: it.orderedQuantity || 1,
            estimatedUnitPrice: it.estimatedUnitPrice || matchProd?.costPrice || 0,
            notes: it.notes || ''
          };
        })
      );
    } else {
      // New PO
      const preselectedVendor = vendors.find(v => v.id === initialVendorId) || vendors[0];
      setVendorId(preselectedVendor ? preselectedVendor.id : '');
      setVendorName(preselectedVendor ? preselectedVendor.businessName : '');
      setVendorPhone(preselectedVendor ? preselectedVendor.phone || '' : '');
      setVendorAddress(preselectedVendor ? preselectedVendor.marketAddress || '' : '');
      setPoNumber(autoNextPONumber);
      setOrderDate(new Date().toISOString().split('T')[0]);
      
      const twoDaysLater = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
      setExpectedDeliveryDate(twoDaysLater);
      setEstimatedCargoCost(0);
      setStatus('ordered');
      setNotes('');
      setItems([]);
    }
  }, [isOpen, initialPO, initialVendorId, autoNextPONumber, vendors, products]);

  // Sync vendor details on change
  const handleVendorSelect = (selectedId: string) => {
    setVendorId(selectedId);
    const v = vendors.find(item => item.id === selectedId);
    if (v) {
      setVendorName(v.businessName);
      setVendorPhone(v.phone || '');
      setVendorAddress(v.marketAddress || '');
    }
  };

  // Filter products for search autocomplete
  const filteredSearchProducts = useMemo(() => {
    if (!productSearchQuery.trim()) {
      return products.slice(0, 8);
    }
    const q = productSearchQuery.toLowerCase().trim();
    return products.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.internalId && p.internalId.toLowerCase().includes(q)) ||
      (p.brandName && p.brandName.toLowerCase().includes(q)) ||
      (p.typeName && p.typeName.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.machineNames && p.machineNames.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [products, productSearchQuery]);

  // Close product dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddProduct = (prod: Product) => {
    // Check if already in list
    const existingIndex = items.findIndex(it => it.productId === prod.id);
    if (existingIndex >= 0) {
      // Increase qty
      setItems(prev => prev.map((it, idx) => 
        idx === existingIndex 
          ? { ...it, orderedQuantity: it.orderedQuantity + 1 }
          : it
      ));
    } else {
      const newItem: POFormItemState = {
        tempId: `poi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: prod.id,
        internalId: prod.internalId,
        productName: prod.name,
        brandName: prod.brandName,
        typeName: prod.typeName,
        unit: prod.unit || 'Pcs',
        stockInHand: prod.stockQuantity || 0,
        orderedQuantity: 1,
        estimatedUnitPrice: prod.costPrice || 0,
        notes: ''
      };
      setItems(prev => [...prev, newItem]);
    }
    setProductSearchQuery('');
    setShowProductDropdown(false);
  };

  const handleUpdateItem = (index: number, field: keyof POFormItemState, value: any) => {
    setItems(prev => prev.map((it, idx) => {
      if (idx !== index) return it;
      return { ...it, [field]: value };
    }));
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Financial calculations
  const totalOrderedQty = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.orderedQuantity) || 0), 0);
  }, [items]);

  const subtotalEstimatedCost = useMemo(() => {
    return items.reduce((sum, it) => sum + ((Number(it.orderedQuantity) || 0) * (Number(it.estimatedUnitPrice) || 0)), 0);
  }, [items]);

  const estimatedCargoPerUnit = useMemo(() => {
    return totalOrderedQty > 0 ? Math.round((Number(estimatedCargoCost || 0) / totalOrderedQty) * 100) / 100 : 0;
  }, [totalOrderedQty, estimatedCargoCost]);

  const totalEstimatedLandedCost = useMemo(() => {
    return Math.round(subtotalEstimatedCost + (Number(estimatedCargoCost) || 0));
  }, [subtotalEstimatedCost, estimatedCargoCost]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorId && !vendorName.trim()) {
      alert('Please select or specify a supplier/vendor.');
      return;
    }

    if (items.length === 0) {
      alert('Please add at least one product to the purchase order.');
      return;
    }

    // Validate quantities
    for (const it of items) {
      if (!it.orderedQuantity || it.orderedQuantity <= 0) {
        alert(`Please enter a valid ordered quantity for ${it.productName}`);
        return;
      }
    }

    const finalItems: PurchaseOrderItem[] = items.map(it => {
      const unitCost = Number(it.estimatedUnitPrice) || 0;
      const allocatedCargo = estimatedCargoPerUnit;
      const landedCost = unitCost + allocatedCargo;
      const lineCost = Math.round((Number(it.orderedQuantity) || 0) * landedCost);

      return {
        id: it.tempId,
        productId: it.productId,
        internalId: it.internalId,
        productName: it.productName,
        brandName: it.brandName,
        typeName: it.typeName,
        unit: it.unit,
        orderedQuantity: Number(it.orderedQuantity) || 1,
        receivedQuantity: 0,
        estimatedUnitPrice: unitCost,
        actualUnitPrice: 0,
        allocatedCargoCost: allocatedCargo,
        landedUnitCost: landedCost,
        totalLineCost: lineCost,
        isExtraItem: false,
        notes: it.notes
      };
    });

    const poToSave: PurchaseOrder = {
      id: initialPO?.id || `PO-${Date.now()}`,
      poNumber: poNumber.trim() || autoNextPONumber,
      vendorId: vendorId || (vendors[0]?.id || 'vend-1'),
      vendorName: vendorName.trim() || 'Unknown Vendor',
      vendorPhone: vendorPhone.trim() || undefined,
      vendorAddress: vendorAddress.trim() || undefined,
      orderDate: orderDate || new Date().toISOString().split('T')[0],
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      receivingDate: initialPO?.receivingDate,
      costsFinalizedDate: initialPO?.costsFinalizedDate,
      status: initialPO?.status === 'pending_bill' || initialPO?.status === 'completed' ? initialPO.status : status,
      items: finalItems,
      totalOrderedQty,
      totalReceivedQty: initialPO?.totalReceivedQty || 0,
      cargoCost: Number(estimatedCargoCost) || 0,
      cargoCostPerUnit: estimatedCargoPerUnit,
      subtotalBaseCost: subtotalEstimatedCost,
      totalLandedCost: totalEstimatedLandedCost,
      billNumber: initialPO?.billNumber,
      biltyNumber: initialPO?.biltyNumber,
      transporterName: initialPO?.transporterName,
      amountPaid: initialPO?.amountPaid || 0,
      paymentStatus: initialPO?.paymentStatus || 'unpaid',
      isStockReceived: Boolean(initialPO?.isStockReceived),
      isBilled: Boolean(initialPO?.isBilled),
      notes: notes.trim() || undefined,
      createdAt: initialPO?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSavePO(poToSave);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 px-5 sm:px-7 py-4 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-amber-200 border border-white/20 shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {initialPO ? `Edit Purchase Order (${initialPO.poNumber})` : 'Create Purchase Order (PO)'}
                </h2>
                <span className="px-2 py-0.5 bg-amber-900/60 text-amber-200 text-[10px] font-bold rounded-md border border-amber-500/30">
                  Pre-Receiving Order
                </span>
              </div>
              <p className="text-xs text-amber-100/90 font-medium">
                Draft or issue restocking order to vendor. Stock is deducted/incremented only when cargo physically arrives.
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

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Section 1: Order Details & Vendor Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
            {/* Vendor Selector */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Supplier / Vendor *</span>
              </label>
              <select
                value={vendorId}
                onChange={(e) => handleVendorSelect(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all cursor-pointer shadow-2xs"
              >
                <option value="">-- Select Supplier --</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.businessName} {v.city ? `(${v.city})` : ''}
                  </option>
                ))}
              </select>
              {vendorPhone && (
                <p className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1 truncate">
                  <span>Phone: {vendorPhone}</span>
                  {vendorAddress && <span>• {vendorAddress}</span>}
                </p>
              )}
            </div>

            {/* PO Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>PO Number *</span>
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                required
                placeholder="e.g. PO-1004"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all font-mono shadow-2xs"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Order Status</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all cursor-pointer shadow-2xs"
              >
                <option value="ordered">Ordered (In Transit)</option>
                <option value="draft">Draft PO</option>
              </select>
            </div>

            {/* Order Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Order Date *</span>
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all shadow-2xs"
              />
            </div>

            {/* Expected Delivery Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Expected Cargo Arrival</span>
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all shadow-2xs"
              />
            </div>

            {/* Estimated Cargo Freight */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Est. Cargo / Freight Cost (₨)</span>
                </span>
                {totalOrderedQty > 0 && estimatedCargoCost > 0 && (
                  <span className="text-[11px] text-amber-700 font-semibold font-mono">
                    ≈ ₨ {estimatedCargoPerUnit}/pc
                  </span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₨</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={estimatedCargoCost || ''}
                  onChange={(e) => setEstimatedCargoCost(parseFloat(e.target.value) || 0)}
                  placeholder="0 (e.g. 1000)"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Product Search & Auto-Picker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Box className="w-4 h-4 text-amber-600" />
                <span>Products to Order ({items.length} items)</span>
              </label>
              <span className="text-xs text-slate-500 font-medium">
                Search part name, internal ID (KFH-xxxx), brand, or size
              </span>
            </div>

            {/* Search Input Bar */}
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={productSearchQuery}
                  onChange={(e) => {
                    setProductSearchQuery(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  placeholder="Search and click product to add to Purchase Order..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all shadow-2xs"
                />
                {productSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setProductSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showProductDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 z-30 max-h-64 overflow-y-auto p-1.5 divide-y divide-slate-100 animate-in fade-in-50 zoom-in-95 duration-150">
                  {filteredSearchProducts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 font-medium">
                      No matching products found in inventory catalog.
                    </div>
                  ) : (
                    filteredSearchProducts.map(prod => {
                      const isAlreadyAdded = items.some(it => it.productId === prod.id);
                      return (
                        <div
                          key={prod.id}
                          onClick={() => handleAddProduct(prod)}
                          className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                            isAlreadyAdded ? 'bg-amber-50/60 hover:bg-amber-100/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                              <Box className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-[11px] text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded">
                                  {prod.internalId}
                                </span>
                                <span className="font-black text-xs text-slate-900 truncate">
                                  {prod.name}
                                </span>
                                {prod.brandName && (
                                  <span className="text-[10px] font-semibold text-slate-500">
                                    • {prod.brandName}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mt-0.5">
                                <span>Stock: <strong className="text-slate-800">{prod.stockQuantity || 0} {prod.unit || 'Pcs'}</strong></span>
                                <span>•</span>
                                <span>Current Cost: <strong className="text-slate-800">₨ {(prod.costPrice || 0).toLocaleString()}</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {isAlreadyAdded ? (
                              <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-bold rounded-lg flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Added (+1)
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> Add
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Items Table */}
            {items.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                <Box className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No products added to this Purchase Order yet</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Use the search bar above to select products from your inventory catalog.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-[38vh]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">Product / Part</th>
                        <th className="py-2.5 px-3 text-center w-24">In Hand</th>
                        <th className="py-2.5 px-3 text-center w-28">Order Qty</th>
                        <th className="py-2.5 px-3 text-right w-36">Est. Unit Cost (₨)</th>
                        <th className="py-2.5 px-3 text-right w-32">Est. Total (₨)</th>
                        <th className="py-2.5 px-3 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {items.map((item, index) => {
                        const lineTotal = (Number(item.orderedQuantity) || 0) * (Number(item.estimatedUnitPrice) || 0);
                        return (
                          <tr key={item.tempId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {index + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[11px] text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-bold">
                                  {item.internalId}
                                </span>
                                <span>{item.productName}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {item.brandName && <span>Brand: {item.brandName} • </span>}
                                {item.typeName && <span>Type: {item.typeName}</span>}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-md">
                                {item.stockInHand} {item.unit}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={item.orderedQuantity}
                                  onChange={(e) => handleUpdateItem(index, 'orderedQuantity', parseInt(e.target.value, 10) || 1)}
                                  className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-center text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                                />
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.estimatedUnitPrice || ''}
                                  onChange={(e) => handleUpdateItem(index, 'estimatedUnitPrice', parseFloat(e.target.value) || 0)}
                                  className="w-28 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-right text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-mono"
                                />
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono">
                              ₨ {lineTotal.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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

          {/* Section 3: Notes & Instructions */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Special Instructions / Transporter Notes</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Please deliver via Faisal Movers Cargo to Badami Bagh Lahore; notify upon dispatch..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all shadow-2xs"
            />
          </div>

          {/* Section 4: Live Financial Summary Breakdown */}
          <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Info className="w-5 h-5" />
              </div>
              <div className="text-xs text-amber-950">
                <p className="font-bold">Order Breakdown Notice:</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Total {items.length} items ({totalOrderedQty} units). Cargo cost of ₨ {estimatedCargoCost.toLocaleString()} is distributed (₨ {estimatedCargoPerUnit}/unit) for accurate landed cost estimates.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right shrink-0">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Subtotal</span>
                <span className="text-xs font-bold text-slate-700 font-mono">
                  ₨ {subtotalEstimatedCost.toLocaleString()}
                </span>
              </div>
              <div className="h-7 w-px bg-amber-200" />
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Est. Landed Total</span>
                <span className="text-base font-black text-amber-900 font-mono">
                  ₨ {totalEstimatedLandedCost.toLocaleString()}
                </span>
              </div>
            </div>
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
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-black rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer select-none"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{initialPO ? 'Update Purchase Order' : 'Issue Purchase Order (PO)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
