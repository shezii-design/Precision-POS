import React, { useState, useEffect, useMemo } from 'react';
import { CompanyMachine, Customer, MachineDemandItem, Product, QuantityUnit } from '../types';
import { formatPKR, getDefaultRetailPrice } from '../services/pricing';
import { 
  X, 
  Plus, 
  Trash2, 
  Wrench, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  Clock, 
  MapPin, 
  User, 
  Hash, 
  Info, 
  ChevronDown, 
  DollarSign 
} from 'lucide-react';

interface CompanyMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Customer;
  editingMachine?: CompanyMachine | null;
  products: Product[];
  onSaveMachine: (machine: CompanyMachine) => void;
}

export const CompanyMachineModal: React.FC<CompanyMachineModalProps> = ({
  isOpen,
  onClose,
  company,
  editingMachine,
  products,
  onSaveMachine,
}) => {
  const [machineName, setMachineName] = useState<string>('');
  const [operatorName, setOperatorName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [purchaseFrequency, setPurchaseFrequency] = useState<string>('Every Month');
  const [customFrequency, setCustomFrequency] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<MachineDemandItem[]>([]);
  const [error, setError] = useState<string>('');

  // Item selector states
  const [itemSearchTerm, setItemSearchTerm] = useState<string>('');
  const [showItemDropdown, setShowItemDropdown] = useState<boolean>(false);
  const [isCustomItem, setIsCustomItem] = useState<boolean>(false);
  const [customPartName, setCustomPartName] = useState<string>('');
  const [customBrand, setCustomBrand] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (editingMachine) {
        setMachineName(editingMachine.machineName || '');
        setOperatorName(editingMachine.operatorName || '');
        setLocation(editingMachine.location || '');
        const freq = editingMachine.purchaseFrequency || '';
        if (['Every Month', 'Every 40 Days', 'Every 15 Days', 'Every 2 Months', 'Every 3 Months', 'Quarterly', ''].includes(freq)) {
          setPurchaseFrequency(freq || 'Every Month');
          setCustomFrequency('');
        } else {
          setPurchaseFrequency('Custom');
          setCustomFrequency(freq);
        }
        setNotes(editingMachine.notes || '');
        setItems(editingMachine.items ? [...editingMachine.items] : []);
      } else {
        setMachineName('');
        setOperatorName('');
        setLocation('');
        setPurchaseFrequency('Every 40 Days');
        setCustomFrequency('');
        setNotes('');
        setItems([]);
      }
      setItemSearchTerm('');
      setShowItemDropdown(false);
      setIsCustomItem(false);
      setCustomPartName('');
      setCustomBrand('');
      setError('');
    }
  }, [isOpen, editingMachine]);

  const filteredProducts = useMemo(() => {
    if (!itemSearchTerm.trim()) return products.slice(0, 10);
    const q = itemSearchTerm.toLowerCase().trim();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.internalId.toLowerCase().includes(q) ||
      (p.brandName && p.brandName.toLowerCase().includes(q)) ||
      (p.crossReferences && p.crossReferences.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [products, itemSearchTerm]);

  if (!isOpen) return null;

  const handleSelectProduct = (prod: Product) => {
    const defaultRetail = getDefaultRetailPrice(prod);
    const newItem: MachineDemandItem = {
      id: `mitem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: prod.id,
      internalId: prod.internalId,
      productName: prod.name,
      brandName: prod.brandName || '',
      typeName: prod.typeName || '',
      unit: prod.unit || 'Pcs',
      customerItemNumber: '',
      quantity: 1,
      unitPrice: defaultRetail || prod.costPrice || 0,
      notes: '',
    };
    setItems([...items, newItem]);
    setItemSearchTerm('');
    setShowItemDropdown(false);
  };

  const handleAddCustomItem = () => {
    if (!customPartName.trim()) {
      setError('Please enter a name for the custom part.');
      return;
    }
    const newItem: MachineDemandItem = {
      id: `mitem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productName: customPartName.trim(),
      brandName: customBrand.trim() || undefined,
      unit: 'Pcs',
      customerItemNumber: '',
      quantity: 1,
      unitPrice: 0,
      notes: '',
    };
    setItems([...items, newItem]);
    setCustomPartName('');
    setCustomBrand('');
    setIsCustomItem(false);
    setError('');
  };

  const handleUpdateItem = (id: string, updates: Partial<MachineDemandItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const totalCycleCost = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineName.trim()) {
      setError('Please enter a Machine Name / Model.');
      return;
    }

    const finalFrequency = purchaseFrequency === 'Custom' ? customFrequency.trim() : purchaseFrequency;

    const machineData: CompanyMachine = {
      id: editingMachine?.id || `mach-${Date.now()}`,
      machineName: machineName.trim(),
      operatorName: operatorName.trim() || undefined,
      location: location.trim() || undefined,
      purchaseFrequency: finalFrequency || undefined,
      lastPurchasedDate: editingMachine?.lastPurchasedDate,
      items,
      notes: notes.trim() || undefined,
      createdAt: editingMachine?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveMachine(machineData);
    onClose();
  };

  return (
    <div 
      id="company-machine-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        
        {/* Header Banner */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-700 via-red-600 to-rose-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-white shadow-inner">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                {editingMachine ? 'Edit Machine & Demand Items' : 'Add Machine for Demand Planning'}
              </h2>
              <p className="text-xs text-red-100 font-medium">
                Company: <span className="font-bold underline decoration-white/40">{company.name}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Machine Profile Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-red-600" />
                Machine Specifications
              </h3>
              <span className="text-[11px] text-slate-400 font-semibold">Step 1: Machine Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Machine Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Machine Name / Model / Reg # <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">e.g. CAT 320D Excavator #01</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Caterpillar 320D Hydraulic Excavator"
                  value={machineName}
                  onChange={(e) => setMachineName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-sm font-bold text-slate-900 outline-hidden transition-all placeholder:text-slate-400"
                  required
                />
              </div>

              {/* Machine Operator Name (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Machine Operator Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ustad Tariq Mahmood"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-hidden transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Location / Site / Bay (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Location / Quarry / Site (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plant 2 - Samundri Quarry"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-hidden transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Purchase Frequency (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Purchase Frequency (Optional)
                </label>
                <select
                  value={purchaseFrequency}
                  onChange={(e) => setPurchaseFrequency(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-hidden transition-all"
                >
                  <option value="Every Month">Every Month (30 Days)</option>
                  <option value="Every 40 Days">Every 40 Days</option>
                  <option value="Every 15 Days">Every 15 Days (Bi-weekly)</option>
                  <option value="Every 2 Months">Every 2 Months (60 Days)</option>
                  <option value="Quarterly">Quarterly (90 Days)</option>
                  <option value="Custom">Custom Interval...</option>
                </select>
              </div>

              {purchaseFrequency === 'Custom' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Custom Interval Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Every 250 Engine Operating Hours"
                    value={customFrequency}
                    onChange={(e) => setCustomFrequency(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-hidden transition-all"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Machine Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Engine 6-cylinder diesel, chassis #991"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-hidden transition-all"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Machine Filter & Parts Demand Builder */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-red-600" />
                  Demand Items for this Machine ({items.length})
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Add filters and items required on each service cycle with custom selling prices.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isCustomItem ? (
                  <button
                    type="button"
                    onClick={() => setIsCustomItem(true)}
                    className="px-2.5 py-1 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors cursor-pointer"
                  >
                    + Add Custom Non-Inventory Part
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCustomItem(false)}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel Custom Part
                  </button>
                )}
              </div>
            </div>

            {/* Custom Part Input Form */}
            {isCustomItem ? (
              <div className="p-3.5 bg-red-50/50 border border-red-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-red-900">
                  <span>Add Custom Non-Catalog Item</span>
                  <span className="text-[10px] text-red-600 font-normal">For special orders or non-stock parts</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Part Name / Filter Code (e.g. Hydraulic Element HF-301)"
                      value={customPartName}
                      onChange={(e) => setCustomPartName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Brand (Optional)"
                      value={customBrand}
                      onChange={(e) => setCustomBrand(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-xs font-semibold text-slate-900 outline-hidden"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Add Part to Demand List
                </button>
              </div>
            ) : (
              /* Search from Inventory Dropdown */
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search inventory by Part #, Internal ID (KFH-xxx), or Brand to add..."
                    value={itemSearchTerm}
                    onChange={(e) => {
                      setItemSearchTerm(e.target.value);
                      setShowItemDropdown(true);
                    }}
                    onFocus={() => setShowItemDropdown(true)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs font-bold text-slate-900 outline-hidden transition-all placeholder:text-slate-400"
                  />
                </div>

                {showItemDropdown && itemSearchTerm.trim() && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 max-h-56 overflow-y-auto z-30 divide-y divide-slate-100">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500 font-semibold">
                        No matching product found. You can add it as a custom part above.
                      </div>
                    ) : (
                      filteredProducts.map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => handleSelectProduct(prod)}
                          className="p-3 hover:bg-red-50 cursor-pointer transition-colors flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 group-hover:bg-red-100 text-slate-700 group-hover:text-red-700 font-mono text-[10px] font-bold">
                              {prod.internalId}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-slate-900 group-hover:text-red-950">
                                {prod.name}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {prod.brandName || 'Generic'} • {prod.typeName || 'Filter'} • Stock: <span className="font-bold">{prod.stockQuantity || 0}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs font-black text-slate-900">
                              {formatPKR(getDefaultRetailPrice(prod))}
                            </div>
                            <span className="text-[9px] font-bold text-emerald-600">
                              + Click to Add
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Added Demand Items Table / Cards */}
            {items.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No items added to this machine yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Search catalog above to attach oil, air, or fuel filters required for this machine.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div 
                    key={item.id}
                    className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/90 hover:border-slate-300 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-[10px] font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-900">
                              {item.productName}
                            </span>
                            {item.internalId && (
                              <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded text-[9px] font-mono font-bold">
                                {item.internalId}
                              </span>
                            )}
                            {item.brandName && (
                              <span className="px-1.5 py-0.2 bg-red-100 text-red-700 rounded text-[9px] font-bold">
                                {item.brandName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Customer's Item / Part Number (Cross-Reference Sync) */}
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                          <span>Customer's Item #</span>
                          <span className="text-[9px] text-emerald-600 font-bold">Auto-Syncs</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. DWG-9912 / AM-FLT"
                          value={item.customerItemNumber || ''}
                          onChange={(e) => handleUpdateItem(item.id, { customerItemNumber: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-hidden focus:border-red-500"
                        />
                      </div>

                      {/* Demand Quantity */}
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                          Demand Qty
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-900 outline-hidden focus:border-red-500 text-center"
                          />
                          <span className="text-[11px] font-bold text-slate-500">
                            {item.unit || 'Pcs'}
                          </span>
                        </div>
                      </div>

                      {/* Selling Price in PKR */}
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                          Sell Price (PKR)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[11px]">
                            ₨
                          </span>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(item.id, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-900 outline-hidden focus:border-red-500 text-right"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Demand Summary Footer */}
                <div className="p-3 bg-red-50/70 border border-red-200/80 rounded-2xl flex items-center justify-between text-slate-900">
                  <span className="text-xs font-bold text-red-950">
                    Cycle Total ({items.reduce((s, i) => s + i.quantity, 0)} parts):
                  </span>
                  <span className="text-sm font-black text-red-700">
                    {formatPKR(totalCycleCost)}
                  </span>
                </div>
              </div>
            )}

            {/* Inventory Auto-Sync Explanatory Note */}
            <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-800">Inventory Sync Rule:</strong> Customer item numbers and this machine's name (<span className="font-semibold">{machineName || 'New Machine'}</span>) are automatically synchronized into each product's cross-references and machine list in inventory upon saving.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingMachine ? 'Update Machine & Sync Inventory' : 'Save Machine & Sync Inventory'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
