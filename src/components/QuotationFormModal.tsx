import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Customer, 
  CustomerType, 
  GlobalPricingSettings, 
  Product, 
  QuantityUnit, 
  Quotation, 
  QuotationItem 
} from '../types';
import { formatPKR, getProductAvailableTiers } from '../services/pricing';
import { 
  calculateQuotationValidUntil, 
  getNextQuotationId 
} from '../services/storage';
import { 
  FileText, 
  Plus, 
  Trash2, 
  User, 
  Building2, 
  Calendar, 
  Clock, 
  Search, 
  Tag, 
  Check, 
  AlertCircle, 
  X, 
  Info, 
  Layers, 
  Sparkles,
  Percent
} from 'lucide-react';

interface QuotationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveQuotation: (quotation: Quotation) => void;
  editingQuotation?: Quotation | null;
  products: Product[];
  customers: Customer[];
  pricingSettings?: GlobalPricingSettings;
  quotationsList?: Quotation[];
}

interface DraftQuotationItem {
  id: string;
  productId?: string;
  internalId: string;
  productName: string;
  brandName: string;
  typeName: string;
  locationName?: string;
  cabinNumber?: string;
  unit: QuantityUnit;
  availableStock?: number;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  totalPrice: number;
  notes: string;
  machineNames: string;
  crossReferences: string;
}

const DEFAULT_TERMS = 
  "1. Prices quoted in PKR are strictly valid for 7 days from the quotation issue date.\n" +
  "2. Delivery is ex-stock and subject to prior sales unless reserved with a confirmed Purchase Order.\n" +
  "3. Payment terms: 100% on delivery / as per mutually agreed corporate Khata credit term.\n" +
  "4. Standard manufacturer defect warranty applicable on genuine filters.";

