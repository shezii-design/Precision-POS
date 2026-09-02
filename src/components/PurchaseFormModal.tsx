import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  ShoppingBag, 
  Search, 
  Plus, 
  Trash2, 
  Building2, 
  Calendar, 
  DollarSign, 
  Check, 
  AlertCircle,
  FileText,
  Package,
  Layers,
  Sparkles,
  TrendingUp,
  Tag
} from 'lucide-react';
import { Purchase, PurchaseItem, Vendor, Product } from '../types';
import { formatPKR } from '../services/pricing';

interface PurchaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendors: Vendor[];
  selectedVendorId?: string;
  products: Product[];
  editingPurchase?: Purchase | null;
  onSavePurchase: (purchase: Purchase, originalPurchase?: Purchase | null) => void;
}

export const PurchaseFormModal: React.FC<PurchaseFormModalProps> = ({
  isOpen,
  onClose,
  vendors,
  selectedVendorId,
  products,
  editingPurchase,
  onSavePurchase,
}) => {
  const [vendorId, setVendorId] = useState<string>(selectedVendorId || '');
  const [billNumber, setBillNumber] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number | string>(0);
  const [amountPaid, setAmountPaid] = useState<number | string>(0);
  const [updatePricesInInventory, setUpdatePricesInInventory] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Item Search in modal
  const [searchProductQuery, setSearchProductQuery] = useState<string>('');
  const [showProductDropdown, setShowProductDropdown] = useState<boolean>(false);
  const productSearchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingPurchase) {
        setVendorId(editingPurchase.vendorId);
        setBillNumber(editingPurchase.billNumber || '');
        setDate(editingPurchase.date ? editingPurchase.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
        setItems(editingPurchase.items || []);
        setDiscountAmount(editingPurchase.discountAmount || 0);
        setAmountPaid(editingPurchase.amountPaid || 0);
        setUpdatePricesInInventory(editingPurchase.updatePricesInInventory ?? true);
        setNotes(editingPurchase.notes || '');
      } else {
        const initialVendor = selectedVendorId || (vendors[0]?.id || '');
        setVendorId(initialVendor);
        setBillNumber(`PUR-${Math.floor(1000 + Math.random() * 9000)}`);
        setDate(new Date().toISOString().slice(0, 10));
        setItems([]);
        setDiscountAmount(0);
        setAmountPaid(0);
        setUpdatePricesInInventory(true); // Default selected as requested by user
        setNotes('');
      }
      setSearchProductQuery('');
      setShowProductDropdown(false);
      setError('');
    }
  }, [isOpen, editingPurchase?.id, selectedVendorId]);

  const selectedVendor = useMemo(() => {
    return vendors.find(v => v.id === vendorId);
  }, [vendors, vendorId]);

  // Filtered products for quick item add
  const filteredProducts = useMemo(() => {
    if (!searchProductQuery.trim()) return [];
    const q = searchProductQuery.toLowerCase().trim();
    return products.filter(p => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.internalId.toLowerCase().includes(q) ||
        (p.brandName && p.brandName.toLowerCase().includes(q)) ||
        (p.typeName && p.typeName.toLowerCase().includes(q))
      );
    }).slice(0, 8);
  }, [products, searchProductQuery]);

  const handleAddProduct = (p: Product) => {
    const existingIndex = items.findIndex(it => it.productId === p.id);
    if (existingIndex >= 0) {
      // Increase quantity
      setItems(prev => {
        const next = [...prev];
        const updatedQty = next[existingIndex].quantity + 1;
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: updatedQty,
          totalPrice: updatedQty * next[existingIndex].unitPrice,
        };
        return next;
      });
    } else {
      const newItem: PurchaseItem = {
        id: `pitem-${Date.now()}-${p.id}`,
        productId: p.id,
        internalId: p.internalId,
        productName: p.name,
        brandName: p.brandName,
        typeName: p.typeName,
        unit: p.unit || 'Pcs',
        quantity: 1,
        unitPrice: p.costPrice || 0,
        totalPrice: p.costPrice || 0,
        previousCostPrice: p.costPrice || 0,
      };
      setItems(prev => [...prev, newItem]);
    }
    setSearchProductQuery('');
    setShowProductDropdown(false);
  };

  const handleUpdateItem = (index: number, field: 'quantity' | 'unitPrice', val: number) => {
    setItems(prev => {
      const next = [...prev];
      const current = next[index];
      const updatedQty = field === 'quantity' ? Math.max(1, val) : current.quantity;
      const updatedPrice = field === 'unitPrice' ? Math.max(0, val) : current.unitPrice;

      next[index] = {
        ...current,
        quantity: updatedQty,
        unitPrice: updatedPrice,
        totalPrice: updatedQty * updatedPrice,
      };
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
  }, [items]);

  const numDiscount = Number(discountAmount) || 0;
  const totalAmount = Math.max(0, subtotal - numDiscount);
  const numPaid = Number(amountPaid) || 0;
  const balanceDue = Math.max(0, totalAmount - numPaid);

  const paymentStatus: 'paid' | 'partial' | 'unpaid' = useMemo(() => {
    if (totalAmount === 0) return 'paid';
    if (numPaid >= totalAmount) return 'paid';
    if (numPaid > 0) return 'partial';
    return 'unpaid';
  }, [totalAmount, numPaid]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) {
      setError('Please select a vendor');
      return;
    }
    if (!billNumber.trim()) {
      setError('Bill Number is required');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one product item to the purchase bill');
      return;
    }

    const purchaseToSave: Purchase = {
      id: editingPurchase ? editingPurchase.id : `PUR-${Date.now()}`,
      billNumber: billNumber.trim(),
      vendorId,
      vendorName: selectedVendor ? selectedVendor.businessName : 'Vendor',
      date: new Date(date || Date.now()).toISOString(),
      items,
      subtotal,
      discountAmount: numDiscount,
      totalAmount,
      amountPaid: numPaid,
      balanceDue,
      paymentStatus,
      updatePricesInInventory,
      notes: notes.trim() || undefined,
      createdAt: editingPurchase ? editingPurchase.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSavePurchase(purchaseToSave, editingPurchase);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="purchase-form-modal-card"
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {editingPurchase ? `Edit Purchase Bill #${editingPurchase.billNumber}` : 'Record Purchase from Supplier'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Purchasing stock items from vendor • FIFO stock batches logged automatically
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-slate-800 flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Top Row: Vendor, Bill #, Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Vendor / Supplier <span className="text-red-500">*</span>
              </label>
              <select
                id="purchase-vendor-select"
                value={vendorId}
                onChange={e => setVendorId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
                required
              >
                <option value="" disabled>Select Vendor...</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.businessName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Supplier Bill / Invoice # <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="purchase-bill-number-input"
                placeholder="e.g. SF-9842"
                value={billNumber}
                onChange={e => setBillNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Purchase Date
              </label>
              <input
                type="date"
                id="purchase-date-input"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Product Search and Add to Bill */}
          <div className="pt-1">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Search & Add Catalog Products
            </label>
            <div className="relative">
              <input
                ref={productSearchInputRef}
                type="text"
                id="purchase-item-search-input"
                placeholder="Search catalog products by Part #, Name, Brand to add to bill..."
                value={searchProductQuery}
                onChange={e => {
                  setSearchProductQuery(e.target.value);
                  setShowProductDropdown(true);
                }}
                onFocus={() => setShowProductDropdown(true)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />

              {/* Product Autocomplete Dropdown */}
              {showProductDropdown && filteredProducts.length > 0 && (
                <div 
                  id="purchase-product-autocomplete"
                  className="absolute z-30 top-full mt-1 left-0 right-0 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto"
                >
                  {filteredProducts.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleAddProduct(p)}
                      className="px-3.5 py-2.5 hover:bg-amber-50 cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-0 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                          {p.internalId}
                        </span>
                        <span className="text-xs font-black text-slate-900">{p.name}</span>
                        <span className="text-[11px] text-slate-500">({p.brandName} • {p.typeName})</span>
                      </div>
                      <div className="text-xs text-slate-600 font-bold">
                        Cost: ₨ {p.costPrice?.toLocaleString()} • Stock: {p.stockQuantity} {p.unit || 'Pcs'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Purchased Items Table */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                Purchased Line Items ({items.length})
              </label>
              <span className="text-[11px] text-slate-500 font-semibold">
                Cost rates are editable per purchase
              </span>
            </div>

            {items.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 bg-slate-50/50">
                <Package className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-slate-400" />
                <p className="text-xs font-semibold">No items added yet. Search above to add items to this purchase bill.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <th className="px-3.5 py-2.5">Item Description</th>
                      <th className="px-3.5 py-2.5 text-center w-28">Quantity</th>
                      <th className="px-3.5 py-2.5 text-right w-36">Buying Cost (₨)</th>
                      <th className="px-3.5 py-2.5 text-right w-32">Subtotal (₨)</th>
                      <th className="px-2 py-2.5 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => {
                      const hasPriceChanged = item.previousCostPrice !== undefined && item.unitPrice !== item.previousCostPrice;

                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50/70">
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-amber-900 bg-amber-100 px-1 py-0.2 rounded text-[11px]">
                                {item.internalId}
                              </span>
                              <span className="font-black text-slate-900 text-xs">{item.productName}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {item.brandName} • {item.typeName}
                            </div>
                            {hasPriceChanged && (
                              <div className="text-[10px] text-amber-700 font-bold mt-0.5 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                <span>Previous Cost: ₨ {item.previousCostPrice?.toLocaleString()}</span>
                              </div>
                            )}
                          </td>

                          <td className="px-3.5 py-2.5 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={e => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 text-center font-bold bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            />
                          </td>

                          <td className="px-3.5 py-2.5 text-right">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unitPrice}
                              onChange={e => handleUpdateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-28 px-2 py-1 text-right font-black bg-white border border-slate-300 rounded-lg text-xs text-amber-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            />
                          </td>

                          <td className="px-3.5 py-2.5 text-right font-mono font-black text-slate-900">
                            ₨ {item.totalPrice?.toLocaleString()}
                          </td>

                          <td className="px-2 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer transition-colors"
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
            )}
          </div>

          {/* Update Prices in Inventory Option (Auto-selected by default) */}
          <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
            <input
              type="checkbox"
              id="purchase-update-prices-checkbox"
              checked={updatePricesInInventory}
              onChange={e => setUpdatePricesInInventory(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="purchase-update-prices-checkbox" className="text-xs text-slate-800 cursor-pointer select-none">
              <span className="font-black text-amber-950 block">
                Update Product Cost & Selling Prices in Inventory (Selected by Default)
              </span>
              <span className="text-slate-600 block mt-0.5 leading-relaxed">
                When active, if you bought items at a new rate (e.g. 5 pcs @ ₨1,200 after previous 5 @ ₨1,000), the active cost price in inventory will update to ₨1,200 for your catalog and recalculate retail selling tiers. <strong>Sales profit will always accurately follow First-In First-Out (FIFO)</strong> using original historical purchase costs (e.g. ₨1,000 for the first 5 sales).
              </span>
            </label>
          </div>

          {/* Financial Summary & Payment Box */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Bill Subtotal
                </label>
                <div className="text-base font-black text-slate-900 font-mono">
                  ₨ {subtotal.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Discount (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={e => setDiscountAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Net Total Bill (PKR)
                </label>
                <div className="text-base font-black text-amber-900 font-mono">
                  ₨ {totalAmount.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Amount Paid Now (Cash Sent)
                </label>
                <input
                  type="number"
                  min="0"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Creates "Cash" entry in vendor ledger
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Balance Remaining
                </label>
                <div className={`text-base font-black font-mono ${balanceDue > 0 ? 'text-amber-800' : 'text-emerald-600'}`}>
                  ₨ {balanceDue.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Payment Status
                </label>
                <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-black uppercase ${
                  paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                  paymentStatus === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                }`}>
                  {paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide">
              Purchase Notes (Optional)
            </label>
            <input
              type="text"
              id="purchase-notes-input"
              placeholder="e.g. Container shipment from supplier warehouse..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              id="btn-cancel-purchase-form"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-submit-purchase-form"
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{editingPurchase ? 'Update Purchase Bill' : 'Save Purchase & Update Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
