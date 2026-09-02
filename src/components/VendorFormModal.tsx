import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  FileText, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { Vendor } from '../types';

interface VendorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingVendor?: Vendor | null;
  onSaveVendor: (vendor: Vendor) => void;
}

export const VendorFormModal: React.FC<VendorFormModalProps> = ({
  isOpen,
  onClose,
  editingVendor,
  onSaveVendor,
}) => {
  const [businessName, setBusinessName] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [secondaryPhone, setSecondaryPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState<number | string>(0);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (editingVendor) {
        setBusinessName(editingVendor.businessName || '');
        setContactPerson(editingVendor.contactPerson || '');
        setPhone(editingVendor.phone || '');
        setSecondaryPhone(editingVendor.secondaryPhone || '');
        setEmail(editingVendor.email || '');
        setCity(editingVendor.city || '');
        setAddress(editingVendor.address || '');
        setOpeningBalance(editingVendor.openingBalance || 0);
        setNotes(editingVendor.notes || '');
      } else {
        setBusinessName('');
        setContactPerson('');
        setPhone('');
        setSecondaryPhone('');
        setEmail('');
        setCity('');
        setAddress('');
        setOpeningBalance(0);
        setNotes('');
      }
      setError('');
    }
  }, [isOpen, editingVendor]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setError('Business Name is required');
      return;
    }
    if (!contactPerson.trim()) {
      setError('Contact Person Name is required');
      return;
    }
    if (!phone.trim()) {
      setError('Phone Number is required');
      return;
    }

    const numBalance = Number(openingBalance) || 0;

    const vendorToSave: Vendor = {
      id: editingVendor ? editingVendor.id : `vend-${Date.now()}`,
      businessName: businessName.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      secondaryPhone: secondaryPhone.trim() || undefined,
      email: email.trim() || undefined,
      city: city.trim() || undefined,
      address: address.trim() || undefined,
      openingBalance: numBalance,
      linkedProductIds: editingVendor ? (editingVendor.linkedProductIds || []) : [],
      notes: notes.trim() || undefined,
      createdAt: editingVendor ? editingVendor.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveVendor(vendorToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="vendor-form-modal-card"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-neutral-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {editingVendor ? 'Edit Vendor Profile' : 'Add New Vendor'}
              </h2>
              <p className="text-xs text-neutral-400">
                Manage supplier details, contact info, and initial balance
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-neutral-800 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Business Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
              Business / Supplier Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="vendor-business-name-input"
                placeholder="e.g. Indus Filter Importers & Co."
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-semibold text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
                required
                autoFocus
              />
              <Building2 className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Contact Person Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
              Contact Person Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="vendor-contact-person-input"
                placeholder="e.g. Tariq Mahmood"
                value={contactPerson}
                onChange={e => setContactPerson(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
                required
              />
              <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Primary Phone & Secondary Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                Primary Phone <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="vendor-phone-input"
                  placeholder="e.g. 0300-5551234"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
                  required
                />
                <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                Secondary / Landline Phone
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="vendor-secondary-phone-input"
                  placeholder="e.g. 042-37654321"
                  value={secondaryPhone}
                  onChange={e => setSecondaryPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
                />
                <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* City & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                City / Market
              </label>
              <input
                type="text"
                id="vendor-city-input"
                placeholder="e.g. Lahore, Karachi, Rawalpindi"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                Email Address (Optional)
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="vendor-email-input"
                  placeholder="e.g. supplier@example.pk"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
                />
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
              Shop / Warehouse Address
            </label>
            <div className="relative">
              <input
                type="text"
                id="vendor-address-input"
                placeholder="e.g. Shop #14, Auto Market, Badami Bagh"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
              />
              <MapPin className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Opening Balance (Initial Balance We Owe to Them) */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
              Initial Opening Balance (We Owe in PKR)
            </label>
            <div className="relative">
              <input
                type="number"
                id="vendor-opening-balance-input"
                min="0"
                step="any"
                placeholder="0"
                value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-bold text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
              />
              <span className="absolute left-3 top-2.5 text-neutral-500 font-semibold text-sm">₨</span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              Amount previously owed to this vendor before recording new purchases/cash
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
              Notes & Specialties (Optional)
            </label>
            <textarea
              rows={2}
              id="vendor-notes-input"
              placeholder="e.g. Authorized distributor for Donaldson & Fleetguard..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              id="btn-cancel-vendor-form"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-submit-vendor-form"
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{editingVendor ? 'Save Changes' : 'Create Vendor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