export const QuotationFormModal: React.FC<QuotationFormModalProps> = ({
  isOpen,
  onClose,
  onSaveQuotation,
  editingQuotation,
  products = [],
  customers = [],
  pricingSettings,
  quotationsList = []
}) => {
  const isEditing = !!editingQuotation;

  // Header & Customer State
  const [quotationNumber, setQuotationNumber] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [validityDays, setValidityDays] = useState<number>(7);
  const [validUntil, setValidUntil] = useState<string>(() => calculateQuotationValidUntil(new Date().toISOString().split('T')[0], 7));
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerType, setCustomerType] = useState<CustomerType>('customer');
  const [customerName, setCustomerName] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerCity, setCustomerCity] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerNtn, setCustomerNtn] = useState<string>('');
  const [customerStrn, setCustomerStrn] = useState<string>('');
  
  // Customer Search & Dropdown State
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Items State
  const [items, setItems] = useState<DraftQuotationItem[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');
  const itemSearchRef = useRef<HTMLDivElement>(null);

  // Financials State
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [termsAndConditions, setTermsAndConditions] = useState<string>(DEFAULT_TERMS);
  const [notes, setNotes] = useState<string>('');

  // Form Validation & Errors
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Initialize or Reset Form
  useEffect(() => {
    if (!isOpen) return;

    if (editingQuotation) {
      setQuotationNumber(editingQuotation.quotationNumber || `QT-${editingQuotation.id.replace('QUO-', '')}`);
      setDate(editingQuotation.date || new Date().toISOString().split('T')[0]);
      setValidityDays(editingQuotation.validityDays || 7);
      setValidUntil(editingQuotation.validUntil || calculateQuotationValidUntil(editingQuotation.date, editingQuotation.validityDays || 7));
      
      setSelectedCustomerId(editingQuotation.customerId || '');
      setCustomerType(editingQuotation.customerType || 'customer');
      setCustomerName(editingQuotation.customerName || '');
      setContactPerson(editingQuotation.contactPerson || '');
      setCustomerPhone(editingQuotation.customerPhone || '');
      setCustomerEmail(editingQuotation.customerEmail || '');
      setCustomerCity(editingQuotation.customerCity || '');
      setCustomerAddress(editingQuotation.customerAddress || '');
      setCustomerNtn(editingQuotation.customerNtn || '');
      setCustomerStrn(editingQuotation.customerStrn || '');

      setItems(
        editingQuotation.items.map((it, idx) => {
          const linkedProd = products.find(p => p.id === it.productId || p.internalId === it.internalId);
          return {
            id: it.id || `qit-${idx}-${Date.now()}`,
            productId: it.productId,
            internalId: it.internalId || '',
            productName: it.productName || '',
            brandName: it.brandName || linkedProd?.brandName || '',
            typeName: it.typeName || linkedProd?.typeName || '',
            locationName: it.locationName || linkedProd?.locationName || '',
            cabinNumber: it.cabinNumber || linkedProd?.cabinNumber || '',
            unit: it.unit || 'Pcs',
            availableStock: linkedProd?.stockQuantity ?? undefined,
            quantity: it.quantity || 1,
            unitPrice: it.unitPrice || 0,
            discountPercent: it.discountPercent || 0,
            totalPrice: it.totalPrice || ((it.quantity || 1) * (it.unitPrice || 0)),
            notes: it.notes || '',
            machineNames: it.machineNames || linkedProd?.machineNames || '',
            crossReferences: it.crossReferences || linkedProd?.crossReferences || ''
          };
        })
      );

      setDiscountType(editingQuotation.discountType || 'amount');
      setDiscountValue(editingQuotation.discountValue || 0);
      setTaxPercent(editingQuotation.taxPercent || 0);
      setTermsAndConditions(editingQuotation.termsAndConditions || DEFAULT_TERMS);
      setNotes(editingQuotation.notes || '');
    } else {
      const nextGen = getNextQuotationId(quotationsList);
      setQuotationNumber(nextGen.quotationNumber);
      const todayStr = new Date().toISOString().split('T')[0];
      setDate(todayStr);
      setValidityDays(7);
      setValidUntil(calculateQuotationValidUntil(todayStr, 7));

      setSelectedCustomerId('');
      setCustomerType('customer');
      setCustomerName('');
      setContactPerson('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerCity('');
      setCustomerAddress('');
      setCustomerNtn('');
      setCustomerStrn('');
      setCustomerSearchQuery('');

      // Add 1 empty starting item
      setItems([
        {
          id: `qit-0-${Date.now()}`,
          internalId: '',
          productName: '',
          brandName: '',
          typeName: '',
          unit: 'Pcs',
          quantity: 1,
          unitPrice: 0,
          discountPercent: 0,
          totalPrice: 0,
          notes: '',
          machineNames: '',
          crossReferences: ''
        }
      ]);

      setDiscountType('amount');
      setDiscountValue(0);
      setTaxPercent(0);
      setTermsAndConditions(DEFAULT_TERMS);
      setNotes('');
    }
    setErrorMessage('');
  }, [isOpen, editingQuotation, products, quotationsList]);

  // Recalculate validUntil whenever date or validityDays changes
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setValidUntil(calculateQuotationValidUntil(newDate, validityDays));
  };

  const handleValidityDaysChange = (days: number) => {
    setValidityDays(days);
    setValidUntil(calculateQuotationValidUntil(date, days));
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (itemSearchRef.current && !itemSearchRef.current.contains(e.target as Node)) {
        setActiveSearchIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered Customers for Search
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers.slice(0, 8);
    const q = customerSearchQuery.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [customers, customerSearchQuery]);

  // Select a Customer from dropdown
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerType(customer.type || 'customer');
    setCustomerName(customer.name);
    setContactPerson(customer.contactPerson || '');
    setCustomerPhone(customer.phone || '');
    setCustomerEmail(customer.email || '');
    setCustomerCity(customer.city || '');
    setCustomerAddress(customer.address || '');
    setCustomerNtn(customer.ntn || '');
    setCustomerStrn(customer.strn || '');
    setShowCustomerDropdown(false);
    setCustomerSearchQuery('');
  };

  // Filtered Products for Row Search
  const filteredProducts = useMemo(() => {
    if (!itemSearchQuery.trim()) return products.slice(0, 8);
    const q = itemSearchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.internalId.toLowerCase().includes(q) ||
      p.brandName.toLowerCase().includes(q) ||
      (p.crossReferences && p.crossReferences.toLowerCase().includes(q)) ||
      (p.machineNames && p.machineNames.toLowerCase().includes(q)) ||
      (p.cabinNumber && p.cabinNumber.toLowerCase().includes(q))
    ).slice(0, 12);
  }, [products, itemSearchQuery]);

  // Select Product for Row
  const handleSelectProduct = (index: number, product: Product) => {
    const defaultRetailRate = product.sellingPrices?.find(p => p.tierId === 'tier-retail')?.price || 
      product.sellingPrices?.[0]?.price || 
      (product.costPrice * 1.25);

    const updated = [...items];
    const qty = updated[index]?.quantity > 0 ? updated[index].quantity : 1;
    const unitPrice = defaultRetailRate;
    const discount = updated[index]?.discountPercent || 0;
    const lineTotal = (qty * unitPrice) * (1 - discount / 100);

    updated[index] = {
      ...updated[index],
      productId: product.id,
      internalId: product.internalId,
      productName: product.name,
      brandName: product.brandName,
      typeName: product.typeName,
      locationName: product.locationName,
      cabinNumber: product.cabinNumber,
      unit: product.unit || 'Pcs',
      availableStock: product.stockQuantity,
      quantity: qty,
      unitPrice: unitPrice,
      totalPrice: lineTotal,
      machineNames: product.machineNames || '',
      crossReferences: product.crossReferences || '',
      notes: updated[index]?.notes || ''
    };

    setItems(updated);
    setActiveSearchIndex(null);
    setItemSearchQuery('');
  };

  // Update item field
  const handleUpdateItem = (index: number, field: keyof DraftQuotationItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    
    // Recalculate line total
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discountPercent) || 0;
    item.totalPrice = Math.max(0, (qty * price) * (1 - disc / 100));

    updated[index] = item;
    setItems(updated);
  };

  // Add new item line
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `qit-${items.length}-${Date.now()}`,
        internalId: '',
        productName: '',
        brandName: '',
        typeName: '',
        unit: 'Pcs',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        totalPrice: 0,
        notes: '',
        machineNames: '',
        crossReferences: ''
      }
    ]);
  };

  // Remove item line
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      // Clear single row instead of deleting
      setItems([{
        id: `qit-0-${Date.now()}`,
        internalId: '',
        productName: '',
        brandName: '',
        typeName: '',
        unit: 'Pcs',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        totalPrice: 0,
        notes: '',
        machineNames: '',
        crossReferences: ''
      }]);
      return;
    }
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  // Financial Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    if (discountType === 'percentage') {
      return (subtotal * (Number(discountValue) || 0)) / 100;
    }
    return Number(discountValue) || 0;
  }, [subtotal, discountType, discountValue]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);

  const taxAmount = useMemo(() => {
    return (taxableAmount * (Number(taxPercent) || 0)) / 100;
  }, [taxableAmount, taxPercent]);

  const totalAmount = useMemo(() => {
    return Math.round(taxableAmount + taxAmount);
  }, [taxableAmount, taxAmount]);

  // Form Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName.trim()) {
      setErrorMessage('Please enter or select a customer or company name.');
      return;
    }

    const validItems = items.filter(it => it.productName.trim() || it.internalId.trim());
    if (validItems.length === 0) {
      setErrorMessage('Please add at least one product / line item to the quotation.');
      return;
    }

    // Prepare Quotation Items
    const quotationItems: QuotationItem[] = validItems.map((it, idx) => ({
      id: it.id || `qit-${idx + 1}-${Date.now()}`,
      productId: it.productId,
      internalId: it.internalId || `ITEM-${idx + 1}`,
      productName: it.productName,
      brandName: it.brandName,
      typeName: it.typeName,
      locationName: it.locationName,
      cabinNumber: it.cabinNumber,
      unit: it.unit,
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      discountPercent: Number(it.discountPercent) || 0,
      totalPrice: Number(it.totalPrice) || 0,
      notes: it.notes,
      crossReferences: it.crossReferences,
      machineNames: it.machineNames
    }));

    const finalQuotationId = editingQuotation?.id || getNextQuotationId(quotationsList).id;
    const finalQuotationNumber = quotationNumber.trim() || `QT-${finalQuotationId.replace('QUO-', '')}`;

    const quotationData: Quotation = {
      id: finalQuotationId,
      quotationNumber: finalQuotationNumber,
      date,
      validUntil,
      validityDays: Number(validityDays) || 7,
      customerId: selectedCustomerId || undefined,
      customerType,
      customerName: customerName.trim(),
      contactPerson: contactPerson.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      customerCity: customerCity.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      customerNtn: customerNtn.trim() || undefined,
      customerStrn: customerStrn.trim() || undefined,
      items: quotationItems,
      subtotal,
      discountType,
      discountValue: Number(discountValue) || 0,
      discountAmount,
      taxPercent: Number(taxPercent) || 0,
      taxAmount,
      totalAmount,
      status: editingQuotation?.status || 'active',
      termsAndConditions,
      notes: notes.trim() || undefined,
      createdAt: editingQuotation?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveQuotation(quotationData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto select-none">
      <div 
        id="quotation-form-modal-dialog"
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl my-auto overflow-hidden flex flex-col max-h-[92vh] select-text"
      >
        {/* HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-red-950 to-slate-900 text-white flex items-center justify-between gap-3 border-b border-red-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center border border-white/20 shadow-xs">
              <FileText className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {isEditing ? `Edit Quotation ${editingQuotation?.quotationNumber}` : 'Create New Quotation / Estimate'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  7-Day Validity
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Generate official client quotation without deducting or modifying inventory stock.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-quotation-form-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* IMPORTANT NOTICE BANNER */}
        <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2 flex items-center justify-between text-xs text-amber-900 gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Non-Deducting Quotation:</strong> Creating this quotation will <strong>NOT</strong> reduce or alter any warehouse stock.
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1 font-bold text-[11px] text-amber-800">
            <Clock className="w-3.5 h-3.5" />
            <span>Expires in {validityDays} days ({validUntil})</span>
          </div>
        </div>

        {/* ERROR NOTIFICATION */}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs font-bold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* FORM CONTENT */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6">
          {/* TOP SECTION: CUSTOMER & METADATA */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Col: Customer & Company Selection */}
            <div className="lg:col-span-7 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold">
                    {customerType === 'company' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Recipient / Billed Party
                  </span>
                </div>

                {/* Customer Type Toggle */}
                <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-300 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setCustomerType('customer')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      customerType === 'customer' ? 'bg-red-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerType('company')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      customerType === 'company' ? 'bg-red-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Company (B2B)
                  </button>
                </div>
              </div>

              {/* Customer Search / Quick Selection */}
              <div className="relative" ref={customerDropdownRef}>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search existing customer / company or type name..."
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setCustomerSearchQuery(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
                    />
                  </div>
                </div>

                {/* Dropdown Suggestions */}
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-200 z-30 max-h-56 overflow-y-auto p-1 text-xs">
                    <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Saved Accounts Matching Search
                    </div>
                    {filteredCustomers.map(c => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="px-3 py-2 hover:bg-red-50 rounded-xl cursor-pointer flex items-center justify-between gap-2 border-b border-slate-50 last:border-0"
                      >
                        <div>
                          <div className="font-black text-slate-800 flex items-center gap-1.5">
                            <span>{c.name}</span>
                            <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-slate-100 text-slate-600">
                              {c.type === 'company' ? 'Company' : 'Customer'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {c.contactPerson ? `Attn: ${c.contactPerson} • ` : ''}{c.phone || 'No Phone'} {c.city ? `(${c.city})` : ''}
                          </div>
                        </div>
                        {c.ntn && (
                          <span className="text-[10px] font-mono text-slate-400">
                            NTN: {c.ntn}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Detail Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Contact Person / Attention
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Engr. Kamran / Haji Tariq"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Phone / WhatsApp Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0300-1234567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lahore / Rawalpindi"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. procurement@company.pk"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-red-600"
                  />
                </div>
                {customerType === 'company' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                        Company NTN Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 2984712-4"
                        value={customerNtn}
                        onChange={(e) => setCustomerNtn(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-red-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                        Sales Tax Registration (STRN)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 07-01-2984-712-19"
                        value={customerStrn}
                        onChange={(e) => setCustomerStrn(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-red-600"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Col: Quotation Number, Date & 7-Day Validity Settings */}
            <div className="lg:col-span-5 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Quotation Details & Validity
                </span>
              </div>

              <div className="space-y-3">
                {/* Quotation Number */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Quotation # / Reference
                  </label>
                  <input
                    type="text"
                    value={quotationNumber}
                    onChange={(e) => setQuotationNumber(e.target.value)}
                    placeholder="e.g. QT-1001"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-hidden focus:border-red-600 font-mono"
                  />
                </div>

                {/* Issue Date */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-red-600"
                  />
                </div>

                {/* Validity Selector (Default 7 Days) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-black uppercase text-slate-500">
                      Validity Period (Standard 7 Days)
                    </label>
                    <span className="text-[10px] font-bold text-amber-700">
                      {validityDays} Days
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[7, 10, 15, 30].map(days => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => handleValidityDaysChange(days)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-black cursor-pointer transition-all border ${
                          validityDays === days
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {days} Days {days === 7 && '★'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Computed Valid Until Display */}
                <div className="p-2.5 rounded-xl bg-amber-100/60 border border-amber-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-800 block">
                      Expires On (Valid Until):
                    </span>
                    <span className="font-black text-amber-950 text-sm">
                      {validUntil}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-amber-700 bg-white/70 px-2 py-0.5 rounded-lg border border-amber-300">
                      Status: Active (7 Days)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ITEM ROWS SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Quoted Products & Filter Parts ({items.length} {items.length === 1 ? 'Item' : 'Items'})
                </h3>
              </div>
              <button
                type="button"
                id="quotation-add-item-btn"
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-black rounded-xl border border-red-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Item Line</span>
              </button>
            </div>

            {/* Table Container */}
            <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10">#</th>
                    <th className="py-2.5 px-3 min-w-[240px]">Product / Part Name & Details</th>
                    <th className="py-2.5 px-3 w-24">Unit</th>
                    <th className="py-2.5 px-3 w-24 text-center">Qty</th>
                    <th className="py-2.5 px-3 w-32 text-right">Unit Price (PKR)</th>
                    <th className="py-2.5 px-3 w-24 text-center">Disc %</th>
                    <th className="py-2.5 px-3 w-32 text-right">Line Total (PKR)</th>
                    <th className="py-2.5 px-2 w-10 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => {
                    const isSearchingThis = activeSearchIndex === index;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Index */}
                        <td className="py-2.5 px-3 font-bold text-slate-400 text-center align-top pt-3">
                          {index + 1}
                        </td>

                        {/* Product Name & Live Search Dropdown */}
                        <td className="py-2.5 px-3 align-top relative">
                          <div className="space-y-1">
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Search part #, name, brand, or machine..."
                                value={item.productName}
                                onChange={(e) => {
                                  handleUpdateItem(index, 'productName', e.target.value);
                                  setItemSearchQuery(e.target.value);
                                  setActiveSearchIndex(index);
                                }}
                                onFocus={() => {
                                  setActiveSearchIndex(index);
                                  setItemSearchQuery(item.productName);
                                }}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:border-red-600"
                              />
                            </div>

                            {/* Dropdown Suggestions */}
                            {isSearchingThis && (
                              <div 
                                ref={itemSearchRef}
                                className="absolute left-3 right-3 top-10 bg-white rounded-2xl shadow-2xl border border-slate-200 z-40 max-h-60 overflow-y-auto p-1.5 text-xs animate-in fade-in"
                              >
                                <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                  <span>Inventory Catalog (Stock for reference only)</span>
                                  <span className="text-red-600">Stock will NOT be deducted</span>
                                </div>
                                {filteredProducts.length === 0 ? (
                                  <div className="p-3 text-center text-slate-400 text-xs">
                                    No exact product match found. You can enter custom part name.
                                  </div>
                                ) : (
                                  filteredProducts.map(p => (
                                    <div
                                      key={p.id}
                                      onClick={() => handleSelectProduct(index, p)}
                                      className="px-2.5 py-2 hover:bg-red-50 rounded-xl cursor-pointer flex items-center justify-between gap-2 border-b border-slate-50 last:border-0"
                                    >
                                      <div>
                                        <div className="font-black text-slate-900 flex items-center gap-1.5">
                                          <span className="text-red-700 font-mono text-[11px]">{p.internalId}</span>
                                          <span>{p.name}</span>
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                                            {p.brandName}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 truncate max-w-sm">
                                          {p.typeName} • Cabin: {p.cabinNumber} {p.machineNames ? `• ${p.machineNames}` : ''}
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <div className="font-black text-slate-800">
                                          ₨ {formatPKR(p.sellingPrices?.[0]?.price || p.costPrice * 1.25)}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400">
                                          Stock: {p.stockQuantity} {p.unit}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}

                            {/* Secondary Line Details (Brand, Cabin, Machine Application) */}
                            <div className="grid grid-cols-2 gap-1 text-[10px]">
                              <input
                                type="text"
                                placeholder="Brand (e.g. Sure Filter)"
                                value={item.brandName}
                                onChange={(e) => handleUpdateItem(index, 'brandName', e.target.value)}
                                className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                              />
                              <input
                                type="text"
                                placeholder="Machine App (e.g. CAT 320D)"
                                value={item.machineNames}
                                onChange={(e) => handleUpdateItem(index, 'machineNames', e.target.value)}
                                className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                              />
                            </div>
                          </div>
                        </td>

                        {/* Unit */}
                        <td className="py-2.5 px-3 align-top">
                          <select
                            value={item.unit}
                            onChange={(e) => handleUpdateItem(index, 'unit', e.target.value as QuantityUnit)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
                          >
                            <option value="Pcs">Pcs</option>
                            <option value="Set">Set</option>
                            <option value="Box">Box</option>
                            <option value="Kg">Kg</option>
                            <option value="Litre">Litre</option>
                            <option value="Meter">Meter</option>
                            <option value="Dozen">Dozen</option>
                          </select>
                        </td>

                        {/* Quantity */}
                        <td className="py-2.5 px-3 align-top">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-center text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-red-500"
                          />
                        </td>

                        {/* Unit Price */}
                        <td className="py-2.5 px-3 align-top">
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-right text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-red-500"
                          />
                        </td>

                        {/* Discount % */}
                        <td className="py-2.5 px-3 align-top">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountPercent}
                            onChange={(e) => handleUpdateItem(index, 'discountPercent', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-center text-slate-700 focus:outline-hidden"
                          />
                        </td>

                        {/* Line Total */}
                        <td className="py-2.5 px-3 align-top text-right pt-3 font-black text-slate-900 font-mono">
                          ₨ {formatPKR(item.totalPrice)}
                        </td>

                        {/* Delete Row Button */}
                        <td className="py-2.5 px-2 align-top text-center pt-2.5">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove row"
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

          {/* BOTTOM SECTION: COMMERCIAL TERMS & FINANCIAL TOTALS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Terms & Conditions */}
            <div className="lg:col-span-7 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-[10px] font-black uppercase text-slate-500">
                Commercial Terms & Conditions (Included in Printout)
              </label>
              <textarea
                rows={4}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-mono leading-relaxed focus:outline-hidden focus:border-red-600"
                placeholder="Enter quotation terms..."
              />
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Standard clause emphasizes 7-day rate validity and ex-stock dispatch terms.</span>
              </div>
            </div>

            {/* Right: Summary & Financial Totals */}
            <div className="lg:col-span-5 bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                Quotation Summary (PKR)
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Gross Subtotal</span>
                  <span className="font-mono font-bold">₨ {formatPKR(subtotal)}</span>
                </div>

                {/* Overall Discount */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-300">Discount</span>
                    <button
                      type="button"
                      onClick={() => setDiscountType(discountType === 'amount' ? 'percentage' : 'amount')}
                      className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-amber-400 font-bold border border-slate-700 cursor-pointer"
                    >
                      {discountType === 'amount' ? 'PKR' : '%'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-right text-white focus:outline-hidden"
                    />
                    <span className="font-mono text-slate-400 text-[11px]">
                      (-₨ {formatPKR(discountAmount)})
                    </span>
                  </div>
                </div>

                {/* Tax / Sales Tax % */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
                  <span className="text-slate-300">GST / Sales Tax %</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-right text-white focus:outline-hidden"
                    />
                    <span className="font-mono text-slate-400 text-[11px]">
                      (+₨ {formatPKR(taxAmount)})
                    </span>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/80">
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">Total Quoted Amount</span>
                    <span className="text-[10px] text-amber-400 font-medium">Valid for 7 Days</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                      ₨ {formatPKR(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* FOOTER ACTIONS */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            <span className="font-bold text-slate-700">7-Day Guarantee:</span> Validity ends on <strong className="text-slate-900">{validUntil}</strong>.
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer min-h-[38px]"
            >
              Cancel
            </button>
            <button
              type="button"
              id="save-quotation-submit-btn"
              onClick={handleSubmit}
              className="px-5 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer min-h-[38px]"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isEditing ? 'Update Quotation' : 'Save Quotation (7-Day Validity)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
