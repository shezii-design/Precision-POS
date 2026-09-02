import React, { useState, useEffect } from 'react';
import { Customer, CustomerType } from '../types';
import { 
  X, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  Hash,
  Briefcase
} from 'lucide-react';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  defaultType?: CustomerType;
  onSaveCustomer: (customerData: Partial<Customer>) => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customer,
  defaultType = 'customer',
  onSaveCustomer,
}) => {
  const [type, setType] = useState<CustomerType>(defaultType);
  const [name, setName] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [secondaryPhone, setSecondaryPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [ntn, setNtn] = useState<string>('');
  const [strn, setStrn] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (customer) {
        setType(customer.type || 'customer');
        setName(customer.name || '');
        setContactPerson(customer.contactPerson || '');
        setPhone(customer.phone || '');
        setSecondaryPhone(customer.secondaryPhone || '');
        setEmail(customer.email || '');
        setCity(customer.city || '');
        setAddress(customer.address || '');
        setNtn(customer.ntn || '');
        setStrn(customer.strn || '');
        setOpeningBalance(customer.openingBalance !== undefined ? String(customer.openingBalance) : '0');
        setNotes(customer.notes || '');
      } else {
        setType(defaultType);
        setName('');
        setContactPerson('');
        setPhone('');
        setSecondaryPhone('');
        setEmail('');
        setCity('');
        setAddress('');
        setNtn('');
        setStrn('');
        setOpeningBalance('0');
        setNotes('');
      }
      setError('');
    }
  }, [isOpen, customer, defaultType]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(`Please enter the ${type === 'company' ? 'Company Name' : 'Customer Name'}.`);
      return;
    }

    const customerData: Partial<Customer> = {
      ...(customer ? { id: customer.id } : {}),
      type,
      name: name.trim(),
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      secondaryPhone: secondaryPhone.trim() || undefined,
      email: email.trim() || undefined,
      city: city.trim() || undefined,
      address: address.trim() || undefined,
      ntn: ntn.trim() || undefined,
      strn: strn.trim() || undefined,
      openingBalance: parseFloat(openingBalance) || 0,
      notes: notes.trim() || undefined,
      machines: customer?.machines || [],
    };

    onSaveCustomer(customerData);
    onClose();
  };

  return (
    <div 
      id="customer-form-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header Banner */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-white shadow-inner">
              {type === 'company' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                {customer 
                  ? (type === 'company' ? 'Edit Company Profile' : 'Edit Customer Profile') 
                  : (type === 'company' ? 'Add New Company' : 'Add New Customer')}
              </h2>
              <p className="text-xs text-red-100 font-medium">
                {type === 'company' 
                  ? 'Industrial, fleet & corporate client with machines and demand tabs' 
                  : 'Individual, retail workshop or trade customer'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Account Category / Type Pill Switcher */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              Account Category
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setType('customer')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  type === 'customer'
                    ? 'bg-white text-red-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Individual Customer</span>
              </button>
              <button
                type="button"
                onClick={() => setType('company')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  type === 'company'
                    ? 'bg-white text-red-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Corporate Company (Demand Tab)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Business / Customer Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {type === 'company' ? 'Company / Business Name' : 'Customer Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder={type === 'company' ? 'e.g. Ahmed Heavy Machinery & Excavation Ltd.' : 'e.g. Al-Rehman Auto Workshop'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-sm font-bold text-slate-900 outline-hidden transition-all placeholder:text-slate-400"
                required
                autoFocus
              />
            </div>

            {/* Contact Person */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Contact Person / Manager Name
              </label>
              <input
                type="text"
                placeholder="e.g. Engr. Ahmed Bilal"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-hidden transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Primary Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Primary Phone / WhatsApp <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 0300-1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-hidden transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Secondary Phone / Landline */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Secondary Phone / Landline (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 041-8765432"
                value={secondaryPhone}
                onChange={(e) => setSecondaryPhone(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-hidden transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="e.g. accounts@ahmedmachinery.pk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-hidden transition-all placeholder:text-slate-400"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                City / Region
              </label>
              <input
                type="text"
                placeholder="e.g. Faisalabad, Lahore, Rawalpindi"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-hidden transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Opening Balance (Initial Debit) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  Opening Balance (PKR)
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Amount owed to us</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  ₨
                </span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs font-bold text-slate-900 outline-hidden transition-all"
                />
              </div>
            </div>

            {/* Corporate Tax Identifiers (NTN & STRN) */}
            {type === 'company' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    NTN Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3349120-7"
                    value={ntn}
                    onChange={(e) => setNtn(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-hidden transition-all placeholder:text-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    STRN / Sales Tax Reg # (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 17-00-3349-120-19"
                    value={strn}
                    onChange={(e) => setStrn(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-hidden transition-all placeholder:text-slate-400 font-mono"
                  />
                </div>
              </>
            )}

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Physical Address / Workshop / Plant Location
              </label>
              <input
                type="text"
                placeholder="e.g. Plot 45, Industrial Estate, Samundri Road, Faisalabad"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-hidden transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Notes / Contract Details
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Major civil infrastructure client, fleet of excavators and Perkins generators"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-red-500 focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-hidden transition-all placeholder:text-slate-400 resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
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
              <span>{customer ? 'Update Profile' : (type === 'company' ? 'Save Company' : 'Save Customer')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
