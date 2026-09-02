import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Demand, DemandStatus, Product, QuantityUnit } from '../types';
import { 
  X, 
  User, 
  Phone, 
  MapPin, 
  Package, 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Ban, 
  XCircle, 
  Sparkles, 
  Layers, 
  Tag, 
  Info,
  DollarSign
} from 'lucide-react';
import { formatPKR, getDefaultRetailPrice } from '../services/pricing';

interface DemandFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (demand: Partial<Demand>) => void;
  existingDemand?: Demand | null;
  customers: Customer[];
  products: Product[];
}

export const DemandFormModal: React.FC<DemandFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingDemand,
  customers = [],
  products = []
}) => {
  // Form State
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);

  const [itemName, setItemName] = useState<string>('');
  const [itemDetails, setItemDetails] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);

  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<QuantityUnit>('Pcs');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [requiredDate, setRequiredDate] = useState<string>('');

  const [status, setStatus] = useState<DemandStatus>('pending');
  const [unfulfillableReason, setUnfulfillableReason] = useState<string>('');
  const [cancellationReason, setCancellationReason] = useState<string>('');

  const [customerDropdownOpen, setCustomerDropdownOpen] = useState<boolean>(false);
  const [productDropdownOpen, setProductDropdownOpen] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Reset or prefill when modal opens
  useEffect(() => {
    if (isOpen) {
      if (existingDemand) {
        setCustomerName(existingDemand.customerName || '');
        setCustomerPhone(existingDemand.customerPhone || '');
        setLocation(existingDemand.location || '');
        setSelectedCustomerId(existingDemand.customerId);

        setItemName(existingDemand.itemName || '');
        setItemDetails(existingDemand.itemDetails || '');
        setNotes(existingDemand.notes || '');
        setSelectedProductId(existingDemand.productId);

        setQuantity(existingDemand.quantity || 1);
        setUnit(existingDemand.unit || 'Pcs');
        setTargetPrice(existingDemand.targetPrice !== undefined ? String(existingDemand.targetPrice) : '');
        setRequiredDate(existingDemand.requiredDate || '');

        setStatus(existingDemand.status || 'pending');
        setUnfulfillableReason(existingDemand.unfulfillableReason || '');
        setCancellationReason(existingDemand.cancellationReason || '');
      } else {
        // New Demand Defaults
        setCustomerName('');
        setCustomerPhone('');
        setLocation('');
        setSelectedCustomerId(undefined);

        setItemName('');
        setItemDetails('');
        setNotes('');
        setSelectedProductId(undefined);

        setQuantity(1);
        setUnit('Pcs');
        setTargetPrice('');

        // Default target date: 2 days from now
        const defaultDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setRequiredDate(defaultDate);

        setStatus('pending');
        setUnfulfillableReason('');
        setCancellationReason('');
      }
      setError('');
      setCustomerDropdownOpen(false);
      setProductDropdownOpen(false);
    }
  }, [isOpen, existingDemand]);

  // Filtered customer suggestions
  const customerSuggestions = useMemo(() => {
    if (!customerName.trim()) return customers.slice(0, 6);
    const q = customerName.toLowerCase();
    return customers
      .filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)) || (c.city && c.city.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [customerName, customers]);

  // Filtered product suggestions
  const productSuggestions = useMemo(() => {
    if (!itemName.trim()) return products.slice(0, 6);
    const q = itemName.toLowerCase();
    return products
      .filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.internalId.toLowerCase().includes(q) || 
        (p.brandName && p.brandName.toLowerCase().includes(q)) ||
        (p.crossReferences && p.crossReferences.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [itemName, products]);

  // Handle selecting an existing customer
  const handleSelectCustomer = (c: Customer) => {
    setCustomerName(c.name);
    setSelectedCustomerId(c.id);
    if (c.phone) setCustomerPhone(c.phone);
    if (c.city || c.address) {
      const loc = [c.address, c.city].filter(Boolean).join(', ');
      setLocation(loc);
    }
    setCustomerDropdownOpen(false);
  };

  // Handle selecting an existing product
  const handleSelectProduct = (p: Product) => {
    setItemName(p.name);
    setSelectedProductId(p.id);
    setUnit(p.unit || 'Pcs');

    // Build smart details from product specs
    const detailParts: string[] = [];
    if (p.brandName) detailParts.push(`Brand: ${p.brandName}`);
    if (p.typeName) detailParts.push(`Type: ${p.typeName}`);
    if (p.dimensions) {
      const { height, outerDia, innerDia, thread, inputUnit } = p.dimensions;
      const dimArr: string[] = [];
      if (height) dimArr.push(`H: ${height}${inputUnit === 'mm' ? 'mm' : '"'}`);
      if (outerDia) dimArr.push(`OD: ${outerDia}${inputUnit === 'mm' ? 'mm' : '"'}`);
      if (innerDia) dimArr.push(`ID: ${innerDia}${inputUnit === 'mm' ? 'mm' : '"'}`);
      if (thread) dimArr.push(`Thread: ${thread}`);
      if (dimArr.length > 0) detailParts.push(`Size (${dimArr.join(', ')})`);
    }
    if (p.crossReferences) detailParts.push(`OEM/Ref: ${p.crossReferences}`);

    if (detailParts.length > 0) {
      setItemDetails(detailParts.join(' • '));
    }

    const defaultRetail = getDefaultRetailPrice(p);
    if (defaultRetail > 0) {
      setTargetPrice(String(defaultRetail));
    }

    setProductDropdownOpen(false);
  };

  // Quick date helper presets
  const setQuickDate = (daysAhead: number) => {
    const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    setRequiredDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      setError('Please provide the Person / Customer Name.');
      return;
    }
    if (!itemName.trim()) {
      setError('Please provide the Item Name requested.');
      return;
    }
    if (quantity <= 0) {
      setError('Quantity requested must be at least 1.');
      return;
    }

    const parsedPrice = targetPrice.trim() ? parseFloat(targetPrice) : undefined;
    if (parsedPrice !== undefined && (isNaN(parsedPrice) || parsedPrice < 0)) {
      setError('Target price must be a valid positive number.');
      return;
    }

    const demandPayload: Partial<Demand> = {
      ...(existingDemand?.id ? { id: existingDemand.id } : {}),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      location: location.trim() || undefined,
      customerId: selectedCustomerId,

      itemName: itemName.trim(),
      productId: selectedProductId,
      itemDetails: itemDetails.trim() || undefined,
      notes: notes.trim() || undefined,

      quantity: Math.max(1, Number(quantity) || 1),
      unit: unit || 'Pcs',
      targetPrice: parsedPrice !== undefined && parsedPrice > 0 ? parsedPrice : undefined,
      requiredDate: requiredDate || undefined,

      status,
      unfulfillableReason: status === 'unfulfillable' ? unfulfillableReason.trim() : undefined,
      cancellationReason: status === 'cancelled' ? cancellationReason.trim() : undefined,
    };

    onSave(demandPayload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={() => {
          setCustomerDropdownOpen(false);
          setProductDropdownOpen(false);
        }}
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-red-800 via-red-700 to-rose-700 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center font-bold text-white shadow-inner">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                {existingDemand ? `Edit Demand (${existingDemand.demandNumber})` : 'Log New Customer Demand'}
              </h2>
              <p className="text-xs text-red-100 font-medium">
                Save customer item request with required size, contact info & fulfillment date
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-bold animate-in shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Customer / Person Info */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-red-600" />
                1. Customer & Contact Details
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">Who requested the item</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Person / Customer Name */}
              <div className="relative sm:col-span-1" onClick={(e) => e.stopPropagation()}>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Person / Customer Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Haji Rafiq, Bilal Khan"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setSelectedCustomerId(undefined);
                    setCustomerDropdownOpen(true);
                  }}
                  onFocus={() => setCustomerDropdownOpen(true)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs"
                />

                {/* Customer Autocomplete Dropdown */}
                {customerDropdownOpen && customerSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden py-1 max-h-48 overflow-y-auto">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                      Existing Customers
                    </div>
                    {customerSuggestions.map(c => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full px-3 py-2 text-left text-xs font-semibold hover:bg-red-50 text-slate-800 flex items-center justify-between gap-2 cursor-pointer border-b border-slate-50 last:border-0"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{c.name}</div>
                          <div className="text-[10px] text-slate-500">{c.phone || c.city || 'No phone recorded'}</div>
                        </div>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                          Select
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Phone / Contact Number */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0300-8452199"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs"
                />
              </div>

              {/* Location / City */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  Location / City / Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Badami Bagh, Lahore"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Item Requested & Specifications */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-red-600" />
                2. Item Requested & Size Details
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">Part name, size, specs & preferences</span>
            </div>

            <div className="space-y-3">
              {/* Item Name */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Item Name / Part Description <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CAT 320D Air Filter, 4M-9334, Sakura Fuel Filter"
                  value={itemName}
                  onChange={(e) => {
                    setItemName(e.target.value);
                    setSelectedProductId(undefined);
                    setProductDropdownOpen(true);
                  }}
                  onFocus={() => setProductDropdownOpen(true)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs"
                />

                {/* Product Autocomplete Dropdown */}
                {productDropdownOpen && productSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden py-1 max-h-48 overflow-y-auto">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span>Inventory Catalog Match</span>
                      <span className="text-slate-400 font-normal">Auto-populates specs</span>
                    </div>
                    {productSuggestions.map(p => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => handleSelectProduct(p)}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 text-slate-800 flex items-center justify-between gap-2 cursor-pointer border-b border-slate-50 last:border-0"
                      >
                        <div>
                          <div className="font-black text-slate-900">{p.name} <span className="text-slate-400 font-medium">({p.internalId})</span></div>
                          <div className="text-[10px] text-slate-500">{p.brandName} • {p.typeName} • Stock: {p.stockQuantity} {p.unit}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-red-600">{formatPKR(getDefaultRetailPrice(p))}</span>
                          <span className="block text-[9px] text-slate-400">Select</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Item Details: Size, Dimensions, Thread, Specs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-slate-400" />
                    Size, Dimensions & Technical Details
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">e.g. OD, ID, Height, Thread, Model</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Size: OD 280mm, ID 150mm, Height 410mm, Thread 1-3/8-12 UNF, Heavy Duty Mesh"
                  value={itemDetails}
                  onChange={(e) => setItemDetails(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs"
                />
              </div>

              {/* Note on Item / Customer Preferences */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" />
                  Note on Item & Urgency Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Urgent machine halted on site. Customer prefers Japanese or Genuine Sakura only. Promised 5% trade discount."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Quantity, Target Price & Fulfillment Date */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-600" />
                3. Quantity, Target Price & Fulfillment Deadline
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">When customer wants this fulfilled</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Quantity & Unit */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quantity Required <span className="text-red-600">*</span>
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={1}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs"
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as QuantityUnit)}
                    className="flex-1 px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs cursor-pointer"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Box">Box</option>
                    <option value="Set">Set</option>
                    <option value="Dozen">Dozen</option>
                    <option value="Kg">Kg</option>
                    <option value="Litre">Litre</option>
                    <option value="Carton">Carton</option>
                  </select>
                </div>
              </div>

              {/* Target / Promised Price */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-slate-400" />
                  Target / Promised Unit Price (PKR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-black text-slate-400">₨</span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="e.g. 4500 (Optional)"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Target Date */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Required / Due Date
                </label>
                <input
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs cursor-pointer"
                />

                {/* Quick Date Buttons */}
                <div className="flex items-center gap-1 mt-1.5 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setQuickDate(0)}
                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-bold rounded-md whitespace-nowrap cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(1)}
                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-bold rounded-md whitespace-nowrap cursor-pointer"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(3)}
                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-bold rounded-md whitespace-nowrap cursor-pointer"
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(7)}
                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-bold rounded-md whitespace-nowrap cursor-pointer"
                  >
                    +1 Week
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Status Configuration */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-red-600" />
                4. Demand Status
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">Default is Pending until fulfilled</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Option 1: Pending */}
              <button
                type="button"
                onClick={() => setStatus('pending')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  status === 'pending'
                    ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20 text-amber-900 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">Pending</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                </div>
                <span className="text-[10px] text-slate-500 mt-1">Awaiting procurement</span>
              </button>

              {/* Option 2: Fulfilled */}
              <button
                type="button"
                onClick={() => setStatus('fulfilled')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  status === 'fulfilled'
                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 text-emerald-900 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">Fulfilled</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="text-[10px] text-slate-500 mt-1">Sold or delivered</span>
              </button>

              {/* Option 3: Unfulfillable */}
              <button
                type="button"
                onClick={() => setStatus('unfulfillable')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  status === 'unfulfillable'
                    ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20 text-rose-900 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">Unfulfillable</span>
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <span className="text-[10px] text-slate-500 mt-1">Out of market</span>
              </button>

              {/* Option 4: Cancelled */}
              <button
                type="button"
                onClick={() => setStatus('cancelled')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  status === 'cancelled'
                    ? 'bg-slate-200 border-slate-400 ring-2 ring-slate-500/20 text-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">Cancelled</span>
                  <Ban className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <span className="text-[10px] text-slate-500 mt-1">Client cancelled</span>
              </button>
            </div>

            {/* Unfulfillable Reason Input */}
            {status === 'unfulfillable' && (
              <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl space-y-1.5 animate-in fade-in">
                <label className="block text-xs font-bold text-rose-900">
                  Reason Item Cannot Be Fulfilled:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Discontinued part, checked 4 vendor catalogs; no manufacturer stock."
                  value={unfulfillableReason}
                  onChange={(e) => setUnfulfillableReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}

            {/* Cancellation Reason Input */}
            {status === 'cancelled' && (
              <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl space-y-1.5 animate-in fade-in">
                <label className="block text-xs font-bold text-slate-800">
                  Reason for Cancellation:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Customer purchased from another city; project postponed."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>{existingDemand ? 'Update Demand' : 'Save Customer Demand'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
