import React, { useState, useEffect } from 'react';
import { 
  X, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Search, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  DollarSign, 
  CreditCard, 
  PackageCheck, 
  Info,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  Customer, 
  CustomerReturn, 
  CustomerReturnItem, 
  CustomerReturnReason, 
  CustomerRefundMethod, 
  ItemReturnCondition, 
  Product, 
  Sale 
} from '../types';
import { 
  getNextCustomerReturnId, 
  calculateCustomerNetBalance,
  calculateSaleItemReturnableQty,
  isMatchingSaleId
} from '../services/storage';

interface CustomerReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (returnDoc: CustomerReturn) => void;
  onSaveReturn?: (returnDoc: CustomerReturn) => void;
  initialReturn?: CustomerReturn | null;
  existingReturn?: CustomerReturn | null;
  initialSale?: Sale | null;
  products: Product[];
  customers: Customer[];
  sales?: Sale[];
  customerReturns?: CustomerReturn[];
  customerLedger?: any[];
}

const EMPTY_ARRAY: any[] = [];

export const CustomerReturnModal: React.FC<CustomerReturnModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveReturn,
  initialReturn,
  existingReturn,
  initialSale,
  products = EMPTY_ARRAY,
  customers = EMPTY_ARRAY,
  sales = EMPTY_ARRAY,
  customerReturns = EMPTY_ARRAY,
  customerLedger = EMPTY_ARRAY,
}) => {
  const activeExisting = existingReturn || initialReturn;
  const handleSaveDoc = onSaveReturn || onSave || (() => {});
  const [returnId, setReturnId] = useState('');
  const [returnNumber, setReturnNumber] = useState('');
  const [creditNoteNumber, setCreditNoteNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [saleId, setSaleId] = useState('');
  const [showSalePicker, setShowSalePicker] = useState(false);

  const [items, setItems] = useState<CustomerReturnItem[]>([
    {
      id: 'item-1',
      productId: '',
      internalId: '',
      productName: '',
      brandName: '',
      typeName: '',
      unit: 'Pcs',
      quantity: 1,
      returnRate: 0,
      totalAmount: 0,
      condition: 'restock',
      reason: 'Defective / Quality Issue',
      notes: '',
    },
  ]);

  const [deductionFee, setDeductionFee] = useState<number>(0);
  const [refundMethod, setRefundMethod] = useState<CustomerRefundMethod>('khata_credit');
  const [refundStatus, setRefundStatus] = useState<'completed' | 'pending'>('completed');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or Reset form
  useEffect(() => {
    if (!isOpen) return;

    if (activeExisting) {
      setReturnId(activeExisting.id);
      setReturnNumber(activeExisting.returnNumber);
      setCreditNoteNumber(activeExisting.creditNoteNumber || '');
      setDate(activeExisting.date ? activeExisting.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setSelectedCustomerId(activeExisting.customerId || '');
      setCustomerName(activeExisting.customerName || '');
      setCustomerPhone(activeExisting.customerPhone || '');
      setIsWalkIn(!activeExisting.customerId);
      setSaleId(activeExisting.saleId || '');
      setItems(activeExisting.items && activeExisting.items.length > 0 ? activeExisting.items : []);
      setDeductionFee(activeExisting.deductionOrRestockFee || 0);
      setRefundMethod(activeExisting.refundMethod || 'khata_credit');
      setRefundStatus(activeExisting.refundStatus === 'pending' ? 'pending' : 'completed');
      setNotes(activeExisting.notes || '');
      setErrorMessage(null);
    } else {
      const next = getNextCustomerReturnId(customerReturns);
      setReturnId(next.id);
      setReturnNumber(next.returnNumber);
      setCreditNoteNumber(next.creditNoteNumber);
      setDate(new Date().toISOString().split('T')[0]);
      setDeductionFee(0);
      setNotes('');
      setErrorMessage(null);

      if (initialSale) {
        setSaleId(initialSale.id);
        if (initialSale.customerId) {
          setSelectedCustomerId(initialSale.customerId);
          setCustomerName(initialSale.customerName || '');
          setCustomerPhone(initialSale.customerPhone || '');
          setIsWalkIn(false);
          setRefundMethod('khata_credit');
        } else {
          setSelectedCustomerId('walkin');
          setCustomerName(initialSale.customerName || 'Walk-in Counter Customer');
          setCustomerPhone(initialSale.customerPhone || '');
          setIsWalkIn(true);
          setRefundMethod('cash_refund');
        }
        setRefundStatus('completed');

        // Extract eligible items
        const eligibleItems: CustomerReturnItem[] = [];
        (initialSale.items || []).forEach(sItem => {
          const { soldQty, remainingQty } = calculateSaleItemReturnableQty(
            initialSale,
            sItem,
            customerReturns
          );
          if (remainingQty > 0) {
            eligibleItems.push({
              id: `critem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              productId: sItem.productId,
              internalId: sItem.internalId,
              productName: sItem.productName,
              brandName: sItem.brandName || '',
              typeName: sItem.typeName || '',
              unit: sItem.unit || 'Pcs',
              quantity: remainingQty,
              returnRate: sItem.unitPrice,
              totalAmount: remainingQty * sItem.unitPrice,
              condition: 'restock',
              reason: 'Wrong Filter / Item Supplied',
              notes: `Returned from invoice ${initialSale.id} (Eligible: ${remainingQty}/${soldQty})`,
            });
          }
        });

        if (eligibleItems.length > 0) {
          setItems(eligibleItems);
        } else {
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
              returnRate: 0,
              totalAmount: 0,
              condition: 'restock',
              reason: 'Defective / Quality Issue',
              notes: '',
            },
          ]);
          setErrorMessage(`All items from invoice ${initialSale.id} have already been fully returned.`);
        }
      } else {
        setSelectedCustomerId('');
        setCustomerName('');
        setCustomerPhone('');
        setIsWalkIn(false);
        setSaleId('');
        setRefundMethod('khata_credit');
        setRefundStatus('completed');

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
            returnRate: 0,
            totalAmount: 0,
            condition: 'restock',
            reason: 'Defective / Quality Issue',
            notes: '',
          },
        ]);
      }
    }
  }, [isOpen, activeExisting?.id, initialSale?.id]);

  if (!isOpen) return null;

  // Handle Customer Selection
  const handleCustomerChange = (cId: string) => {
    setSelectedCustomerId(cId);
    if (cId === 'walkin') {
      setIsWalkIn(true);
      setCustomerName('Walk-in Counter Customer');
      setCustomerPhone('');
      setRefundMethod('cash_refund');
    } else {
      const cust = customers.find(c => c.id === cId);
      if (cust) {
        setIsWalkIn(false);
        setCustomerName(cust.name);
        setCustomerPhone(cust.phone || '');
        setRefundMethod('khata_credit');
      }
    }
    setSaleId('');
  };

  // Find linked sale if saleId is entered/selected
  const linkedSale = sales.find(s => {
    if (!saleId) return false;
    return isMatchingSaleId(s, saleId);
  });

  // Filter sales for selected customer
  const customerSales = sales.filter(s => {
    if (selectedCustomerId && selectedCustomerId !== 'walkin') {
      return s.customerId === selectedCustomerId;
    }
    if (customerName) {
      return s.customerName && s.customerName.toLowerCase().includes(customerName.toLowerCase());
    }
    return true;
  });

  // Import items from a specific sale invoice, enforcing remaining returnable quantities
  const handleImportSale = (sale: Sale) => {
    setSaleId(sale.id);
    if (sale.customerId && !selectedCustomerId) {
      setSelectedCustomerId(sale.customerId);
      const c = customers.find(cust => cust.id === sale.customerId);
      if (c) {
        setCustomerName(c.name);
        setCustomerPhone(c.phone || '');
      }
    } else if (sale.customerName && !customerName) {
      setCustomerName(sale.customerName);
      setCustomerPhone(sale.customerPhone || '');
    }

    if (sale.items && sale.items.length > 0) {
      const eligibleItems: CustomerReturnItem[] = [];
      let totalSkippedFullyReturned = 0;

      sale.items.forEach(sItem => {
        const { soldQty, alreadyReturnedQty, remainingQty } = calculateSaleItemReturnableQty(
          sale,
          sItem,
          customerReturns,
          activeExisting?.id
        );

        if (remainingQty > 0) {
          eligibleItems.push({
            id: `critem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            productId: sItem.productId,
            internalId: sItem.internalId,
            productName: sItem.productName,
            brandName: sItem.brandName || '',
            typeName: sItem.typeName || '',
            unit: sItem.unit || 'Pcs',
            quantity: remainingQty,
            returnRate: sItem.unitPrice,
            totalAmount: remainingQty * sItem.unitPrice,
            condition: 'restock',
            reason: 'Wrong Filter / Item Supplied',
            notes: `Returned from invoice ${sale.id} (Eligible: ${remainingQty}/${soldQty})`,
          });
        } else if (soldQty > 0) {
          totalSkippedFullyReturned++;
        }
      });

      if (eligibleItems.length > 0) {
        setItems(eligibleItems);
        setErrorMessage(null);
      } else {
        setErrorMessage(`All items from invoice ${sale.id} have already been fully returned in prior credit notes (0 items eligible).`);
      }
    }
    setShowSalePicker(false);
  };

  // Product Selection in Item Row
  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const currentItem = items[index];
    const defaultRate = prod.sellingPrices?.retail || prod.sellingPrices?.wholesale || prod.costPrice || 0;

    const updated = [...items];
    updated[index] = {
      ...currentItem,
      productId: prod.id,
      internalId: prod.internalId || '',
      productName: prod.name,
      brandName: prod.brandName || '',
      typeName: prod.typeName || '',
      unit: prod.unit || 'Pcs',
      returnRate: defaultRate,
      totalAmount: currentItem.quantity * defaultRate,
    };
    setItems(updated);
  };

  // Item Field Change
  const handleItemChange = (index: number, field: keyof CustomerReturnItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    if (field === 'quantity' || field === 'returnRate') {
      const qty = field === 'quantity' ? Number(value) || 0 : item.quantity;
      const rate = field === 'returnRate' ? Number(value) || 0 : item.returnRate;
      item.totalAmount = Math.max(0, qty * rate);
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
        returnRate: 0,
        totalAmount: 0,
        condition: 'restock',
        reason: 'Defective / Quality Issue',
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
  const subtotal = items.reduce((sum, it) => sum + (Number(it.totalAmount) || 0), 0);
  const totalRefundAmount = Math.max(0, subtotal - (Number(deductionFee) || 0));

  // Current customer khata balance preview
  const selectedCust = customers.find(c => c.id === selectedCustomerId);
  const currentKhataBalance = selectedCust
    ? calculateCustomerNetBalance(selectedCust.id, selectedCust.openingBalance || 0, sales, customerLedger)
    : 0;

  const afterReturnKhataBalance = refundMethod === 'khata_credit'
    ? currentKhataBalance - totalRefundAmount
    : currentKhataBalance;

  // Validation and Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const finalCustomerName = customerName.trim() || (isWalkIn ? 'Walk-in Counter Customer' : '');
    if (!finalCustomerName) {
      setErrorMessage('Please select a customer or provide a customer name.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Please add at least one item to return.');
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

    // Strict Double-Return & Sold Quantity Limit Check if linked to an invoice
    if (linkedSale) {
      // Group requested quantities by product/item key
      const itemGroupQtyMap = new Map<string, number>();
      for (const it of items) {
        const key = it.productId || it.internalId || it.productName.trim().toLowerCase();
        itemGroupQtyMap.set(key, (itemGroupQtyMap.get(key) || 0) + (Number(it.quantity) || 0));
      }

      // Check each unique item against sold and previously returned quantities
      for (const it of items) {
        const key = it.productId || it.internalId || it.productName.trim().toLowerCase();
        const totalRequested = itemGroupQtyMap.get(key) || (Number(it.quantity) || 0);

        const { soldQty, alreadyReturnedQty, remainingQty } = calculateSaleItemReturnableQty(
          linkedSale,
          it,
          customerReturns,
          activeExisting?.id
        );

        if (soldQty > 0) {
          if (totalRequested > remainingQty) {
            setErrorMessage(
              `Return limit exceeded: From invoice ${linkedSale.id}, item '${it.productName || it.internalId}' was sold in quantity of ${soldQty}. ${alreadyReturnedQty} unit(s) were already returned in prior credit notes, leaving only ${remainingQty} unit(s) eligible. You are trying to return ${totalRequested} unit(s).`
            );
            return;
          }
        }
      }
    }

    const returnPayload: CustomerReturn = {
      id: returnId || `CRTN-${Date.now()}`,
      returnNumber: returnNumber || `CR-${new Date().getFullYear()}-001`,
      creditNoteNumber: creditNoteNumber || `CN-${Date.now().toString().slice(-4)}`,
      saleId: saleId.trim() || undefined,
      customerId: isWalkIn ? undefined : (selectedCustomerId || undefined),
      customerName: finalCustomerName,
      customerPhone: customerPhone.trim() || undefined,
      date: new Date(date).toISOString(),
      items: items.map(it => ({
        ...it,
        quantity: Number(it.quantity) || 1,
        returnRate: Number(it.returnRate) || 0,
        totalAmount: Number(it.totalAmount) || (Number(it.quantity) * Number(it.returnRate)),
      })),
      subtotal,
      deductionOrRestockFee: Number(deductionFee) || 0,
      totalRefundAmount,
      refundMethod,
      refundStatus,
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
                  {activeExisting ? 'Edit Customer Return' : 'Record Customer Sales Return'}
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-bold bg-white/20 rounded-md border border-white/20">
                  {returnNumber}
                </span>
              </div>
              <p className="text-xs text-red-100 font-medium mt-0.5">
                Inward Sales Return • Credit Note & Inventory Restock Management
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

          {/* Section 1: Customer & Invoice Reference */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <User className="w-4 h-4 text-red-600" />
                <span>Customer & Reference Information</span>
              </h3>
              
              <button
                type="button"
                onClick={() => setShowSalePicker(!showSalePicker)}
                className="px-2.5 py-1 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{saleId ? `Linked: ${saleId}` : 'Load from Sale Invoice'}</span>
              </button>
            </div>

            {/* Invoice Quick Selection Picker Modal / Dropdown */}
            {showSalePicker && (
              <div className="p-3 bg-white rounded-xl border border-red-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Select Original Sale Invoice to auto-load returned items:</span>
                  <button
                    type="button"
                    onClick={() => setShowSalePicker(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
                  {customerSales.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">
                      No invoices found for this customer.
                    </div>
                  ) : (
                    customerSales.slice(0, 10).map(sale => {
                      const totalSold = (sale.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
                      const totalRemaining = (sale.items || []).reduce((sum, it) => {
                        const { remainingQty } = calculateSaleItemReturnableQty(sale, it, customerReturns, activeExisting?.id);
                        return sum + remainingQty;
                      }, 0);
                      const alreadyReturned = totalSold - totalRemaining;
                      const isFullyReturned = totalSold > 0 && totalRemaining === 0;

                      return (
                        <div
                          key={sale.id}
                          onClick={() => handleImportSale(sale)}
                          className={`p-2.5 text-xs flex items-center justify-between transition-colors ${
                            isFullyReturned 
                              ? 'bg-slate-50 opacity-60 cursor-not-allowed hover:bg-slate-100' 
                              : 'hover:bg-red-50/60 cursor-pointer'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-red-700">{sale.id}</span>
                              <span className="text-slate-500 text-[11px]">
                                {new Date(sale.date).toLocaleDateString()}
                              </span>
                              {isFullyReturned ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                                  Fully Returned (0 Left)
                                </span>
                              ) : alreadyReturned > 0 ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  Partially Returned ({totalRemaining}/{totalSold} left)
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  {totalSold} units eligible
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5">
                              {sale.items?.map(it => `${it.productName} (x${it.quantity})`).join(', ')}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-black text-slate-900">
                              Rs. {sale.totalAmount?.toLocaleString()}
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
              {/* Customer Selector */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Customer / Account *
                </label>
                <select
                  value={isWalkIn ? 'walkin' : selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="">-- Select Registered Customer / Company --</option>
                  <option value="walkin">⚡ Walk-in Counter Customer (Cash/Non-Account)</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.city ? `(${c.city})` : ''} {c.phone ? `• ${c.phone}` : ''}
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

              {/* Customer Name Override / Walk-in Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ahmed Works or Counter Buyer"
                  className="w-full h-10 px-3 text-xs font-medium bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              {/* Customer Phone */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 0300-1234567"
                  className="w-full h-10 px-3 text-xs font-medium bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              {/* Original Invoice ID (Optional) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Original Invoice # (Ref)
                </label>
                <input
                  type="text"
                  value={saleId}
                  onChange={(e) => setSaleId(e.target.value)}
                  placeholder="e.g. INV-1001"
                  className="w-full h-10 px-3 text-xs font-medium bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none uppercase"
                />
              </div>
            </div>

            {/* Current Khata Balance Insight */}
            {selectedCustomerId && selectedCustomerId !== 'walkin' && (
              <div className="mt-2 p-2.5 bg-red-50/70 border border-red-200 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="text-slate-700 font-medium">
                    Current Customer Khata Receivable:
                  </span>
                </div>
                <span className="font-black text-red-700">
                  Rs. {currentKhataBalance.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Section 2: Items Returned */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-red-600" />
                <span>Returned Filter / Parts List</span>
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
                const eligibility = linkedSale
                  ? calculateSaleItemReturnableQty(linkedSale, item, customerReturns, activeExisting?.id)
                  : null;

                const hasSaleMatch = !!eligibility && eligibility.soldQty > 0;
                const isOverLimit = hasSaleMatch && Number(item.quantity) > eligibility.remainingQty;
                const isZeroRemaining = hasSaleMatch && eligibility.remainingQty === 0;

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

                    {/* Invoice Item Return Limits Banner */}
                    {hasSaleMatch && (
                      <div className={`p-2 rounded-lg text-[11px] font-medium flex items-center justify-between gap-2 border ${
                        isZeroRemaining
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : isOverLimit
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          <span>Invoice <strong>{linkedSale.id}</strong>: Sold <strong>{eligibility.soldQty}</strong></span>
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
                              {p.name} [{p.internalId}] • {p.brandName} • (Stock: {p.stockQuantity})
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
                          max={hasSaleMatch ? eligibility.remainingQty : undefined}
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

                      {/* Return Rate (PKR) */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Return Rate (Rs.) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.returnRate}
                          onChange={(e) => handleItemChange(index, 'returnRate', e.target.value)}
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

                    {/* Condition & Reason Selector */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-slate-100">
                      {/* Condition (Restock vs Damaged) */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Inventory Action *
                        </label>
                        <select
                          value={item.condition}
                          onChange={(e) => handleItemChange(index, 'condition', e.target.value as ItemReturnCondition)}
                          className={`w-full h-8 px-2 text-[11px] font-bold rounded-lg border focus:outline-none ${
                            item.condition === 'restock'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          <option value="restock">🟢 Restock (Add to Sellable Stock)</option>
                          <option value="damaged">🔴 Damaged / Defective (Do not restock)</option>
                          <option value="scrap">⚪ Scrap / Written-Off</option>
                        </select>
                      </div>

                      {/* Return Reason */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Reason for Return
                        </label>
                        <select
                          value={item.reason}
                          onChange={(e) => handleItemChange(index, 'reason', e.target.value as CustomerReturnReason)}
                          className="w-full h-8 px-2 text-[11px] font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        >
                          <option value="Defective / Quality Issue">Defective / Quality Issue</option>
                          <option value="Wrong Filter / Item Supplied">Wrong Filter / Item Supplied</option>
                          <option value="Customer Changed Mind">Customer Changed Mind</option>
                          <option value="Excess Quantity Ordered">Excess Quantity Ordered</option>
                          <option value="Damaged in Transit">Damaged in Transit</option>
                          <option value="Machine Specifications Changed">Machine Specs Changed</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Item Notes */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Item Note / Packing Condition
                        </label>
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                          placeholder="e.g. In original carton, sealed"
                          className="w-full h-8 px-2 text-[11px] font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Financial Settlement & Refund Method */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-red-600" />
              <span>Financial Refund & Ledger Settlement</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Refund Method */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Settlement / Refund Method *
                </label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value as CustomerRefundMethod)}
                  className="w-full h-10 px-3 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="khata_credit">💳 Credit Note (Deduct from Customer Khata)</option>
                  <option value="cash_refund">💵 Cash Refund (Paid at Counter)</option>
                  <option value="bank_refund">🏦 Bank Transfer Refund</option>
                  <option value="exchange">🔁 Exchange / Item Replacement</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  {refundMethod === 'khata_credit' && 'Automatically credits customer ledger, reducing their receivable balance.'}
                  {refundMethod === 'cash_refund' && 'Cash is given back to the customer directly at the sales counter.'}
                  {refundMethod === 'bank_refund' && 'Funds returned to customer via Raast / Bank transfer.'}
                  {refundMethod === 'exchange' && 'Item replaced with alternate stock part.'}
                </p>
              </div>

              {/* Restocking Fee / Handling Deduction */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Restocking Fee / Deduction (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  value={deductionFee}
                  onChange={(e) => setDeductionFee(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full h-10 px-3 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Deducted from gross refund if applicable
                </span>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Return Status
                </label>
                <select
                  value={refundStatus}
                  onChange={(e) => setRefundStatus(e.target.value as any)}
                  className="w-full h-10 px-3 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="completed">Completed / Settled</option>
                  <option value="pending">Pending Approval / Inspection</option>
                </select>
              </div>
            </div>

            {/* General Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Return Memo / Reason Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details regarding return condition, customer justification, or inspection remarks..."
                rows={2}
                className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Summary Calculation Card */}
            <div className="bg-white p-4 rounded-xl border border-red-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Items Subtotal:</span>
                <span className="font-bold text-slate-900">Rs. {subtotal.toLocaleString()}</span>
              </div>

              {deductionFee > 0 && (
                <div className="flex items-center justify-between text-xs text-amber-700">
                  <span>Handling / Restock Deduction:</span>
                  <span className="font-bold">- Rs. {deductionFee.toLocaleString()}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
                <span className="text-red-700">Total Net Refund / Credit:</span>
                <span className="text-lg text-red-700">Rs. {totalRefundAmount.toLocaleString()}</span>
              </div>

              {/* Khata Balance Impact Indicator */}
              {selectedCustomerId && selectedCustomerId !== 'walkin' && refundMethod === 'khata_credit' && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs bg-red-50/50 p-2 rounded-lg">
                  <span className="text-slate-600">Khata Impact:</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-slate-500 line-through">Rs. {currentKhataBalance.toLocaleString()}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-emerald-700">Rs. {afterReturnKhataBalance.toLocaleString()}</span>
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
              <span>{initialReturn ? 'Update Customer Return' : 'Record Return & Update Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
