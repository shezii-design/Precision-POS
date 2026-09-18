import React, { useState, useEffect, useMemo } from 'react';
import { Customer, CustomerLedgerEntry, CustomerLedgerEntryType, Sale } from '../types';
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
  AlertCircle,
  Clock,
  Receipt
} from 'lucide-react';

interface CustomerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  sales?: Sale[];
  preselectedCustomer?: Customer | null;
  preselectedSaleId?: string;
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
  sales = [],
  preselectedCustomer,
  preselectedSaleId,
  editingEntry,
  onSavePayment,
}) => {
  const [entryType, setEntryType] = useState<CustomerLedgerEntryType>('payment_received');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [targetSaleId, setTargetSaleId] = useState<string>('advance');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque' | 'Online / Raast' | 'Other'>('Cash');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const currentDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      if (editingEntry) {
        setEntryType(editingEntry.type);
        setSelectedCustomerId(editingEntry.customerId);
        setTargetSaleId(editingEntry.referenceId || (editingEntry.billNumber && editingEntry.billNumber.startsWith('INV-') ? editingEntry.billNumber : 'advance'));
        setAmount(String(editingEntry.amount || editingEntry.credit || editingEntry.debit || ''));
        if (editingEntry.date) {
          const d = new Date(editingEntry.date);
          if (!isNaN(d.getTime())) {
            setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
            setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
          } else {
            setDate(currentDateStr);
            setTime(currentTimeStr);
          }
        } else {
          setDate(currentDateStr);
          setTime(currentTimeStr);
        }
        setPaymentMethod(editingEntry.paymentMethod || 'Cash');
        setReceiptNumber(editingEntry.receiptNumber || editingEntry.billNumber || '');
        setNotes(editingEntry.notes || editingEntry.description || '');
      } else {
        const custId = preselectedCustomer?.id || (customers[0]?.id || '');
        setEntryType('payment_received');
        setSelectedCustomerId(custId);
        
        // Check if a specific sale invoice is preselected
        if (preselectedSaleId) {
          setTargetSaleId(preselectedSaleId);
          const targetSale = sales.find(s => s.id === preselectedSaleId);
          if (targetSale) {
            const due = targetSale.netBalanceDue ?? targetSale.balanceDue ?? Math.max(0, (targetSale.netAmount ?? targetSale.totalAmount) - (targetSale.amountReceived || 0));
            setAmount(due > 0 ? String(due) : '');
            setReceiptNumber(targetSale.id);
            setNotes(`Payment received for Invoice #${targetSale.id}`);
          } else {
            setAmount('');
            setReceiptNumber('');
            setNotes('');
          }
        } else {
          setTargetSaleId('advance');
          setAmount('');
          setReceiptNumber('');
          setNotes('');
        }

        setDate(currentDateStr);
        setTime(currentTimeStr);
        setPaymentMethod('Cash');
      }
      setError('');
    }
  }, [isOpen, preselectedCustomer?.id, preselectedSaleId, editingEntry?.id]);

  if (!isOpen) return null;

  const currentCustomer = customers.find(c => c.id === selectedCustomerId);

  // Filter pending / open invoices for the selected customer
  const pendingCustomerSales = useMemo(() => {
    if (!selectedCustomerId) return [];
    const customerObj = customers.find(c => c.id === selectedCustomerId);
    const cNameLower = customerObj?.name?.trim().toLowerCase();

    return sales
      .filter(s => {
        const matchesCust = s.customerId === selectedCustomerId ||
          (cNameLower && s.customerName && s.customerName.trim().toLowerCase() === cNameLower);
        if (!matchesCust) return false;

        const due = s.netBalanceDue ?? s.balanceDue ?? Math.max(0, (s.netAmount ?? s.totalAmount) - (s.amountReceived || 0));
        return due > 0 || (editingEntry && editingEntry.referenceId === s.id) || (preselectedSaleId === s.id);
      })
      .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
  }, [sales, selectedCustomerId, customers, editingEntry, preselectedSaleId]);

  // Selected invoice object for live preview
  const selectedInvoice = useMemo(() => {
    if (targetSaleId === 'advance') return null;
    return sales.find(s => s.id === targetSaleId) || null;
  }, [sales, targetSaleId]);

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

    // Accurately compute ISO timestamp combining date and time
    let isoDateStr = '';
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      let hours = 12;
      let minutes = 0;
      let seconds = 0;
      if (time) {
        const [h, m] = time.split(':').map(Number);
        hours = isNaN(h) ? 12 : h;
        minutes = isNaN(m) ? 0 : m;
      } else {
        const now = new Date();
        hours = now.getHours();
        minutes = now.getMinutes();
        seconds = now.getSeconds();
      }
      const combinedDate = new Date(year, month - 1, day, hours, minutes, seconds);
      isoDateStr = isNaN(combinedDate.getTime()) ? new Date().toISOString() : combinedDate.toISOString();
    } else {
      isoDateStr = new Date().toISOString();
    }

    const isPayment = entryType === 'payment_received';
    const isTargetingInvoice = isPayment && targetSaleId !== 'advance';
    const finalBillNumber = isTargetingInvoice ? targetSaleId : (receiptNumber.trim() || undefined);
    const finalReceiptNumber = receiptNumber.trim() || (isTargetingInvoice ? targetSaleId : undefined);
    const finalReferenceId = isTargetingInvoice ? targetSaleId : undefined;

    const entryData: Omit<CustomerLedgerEntry, 'id' | 'createdAt'> = {
      customerId: selectedCustomerId,
      date: isoDateStr,
      type: entryType,
      entryCode: isPayment 
        ? (paymentMethod === 'Cash' ? (isTargetingInvoice ? `Cash (${targetSaleId})` : 'Cash Recv') : (isTargetingInvoice ? `${paymentMethod} (${targetSaleId})` : paymentMethod)) 
        : 'Cash Refund',
      billNumber: finalBillNumber,
      receiptNumber: finalReceiptNumber,
      referenceId: finalReferenceId,
      description: notes.trim() || (
        isPayment 
          ? (isTargetingInvoice ? `Payment received for Invoice #${targetSaleId} via ${paymentMethod}` : `Payment received via ${paymentMethod}`) 
          : `Cash refund given to customer`
      ),
      debit: isPayment ? 0 : numAmount,
      credit: isPayment ? numAmount : 0,
      amount: numAmount,
      paymentMethod,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
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
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200 rounded-2xl">
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
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  if (!editingEntry) {
                    setTargetSaleId('advance');
                    setAmount('');
                    setReceiptNumber('');
                    setNotes('');
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-200 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-hidden transition-all"
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

            {/* Target Sales Invoice / Advance Selector for Payment Received */}
            {entryType === 'payment_received' && selectedCustomerId && (
              <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                    Against Sales Invoice
                  </label>
                  <span className="text-[11px] text-emerald-800 font-bold">
                    {pendingCustomerSales.length} Pending Invoice(s)
                  </span>
                </div>
                <select
                  id="customer-payment-invoice-select"
                  value={targetSaleId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTargetSaleId(val);
                    if (val !== 'advance') {
                      const selSale = sales.find(s => s.id === val);
                      if (selSale) {
                        setReceiptNumber(selSale.id);
                        const due = selSale.netBalanceDue ?? selSale.balanceDue ?? Math.max(0, (selSale.netAmount ?? selSale.totalAmount) - (selSale.amountReceived || 0));
                        setAmount(due > 0 ? String(due) : '');
                        setNotes(`Payment received for Invoice #${selSale.id}`);
                      }
                    } else {
                      if (receiptNumber.startsWith('INV-') || receiptNumber === targetSaleId) {
                        setReceiptNumber('');
                      }
                      if (!notes || notes.startsWith('Payment received for Invoice #')) {
                        setNotes('');
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="advance">Advance Cash (No specific invoice / On Account)</option>
                  {pendingCustomerSales.map(s => {
                    const due = s.netBalanceDue ?? s.balanceDue ?? Math.max(0, (s.netAmount ?? s.totalAmount) - (s.amountReceived || 0));
                    const dateStr = s.date ? new Date(s.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
                    return (
                      <option key={s.id} value={s.id}>
                        Invoice #{s.id} • Date: {dateStr} • Total: Rs. {(s.netAmount ?? s.totalAmount).toLocaleString()} • Due: Rs. {due.toLocaleString()}{due <= 0 ? ' (Paid)' : ''}
                      </option>
                    );
                  })}
                </select>

                {/* Selected Invoice Details Live Summary Card */}
                {selectedInvoice ? (
                  <div className="mt-2.5 p-2.5 bg-emerald-100/70 border border-emerald-300/80 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-emerald-950">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-700" />
                        Invoice #{selectedInvoice.id}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-black bg-emerald-200 text-emerald-800">
                        {selectedInvoice.paymentStatus || 'Open'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-emerald-200 text-emerald-900">
                      <div>
                        <span className="block text-[10px] text-emerald-700 font-semibold">Total Bill:</span>
                        <span className="font-mono font-bold">₨ {(selectedInvoice.netAmount ?? selectedInvoice.totalAmount).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-emerald-700 font-semibold">Paid so far:</span>
                        <span className="font-mono font-bold">₨ {(selectedInvoice.amountReceived || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-emerald-700 font-semibold">Balance Due:</span>
                        <span className="font-mono font-black text-rose-700">₨ {(selectedInvoice.netBalanceDue ?? selectedInvoice.balanceDue ?? ((selectedInvoice.netAmount ?? selectedInvoice.totalAmount) - (selectedInvoice.amountReceived || 0))).toLocaleString()}</span>
                      </div>
                    </div>
                    {Number(amount) > 0 && (
                      <div className="text-[11px] pt-1 text-emerald-950 font-semibold flex items-center justify-between border-t border-emerald-200/60">
                        <span>Balance after this payment:</span>
                        <span className="font-mono font-black text-emerald-900">
                          ₨ {Math.max(0, (selectedInvoice.netBalanceDue ?? selectedInvoice.balanceDue ?? ((selectedInvoice.netAmount ?? selectedInvoice.totalAmount) - (selectedInvoice.amountReceived || 0))) - Number(amount)).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-emerald-800 font-medium">
                    Payment will be credited to customer account as an advance/on-account payment.
                  </p>
                )}
              </div>
            )}

            {/* Amount, Date & Time in responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-200 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-black text-slate-900 outline-hidden transition-all"
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
                  className="w-full px-3.5 py-2.5 bg-slate-200 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-hidden transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Time (Order)
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-200 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-hidden transition-all"
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
                  className="w-full px-3.5 py-2.5 bg-slate-200 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-hidden transition-all"
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
                  className="w-full px-3.5 py-2.5 bg-slate-200 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-hidden transition-all placeholder:text-slate-400"
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
                className="w-full px-3.5 py-2 bg-slate-200 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-hidden transition-all placeholder:text-slate-400 resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer"
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
