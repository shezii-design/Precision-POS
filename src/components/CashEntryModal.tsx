import React, { useState, useEffect } from 'react';
import { 
  X, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  CreditCard, 
  FileText, 
  Check, 
  Building2,
  AlertCircle
} from 'lucide-react';
import { Vendor, VendorLedgerEntry, LedgerEntryType } from '../types';

interface CashEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendors: Vendor[];
  selectedVendorId?: string;
  editingEntry?: VendorLedgerEntry | null;
  onSaveEntry: (entry: Omit<VendorLedgerEntry, 'id' | 'createdAt'>, entryId?: string) => void;
}

export const CashEntryModal: React.FC<CashEntryModalProps> = ({
  isOpen,
  onClose,
  vendors = [],
  selectedVendorId,
  editingEntry,
  onSaveEntry,
}) => {
  const [vendorId, setVendorId] = useState<string>(selectedVendorId || '');
  const [entryType, setEntryType] = useState<LedgerEntryType>('cash_sent');
  const [amount, setAmount] = useState<number | string>('');
  const [entryCode, setEntryCode] = useState<string>('Cash');
  const [billNumber, setBillNumber] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque' | 'Online / Raast' | 'Other'>('Cash');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (editingEntry) {
        setVendorId(editingEntry.vendorId);
        setEntryType(editingEntry.type === 'cash_received' ? 'cash_received' : 'cash_sent');
        setAmount(editingEntry.amount || editingEntry.debit || editingEntry.credit || '');
        setEntryCode(editingEntry.entryCode || (editingEntry.type === 'cash_received' ? 'Cash Recv' : 'Cash'));
        setBillNumber(editingEntry.billNumber || '');
        setDate(editingEntry.date ? editingEntry.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
        setPaymentMethod(editingEntry.paymentMethod || 'Cash');
        setReceiptNumber(editingEntry.receiptNumber || '');
        setDescription(editingEntry.description || '');
        setNotes(editingEntry.notes || '');
      } else {
        setVendorId(selectedVendorId || (vendors[0]?.id || ''));
        setEntryType('cash_sent');
        setAmount('');
        setEntryCode('Cash');
        setBillNumber('');
        setDate(new Date().toISOString().slice(0, 10));
        setPaymentMethod('Cash');
        setReceiptNumber('');
        setDescription('');
        setNotes('');
      }
      setError('');
    }
  }, [isOpen, editingEntry?.id, selectedVendorId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) {
      setError('Please select a vendor');
      return;
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    const defaultDesc = entryType === 'cash_sent' 
      ? `Cash payment sent${billNumber ? ` against bill #${billNumber}` : ''}`
      : `Cash received from vendor${billNumber ? ` for #${billNumber}` : ''}`;

    const newEntryData: Omit<VendorLedgerEntry, 'id' | 'createdAt'> = {
      vendorId,
      date: new Date(date || Date.now()).toISOString(),
      type: entryType,
      entryCode: entryCode.trim() || (entryType === 'cash_sent' ? 'Cash' : 'Cash Recv'),
      billNumber: billNumber.trim() || undefined,
      description: description.trim() || defaultDesc,
      debit: entryType === 'cash_sent' ? numAmount : 0,
      credit: entryType === 'cash_received' ? numAmount : 0,
      amount: numAmount,
      paymentMethod,
      receiptNumber: receiptNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    onSaveEntry(newEntryData, editingEntry?.id);
    onClose();
  };

  const selectedVendor = vendors.find(v => v.id === vendorId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="cash-entry-modal-card"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-neutral-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${entryType === 'cash_sent' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {entryType === 'cash_sent' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {editingEntry ? 'Edit Cash Ledger Entry' : 'Record Cash Payment / Receipt'}
              </h2>
              <p className="text-xs text-neutral-400">
                {entryType === 'cash_sent' ? 'Payment sent to vendor (Debit - Reduces what we owe)' : 'Payment received from vendor (Credit)'}
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

          {/* Entry Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="btn-entry-type-sent"
                onClick={() => {
                  setEntryType('cash_sent');
                  if (entryCode === 'Cash Recv') setEntryCode('Cash');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all ${
                  entryType === 'cash_sent'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-amber-600" />
                <span>Cash Sent (Payment)</span>
              </button>

              <button
                type="button"
                id="btn-entry-type-received"
                onClick={() => {
                  setEntryType('cash_received');
                  if (entryCode === 'Cash') setEntryCode('Cash Recv');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all ${
                  entryType === 'cash_received'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span>Cash Received</span>
              </button>
            </div>
          </div>

          {/* Vendor Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
              Vendor <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="cash-entry-vendor-select"
                value={vendorId}
                onChange={e => setVendorId(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
                required
              >
                <option value="" disabled>Select a Vendor...</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.businessName} ({v.contactPerson} - {v.city || 'Vendor'})
                  </option>
                ))}
              </select>
              <Building2 className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
            </div>
            {selectedVendor && (
              <p className="mt-1 text-xs text-neutral-500">
                Contact: <strong className="text-neutral-700">{selectedVendor.contactPerson}</strong> ({selectedVendor.phone})
              </p>
            )}
          </div>

          {/* Amount & Entry Code Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                Amount (PKR) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="cash-entry-amount-input"
                  min="1"
                  step="any"
                  placeholder="e.g. 50000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-base font-bold text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
                  required
                  autoFocus
                />
                <span className="absolute left-3 top-2.5 text-neutral-500 font-semibold text-sm">₨</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                Ledger Entry Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="cash-entry-code-input"
                placeholder="e.g. Cash, Cash Send"
                value={entryCode}
                onChange={e => setEntryCode(e.target.value)}
                className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-semibold text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
                required
              />
              <p className="mt-1 text-[11px] text-neutral-400">
                Shows in ledger (e.g. "Cash", "Cash Send", "Cash Recv")
              </p>
            </div>
          </div>

          {/* Date & Payment Method Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                Transaction Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="cash-entry-date-input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
                />
                <Calendar className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                Payment Method
              </label>
              <div className="relative">
                <select
                  id="cash-entry-method-select"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
                >
                  <option value="Cash">Cash Handover</option>
                  <option value="Bank Transfer">Bank Transfer (IBFT / HBL / Meezan)</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Online / Raast">Online / Raast</option>
                  <option value="Other">Other</option>
                </select>
                <CreditCard className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Bill # and Receipt / Voucher # */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                Bill / Invoice Reference (Optional)
              </label>
              <input
                type="text"
                id="cash-entry-bill-input"
                placeholder="e.g. SF-9842, INV-1001"
                value={billNumber}
                onChange={e => setBillNumber(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                Voucher / Receipt # (Optional)
              </label>
              <input
                type="text"
                id="cash-entry-receipt-input"
                placeholder="e.g. VOUCHER-084, TXN-998811"
                value={receiptNumber}
                onChange={e => setReceiptNumber(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Remarks / Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
              Remarks / Ledger Description
            </label>
            <div className="relative">
              <input
                type="text"
                id="cash-entry-desc-input"
                placeholder="e.g. Paid cash at shop counter against outstanding balance"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
              />
              <FileText className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
              Internal Notes (Optional)
            </label>
            <textarea
              rows={2}
              id="cash-entry-notes-input"
              placeholder="Any additional details or remarks..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              id="btn-cancel-cash-entry"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-submit-cash-entry"
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{editingEntry ? 'Update Ledger Entry' : 'Save to Ledger'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
