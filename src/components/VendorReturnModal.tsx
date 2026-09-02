import React, { useState, useEffect } from 'react';
import { 
  X, 
  RotateCcw, 
  Plus, 
  Trash2, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  DollarSign, 
  CreditCard, 
  PackageMinus, 
  Info,
  ArrowRight
} from 'lucide-react';
import { 
  Vendor, 
  VendorReturn, 
  VendorReturnItem, 
  VendorReturnReason, 
  VendorReturnSettlement, 
  Product, 
  Purchase 
} from '../types';
import { 
  getNextVendorReturnId, 
  calculateVendorBalance,
  calculatePurchaseItemReturnableQty,
  isMatchingPurchaseId
} from '../services/storage';

interface VendorReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (returnDoc: VendorReturn) => void;
  onSaveReturn?: (returnDoc: VendorReturn) => void;
  initialReturn?: VendorReturn | null;
  existingReturn?: VendorReturn | null;
  products: Product[];
  vendors: Vendor[];
  purchases?: Purchase[];
  vendorReturns?: VendorReturn[];
  vendorLedger?: any[];
}

const EMPTY_ARRAY: any[] = [];

export const VendorReturnModal: React.FC<VendorReturnModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveReturn,
  initialReturn,
  existingReturn,
  products = EMPTY_ARRAY,
  vendors = EMPTY_ARRAY,
  purchases = EMPTY_ARRAY,
  vendorReturns = EMPTY_ARRAY,
  vendorLedger = EMPTY_ARRAY,
}) => {
  const activeExisting = existingReturn || initialReturn;
  const handleSaveDoc = onSaveReturn || onSave || (() => {});
  const [returnId, setReturnId] = useState('');
  const [returnNumber, setReturnNumber] = useState('');
  const [debitNoteNumber, setDebitNoteNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [vendorName, setVendorName] = useState('');
  const [purchaseId, setPurchaseId] = useState('');
  const [showPurchasePicker, setShowPurchasePicker] = useState(false);

  const [items, setItems] = useState<VendorReturnItem[]>([
    {
      id: 'item-1',
      productId: '',
      internalId: '',
      productName: '',
      brandName: '',
      typeName: '',
      unit: 'Pcs',
      quantity: 1,
      unitCost: 0,
      totalAmount: 0,
      reason: 'Defective / Manufacturing Fault',
      notes: '',
    },
  ]);

  const [settlementMethod, setSettlementMethod] = useState<VendorReturnSettlement>('debit_note');
  const [settlementStatus, setSettlementStatus] = useState<'completed' | 'pending' | 'replacement_received'>('completed');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or Reset form
  useEffect(() => {
    if (!isOpen) return;

    if (activeExisting) {
      setReturnId(activeExisting.id);
      setReturnNumber(activeExisting.returnNumber);
      setDebitNoteNumber(activeExisting.debitNoteNumber || '');
      setDate(activeExisting.date ? activeExisting.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setSelectedVendorId(activeExisting.vendorId || '');
      setVendorName(activeExisting.vendorName || '');
      setPurchaseId(activeExisting.purchaseId || '');
      setItems(activeExisting.items && activeExisting.items.length > 0 ? activeExisting.items : []);
      setSettlementMethod(activeExisting.settlementMethod || 'debit_note');
      setSettlementStatus(activeExisting.settlementStatus || 'completed');
      setNotes(activeExisting.notes || '');
      setErrorMessage(null);
    } else {
      const next = getNextVendorReturnId(vendorReturns);
      setReturnId(next.id);
      setReturnNumber(next.returnNumber);
      setDebitNoteNumber(next.debitNoteNumber);
      setDate(new Date().toISOString().split('T')[0]);
      setSelectedVendorId('');
      setVendorName('');
      setPurchaseId('');
      setSettlementMethod('debit_note');
      setSettlementStatus('completed');
      setNotes('');
      setErrorMessage(null);

      // Default with one empty item
      setItems([
        {
          id: `item-${Date.now()}`,
          productId: '',
          internalId: '',
          productName: '',
          brandName: '',
          typeName: '',
          unit: 'Pcs',
          quantity: 1,
          unitCost: 0,
          totalAmount: 0,
          reason: 'Defective / Manufacturing Fault',
          notes: '',
        },
      ]);
    }
  }, [isOpen, activeExisting?.id]);

  if (!isOpen) return null;

  // Handle Vendor Selection
  const handleVendorChange = (vId: string) => {
    setSelectedVendorId(vId);
    const v = vendors.find(vend => vend.id === vId);
    if (v) {
      setVendorName(v.businessName);
    } else {
      setVendorName('');
    }
    setPurchaseId('');
  };

  // Find linked purchase bill if purchaseId is entered/selected
  const linkedPurchase = purchases.find(p => {
    if (!purchaseId) return false;
    return isMatchingPurchaseId(p, purchaseId);
  });

  // Filter purchases for selected vendor
  const vendorPurchases = purchases.filter(p => {
    if (selectedVendorId) {
      return p.vendorId === selectedVendorId;
    }
    if (vendorName) {
      return p.vendorName && p.vendorName.toLowerCase().includes(vendorName.toLowerCase());
    }
    return true;
  });

  // Import items from a specific purchase bill, enforcing remaining returnable quantities
  const handleImportPurchase = (purchase: Purchase) => {
    setPurchaseId(purchase.billNumber || purchase.id);
    if (purchase.vendorId && !selectedVendorId) {
      setSelectedVendorId(purchase.vendorId);
      const v = vendors.find(vend => vend.id === purchase.vendorId);
      if (v) setVendorName(v.businessName);
    } else if (purchase.vendorName && !vendorName) {
      setVendorName(purchase.vendorName);
    }

    if (purchase.items && purchase.items.length > 0) {
      const eligibleItems: VendorReturnItem[] = [];
      let totalSkippedFullyReturned = 0;

      purchase.items.forEach(pItem => {
        const { purchasedQty, alreadyReturnedQty, remainingQty } = calculatePurchaseItemReturnableQty(
          purchase,
          pItem,
          vendorReturns,
          activeExisting?.id
        );

        if (remainingQty > 0) {
          eligibleItems.push({
            id: `vritem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            productId: pItem.productId,
            internalId: pItem.internalId,
            productName: pItem.productName,
            brandName: pItem.brandName || '',
            typeName: pItem.typeName || '',
            unit: pItem.unit || 'Pcs',
            quantity: remainingQty,
            unitCost: pItem.unitPrice,
            totalAmount: remainingQty * pItem.unitPrice,
            reason: 'Defective / Manufacturing Fault',
            notes: `Returned from Bill #${purchase.billNumber || purchase.id} (Eligible: ${remainingQty}/${purchasedQty})`,
          });
        } else if (purchasedQty > 0) {
          totalSkippedFullyReturned++;
        }
      });

      if (eligibleItems.length > 0) {
        setItems(eligibleItems);
        setErrorMessage(null);
      } else {
        setErrorMessage(`All items from purchase bill #${purchase.billNumber || purchase.id} have already been fully returned in prior debit notes (0 items eligible).`);
      }
    }
    setShowPurchasePicker(false);
  };

  // Product Selection in Item Row
  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const currentItem = items[index];
    const defaultCost = prod.costPrice || 0;

    const updated = [...items];
    updated[index] = {
      ...currentItem,
      productId: prod.id,
      internalId: prod.internalId || '',
      productName: prod.name,
      brandName: prod.brandName || '',
      typeName: prod.typeName || '',
      unit: prod.unit || 'Pcs',
      unitCost: defaultCost,
      totalAmount: currentItem.quantity * defaultCost,
    };
    setItems(updated);
  };

  // Item Field Change
  const handleItemChange = (index: number, field: keyof VendorReturnItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    if (field === 'quantity' || field === 'unitCost') {
      const qty = field === 'quantity' ? Number(value) || 0 : item.quantity;
      const cost = field === 'unitCost' ? Number(value) || 0 : item.unitCost;
      item.totalAmount = Math.max(0, qty * cost);
    }

    updated[index] = item;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        productId: '',
        internalId: '',
        productName: '',
        brandName: '',
        typeName: '',
        unit: 'Pcs',
        quantity: 1,
        unitCost: 0,
        totalAmount: 0,
        reason: 'Defective / Manufacturing Fault',
        notes: '',
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) {
      setErrorMessage('At least one item must be included in the return.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Financial totals
  const totalAmount = items.reduce((sum, it) => sum + (Number(it.totalAmount) || 0), 0);

  // Current vendor payable balance preview
  const currentVendorBalance = selectedVendorId
    ? calculateVendorBalance(selectedVendorId, vendors, purchases, [], vendorLedger)
    : 0;

  const afterReturnVendorBalance = settlementMethod === 'debit_note'
    ? currentVendorBalance - totalAmount
    : currentVendorBalance;

  // Validation and Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const finalVendor = vendors.find(v => v.id === selectedVendorId);
    const finalVendorName = vendorName.trim() || finalVendor?.businessName;

    if (!selectedVendorId || !finalVendorName) {
      setErrorMessage('Please select a supplier / vendor.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Please add at least one item to return to vendor.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productId && !it.productName.trim()) {
        setErrorMessage(`Item #${i + 1} has no product selected.`);
        return;
      }
      if (Number(it.quantity) <= 0) {
        setErrorMessage(`Item #${i + 1} (${it.productName || 'Product'}) must have a quantity greater than 0.`);
        return;
      }
    }

    // Strict Double-Return & Purchased Quantity Limit Check if linked to a purchase bill
    if (linkedPurchase) {
      // Group requested quantities by product/item key
      const itemGroupQtyMap = new Map<string, number>();
      for (const it of items) {
        const key = it.productId || it.internalId || it.productName.trim().toLowerCase();
        itemGroupQtyMap.set(key, (itemGroupQtyMap.get(key) || 0) + (Number(it.quantity) || 0));
      }

      // Check each unique item against purchased and previously returned quantities
      for (const it of items) {
        const key = it.productId || it.internalId || it.productName.trim().toLowerCase();
        const totalRequested = itemGroupQtyMap.get(key) || (Number(it.quantity) || 0);

        const { purchasedQty, alreadyReturnedQty, remainingQty } = calculatePurchaseItemReturnableQty(
          linkedPurchase,
          it,
          vendorReturns,
          activeExisting?.id
        );

        if (purchasedQty > 0) {
          if (totalRequested > remainingQty) {
            setErrorMessage(
              `Return limit exceeded: From purchase bill #${linkedPurchase.billNumber || linkedPurchase.id}, item '${it.productName || it.internalId}' was purchased in quantity of ${purchasedQty}. ${alreadyReturnedQty} unit(s) were already returned in prior debit notes, leaving only ${remainingQty} unit(s) eligible. You are trying to return ${totalRequested} unit(s).`
            );
            return;
          }
        }
      }
    }

    const returnPayload: VendorReturn = {
      id: returnId || `VRTN-${Date.now()}`,
      returnNumber: returnNumber || `VR-${new Date().getFullYear()}-001`,
      debitNoteNumber: debitNoteNumber || `DN-${Date.now().toString().slice(-3)}`,
      purchaseId: purchaseId.trim() || undefined,
      vendorId: selectedVendorId,
      vendorName: finalVendorName,
      date: new Date(date).toISOString(),
      items: items.map(it => ({
        ...it,
        quantity: Number(it.quantity) || 1,
        unitCost: Number(it.unitCost) || 0,
        totalAmount: Number(it.totalAmount) || (Number(it.quantity) * Number(it.unitCost)),
      })),
      subtotal: totalAmount,
      totalAmount,
      settlementMethod,
      settlementStatus,
      notes: notes.trim() || undefined,
      createdAt: activeExisting?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    handleSaveDoc(returnPayload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 flex items-center justify-center font-black shadow-inner">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">
                  {activeExisting ? 'Edit Vendor Purchase Return' : 'Record Return to Vendor (Debit Note)'}
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-bold bg-white/20 rounded-md border border-white/20">
                  {returnNumber}
                </span>
                {debitNoteNumber && (
                  <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-amber-500/30 text-amber-100 rounded-md border border-amber-400/30">
                    {debitNoteNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-red-100 font-medium mt-0.5">
                Outward Purchase Return • Debit Note Adjustment & Stock Deduction
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Vendor & Purchase Bill Reference */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-red-600" />
                <span>Supplier & Purchase Reference</span>
              </h3>
              
              <button
                type="button"
                onClick={() => setShowPurchasePicker(!showPurchasePicker)}
                className="px-2.5 py-1 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{purchaseId ? `Bill: ${purchaseId}` : 'Load from Purchase Bill'}</span>
              </button>
            </div>

            {/* Purchase Quick Picker Modal / Dropdown */}
            {showPurchasePicker && (
              <div className="p-3 bg-white rounded-xl border border-red-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Select Purchase Bill to auto-load purchased items and cost rates:</span>
                  <button
                    type="button"
                    onClick={() => setShowPurchasePicker(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
                  {vendorPurchases.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">
                      No purchase bills found for this supplier.
                    </div>
                  ) : (
                    vendorPurchases.slice(0, 10).map(pur => {
                      const totalPurchased = (pur.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
                      const totalRemaining = (pur.items || []).reduce((sum, it) => {
                        const { remainingQty } = calculatePurchaseItemReturnableQty(pur, it, vendorReturns, activeExisting?.id);
                        return sum + remainingQty;
                      }, 0);
                      const alreadyReturned = totalPurchased - totalRemaining;
                      const isFullyReturned = totalPurchased > 0 && totalRemaining === 0;

                      return (
                        <div
                          key={pur.id}
                          onClick={() => handleImportPurchase(pur)}
                          className={`p-2.5 text-xs flex items-center justify-between transition-colors ${
                            isFullyReturned 
                              ? 'bg-slate-50 opacity-60 cursor-not-allowed hover:bg-slate-100' 
                              : 'hover:bg-red-50/60 cursor-pointer'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-red-700">Bill #{pur.billNumber || pur.id}</span>
                              <span className="text-slate-500 text-[11px]">
                                {new Date(pur.date).toLocaleDateString()} • {pur.vendorName}
                              </span>
                              {isFullyReturned ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                                  Fully Returned (0 Left)
                                </span>
                              ) : alreadyReturned > 0 ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  Partially Returned ({totalRemaining}/{totalPurchased} left)
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  {totalPurchased} units eligible
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5">
                              {pur.items?.map(it => `${it.productName} (x${it.quantity} @ Rs.${it.unitPrice})`).join(', ')}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-black text-slate-900">
                              Rs. {pur.totalAmount?.toLocaleString()}
                            </span>
                            <div className="text-[10px] text-red-600 font-bold">
                              {isFullyReturned ? '0 returnable' : 'Click to Auto-Fill'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Vendor Selector */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Vendor / Supplier *
                </label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => handleVendorChange(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose Vendor / Supplier --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.businessName} {v.city ? `(${v.city})` : ''} {v.phone ? `• ${v.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Return Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Return Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                  required
                />
              </div>

              {/* Debit Note # */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Debit Note Number
                </label>
                <input
                  type="text"
                  value={debitNoteNumber}
                  onChange={(e) => setDebitNoteNumber(e.target.value)}
                  placeholder="e.g. DN-101"
                  className="w-full h-10 px-3 text-xs font-bold font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none uppercase"
                />
              </div>

              {/* Original Purchase Bill ID (Optional) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Original Purchase Bill # (Ref)
                </label>
                <input
                  type="text"
                  value={purchaseId}
                  onChange={(e) => setPurchaseId(e.target.value)}
                  placeholder="e.g. PUR-2001 or SF-9842"
                  className="w-full h-10 px-3 text-xs font-medium bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none uppercase"
                />
              </div>
            </div>

            {/* Current Vendor Payable Balance Insight */}
            {selectedVendorId && (
              <div className="mt-2 p-2.5 bg-red-50/70 border border-red-200 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="text-slate-700 font-medium">
                    Current Amount We Owe {vendorName || 'Vendor'}:
                  </span>
                </div>
                <span className="font-black text-red-700">
                  Rs. {currentVendorBalance.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Section 2: Items Shipped Back to Vendor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <PackageMinus className="w-4 h-4 text-red-600" />
                <span>Filters / Parts Being Returned to Supplier</span>
              </h3>
              
              <button
                type="button"
                onClick={addItemRow}
                className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const matchedProd = products.find(p => p.id === item.productId);
                const eligibility = linkedPurchase
                  ? calculatePurchaseItemReturnableQty(linkedPurchase, item, vendorReturns, activeExisting?.id)
                  : null;

                const hasPurchaseMatch = !!eligibility && eligibility.purchasedQty > 0;
                const isOverLimit = hasPurchaseMatch && Number(item.quantity) > eligibility.remainingQty;
                const isZeroRemaining = hasPurchaseMatch && eligibility.remainingQty === 0;

                return (
                  <div 
                    key={item.id || index}
                    className={`p-3.5 bg-white rounded-xl border shadow-xs space-y-3 transition-colors ${
                      isOverLimit 
                        ? 'border-red-300 ring-1 ring-red-300 bg-red-50/20' 
                        : isZeroRemaining 
                        ? 'border-amber-300 bg-amber-50/20' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {item.productName || 'Select Product / Part'}
                        </span>
                        {item.internalId && (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-600 rounded">
                            {item.internalId}
                          </span>
                        )}
                        {matchedProd && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            (Current Stock: {matchedProd.stockQuantity})
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        disabled={items.length <= 1}
                        className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Purchase Item Return Limits Banner */}
                    {hasPurchaseMatch && (
                      <div className={`p-2 rounded-lg text-[11px] font-medium flex items-center justify-between gap-2 border ${
                        isZeroRemaining
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : isOverLimit
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          <span>Bill <strong>#{linkedPurchase.billNumber || linkedPurchase.id}</strong>: Purchased <strong>{eligibility.purchasedQty}</strong></span>
                          <span>•</span>
                          <span>Already Returned: <strong>{eligibility.alreadyReturnedQty}</strong></span>
                          <span>•</span>
                          <span>Max Returnable: <strong className="underline">{eligibility.remainingQty} {item.unit || 'Pcs'}</strong></span>
                        </div>
                        {isZeroRemaining ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-200 text-red-900 shrink-0">
                            Fully Returned (0 Left)
                          </span>
                        ) : isOverLimit ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white shrink-0">
                            Exceeds Limit by {Number(item.quantity) - eligibility.remainingQty}!
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                            ✓ Eligible
                          </span>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      {/* Product Selector */}
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Product / Part *
                        </label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleProductSelect(index, e.target.value)}
                          className="w-full h-9 px-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                        >
                          <option value="">-- Choose from Inventory --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} [{p.internalId}] • {p.brandName} • (Cost: Rs. {p.costPrice})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Qty ({item.unit || 'Pcs'}) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={hasPurchaseMatch ? eligibility.remainingQty : undefined}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className={`w-full h-9 px-2.5 text-xs font-bold border rounded-lg focus:ring-2 focus:outline-none ${
                            isOverLimit 
                              ? 'bg-red-50 text-red-700 border-red-400 focus:ring-red-500' 
                              : 'bg-slate-50 border-slate-200 focus:ring-red-500'
                          }`}
                          required
                        />
                      </div>

                      {/* Unit Cost (PKR) */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Purchase Rate (Rs.) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.unitCost}
                          onChange={(e) => handleItemChange(index, 'unitCost', e.target.value)}
                          className="w-full h-9 px-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                          required
                        />
                      </div>

                      {/* Total Amount */}
                      <div className="sm:col-span-3 flex flex-col justify-end">
                        <span className="text-[10px] font-bold text-slate-500 mb-1">Item Total</span>
                        <div className="h-9 px-2.5 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between text-xs font-black text-slate-900">
                          <span>Rs.</span>
                          <span>{item.totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Reason & Defect Note */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-100">
                      {/* Reason */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Reason for Vendor Return *
                        </label>
                        <select
                          value={item.reason}
                          onChange={(e) => handleItemChange(index, 'reason', e.target.value as VendorReturnReason)}
                          className="w-full h-8 px-2 text-[11px] font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        >
                          <option value="Defective / Manufacturing Fault">Defective / Manufacturing Fault</option>
                          <option value="Wrong Item / Spec Mismatch">Wrong Item / Spec Mismatch</option>
                          <option value="Damaged During Delivery">Damaged During Delivery</option>
                          <option value="Excess / Unordered Stock">Excess / Unordered Stock</option>
                          <option value="Expired / Old Manufacturing Date">Old Manufacturing Date</option>
                          <option value="Warranty Claim / Replacement Request">Warranty Claim / Replacement</option>
                          <option value="Price Dispute">Price Dispute</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Item Notes */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Defect Details / Manufacturer Batch Note
                        </label>
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                          placeholder="e.g. Thread defect, dented casing, wrong seal diameter"
                          className="w-full h-8 px-2 text-[11px] font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Settlement Method & Vendor Ledger Adjustment */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-red-600" />
              <span>Debit Note Settlement & Vendor Ledger</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Settlement Method */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Settlement Method *
                </label>
                <select
                  value={settlementMethod}
                  onChange={(e) => setSettlementMethod(e.target.value as VendorReturnSettlement)}
                  className="w-full h-10 px-3 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="debit_note">💳 Debit Note (Deduct from Vendor Payable Balance)</option>
                  <option value="cash_refund">💵 Cash Refund Received from Supplier</option>
                  <option value="bank_refund">🏦 Bank Transfer Received from Supplier</option>
                  <option value="replacement_pending">⏳ Supplier Replacement Pending (Warranty Claim)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  {settlementMethod === 'debit_note' && 'Directly debits the vendor ledger, reducing the amount we owe this supplier.'}
                  {settlementMethod === 'cash_refund' && 'Supplier paid cash back for returned defective inventory.'}
                  {settlementMethod === 'bank_refund' && 'Funds received in company bank account from supplier.'}
                  {settlementMethod === 'replacement_pending' && 'Supplier will send replacement units in the next shipment.'}
                </p>
              </div>

              {/* Settlement Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Claim Status
                </label>
                <select
                  value={settlementStatus}
                  onChange={(e) => setSettlementStatus(e.target.value as any)}
                  className="w-full h-10 px-3 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="completed">Completed / Settled</option>
                  <option value="pending">Pending Supplier Confirmation</option>
                  <option value="replacement_received">Replacement Stock Received</option>
                </select>
              </div>
            </div>

            {/* General Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Return Memo / Supplier Dispatch Remarks
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Details regarding transporter/bilty number, supplier rep contact, or warranty claim RMA number..."
                rows={2}
                className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Summary Calculation Card */}
            <div className="bg-white p-4 rounded-xl border border-red-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-sm font-black text-slate-900">
                <span className="text-red-700">Total Debit Note Amount:</span>
                <span className="text-lg text-red-700">Rs. {totalAmount.toLocaleString()}</span>
              </div>

              {/* Vendor Balance Impact Indicator */}
              {selectedVendorId && settlementMethod === 'debit_note' && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs bg-red-50/50 p-2 rounded-lg">
                  <span className="text-slate-600">Vendor Payable Balance Impact:</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-slate-500 line-through">Rs. {currentVendorBalance.toLocaleString()}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-emerald-700">Rs. {afterReturnVendorBalance.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{initialReturn ? 'Update Vendor Return' : 'Record Return & Adjust Inventory'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
