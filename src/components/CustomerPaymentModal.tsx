import React, { useState, useEffect } from 'react';
import { Customer, CustomerLedgerEntry, CustomerLedgerEntryType } from '../types';
import { formatPKR } from '../services/pricing';
import { 
  X, 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  User, 
  Calendar, 
  CreditCard, 
  Hash, 
  FileText, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface CustomerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  preselectedCustomer?: Customer | null;
  editingEntry?: CustomerLedgerEntry | null;
  onSavePayment: (
    entryData: Omit<CustomerLedgerEntry, 'id' | 'createdAt'>,
    entryId?: string
  ) => void;
}

export const CustomerPaymentModal: React.FC<CustomerPaymentModalProps> = ({
  isOpen,
  onClose,
  customers = [],
  preselectedCustomer,
  editingEntry,
  onSavePayment,
}) => {
  const [entryType, setEntryType] = useState<CustomerLedgerEntryType>('payment_received');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque' | 'Online / Raast' | 'Other'>('Cash');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (editingEntry) {
        setEntryType(editingEntry.type);
        setSelectedCustomerId(editingEntry.customerId);
        setAmount(String(editingEntry.amount || editingEntry.credit || editingEntry.debit || ''));
        setDate(editingEntry.date ? editingEntry.date.split('T')[0] : new Date().toISOString().split('T')[0]);
        setPaymentMethod(editingEntry.paymentMethod || 'Cash');
        setReceiptNumber(editingEntry.receiptNumber || editingEntry.billNumber || '');
        setNotes(editingEntry.notes || editingEntry.description || '');
      } else {
        setEntryType('payment_received');
        setSelectedCustomerId(preselectedCustomer?.id || (customers[0]?.id || ''));
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setPaymentMethod('Cash');
        setReceiptNumber('');
        setNotes('');
      }
      setError('');
    }
  }, [isOpen, preselectedCustomer?.id, editingEntry?.id]);

  if (!isOpen) return null;

  const currentCustomer = customers.find(c => c.id === selectedCustomerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setError('Please select a customer or company.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive payment amount in PKR.');
      return;
    }

    const isPayment = entryType === 'payment_received';
    const entryData: Omit<CustomerLedgerEntry, 'id' | 'createdAt'> = {
      customerId: selectedCustomerId,
      date: new Date(date || Date.now()).toISOString(),
      type: entryType,
      entryCode: isPayment ? (paymentMethod === 'Cash' ? 'Cash Recv' : paymentMethod) : 'Cash Refund',
      billNumber: receiptNumber.trim() || undefined,
      receiptNumber: receiptNumber.trim() || undefined,
      description: notes.trim() || (isPayment ? `Payment received via ${paymentMethod}` : `Cash refund given to customer`),
      debit: isPayment ? 0 : numAmount,
      credit: isPayment ? numAmount : 0,
      amount: numAmount,
      paymentMethod,
      notes: notes.trim() || undefined,
    };

    onSavePayment(entryData, editingEntry?.id);
    onClose();
  };

  return (
    <div 
      id="customer-payment-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header Banner */}
        <div className={`px-6 py-5 flex items-center justify-between text-white ${
          entryType === 'payment_received' 
            ? 'bg-gradient-to-r from-emerald-600 to-teal-700' 
            : 'bg-gradient-to-r from-amber-600 to-orange-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-white shadow-inner">
              {entryType === 'payment_received' ? <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" /> : <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />}
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">
                {editingEntry 
                  ? (entryType === 'payment_received' ? 'Edit Payment Received' : 'Edit Cash Refund')
                  : (entryType === 'payment_received' ? 'Receive Customer Payment' : 'Issue Cash Refund')}
              </h2>
              <p className="text-xs text-white/80 font-medium">
                {entryType === 'payment_received' 
                  ? 'Record cash, cheque or bank transfer from customer into Khata' 
                  : 'Record money refunded to customer'}
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

        {/* Transaction Type Toggle */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setEntryType('payment_received')}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                entryType === 'payment_received'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Payment Received (Cash In)</span>
            </button>
            <button
              type="button"
              onClick={() => setEntryType('cash_refund')}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                entryType === 'cash_refund'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Cash Refund (Cash Out)</span>
            </button>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  Customer or Company <span className="text-red-500">*</span>
                </span>
                {currentCustomer && (
                  <span className="text-[11px] font-semibold text-slate-500">
                    {currentCustomer.type === 'company' ? '🏢 Corporate Company' : '👤 Customer'}
                  </span>
                )}
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-hidden transition-all"
                required
              >
                <option value="" disabled>Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} {c.type === 'company' ? '[Company]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount & Date in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  Amount (PKR) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    ₨
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-black text-slate-900 outline-hidden transition-all"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-hidden transition-all"
                  required
                />
              </div>
            </div>

            {/* Payment Method & Slip / Cheque No */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-hidden transition-all"
                >
                  <option value="Cash">Cash at Counter</option>
                  <option value="Bank Transfer">Bank Transfer / Online</option>
                  <option value="Online / Raast">Raast / Instant Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-500" />
                  Receipt / Ref / Cheque # (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. RCP-1029 / HBL-991"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-hidden transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Description / Remarks */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Remarks / Description (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Payment for Excavator filter service invoice #INV-1002"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-hidden transition-all placeholder:text-slate-400 resize-none"
              />
            </div>

            {/* Footer Buttons */}
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
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                  entryType === 'payment_received'
                    ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                    : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingEntry ? 'Update Entry' : (entryType === 'payment_received' ? 'Save Payment (Cash In)' : 'Save Refund')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
