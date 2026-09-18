import React, { useState, useEffect } from 'react';
import { 
  X, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Clock,
  CreditCard, 
  FileText, 
  Check, 
  Building2,
  AlertCircle
} from 'lucide-react';
import { Vendor, VendorLedgerEntry, LedgerEntryType, Sale, Purchase } from '../types';

interface CashEntryModalProps {
  sales?: Sale[];
  purchases?: Purchase[];
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
  sales = [],
  purchases = [],
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
  const [time, setTime] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque' | 'Online / Raast' | 'Other'>('Cash');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [targetPurchaseId, setTargetPurchaseId] = useState<string>('advance');
  const [targetSaleId, setTargetSaleId] = useState<string>('advance');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const currentDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      if (editingEntry) {
        setVendorId(editingEntry.vendorId);
        setEntryType(editingEntry.type === 'cash_received' ? 'cash_received' : 'cash_sent');
        setAmount(editingEntry.amount || editingEntry.debit || editingEntry.credit || '');
        setEntryCode(editingEntry.entryCode || (editingEntry.type === 'cash_received' ? 'Cash Recv' : 'Cash'));
        setBillNumber(editingEntry.billNumber || '');
        
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
        setReceiptNumber(editingEntry.receiptNumber || '');
        setDescription(editingEntry.description || '');
        setNotes(editingEntry.notes || '');
        setTargetPurchaseId(editingEntry.type === 'cash_sent' ? (editingEntry.referenceId || 'advance') : 'advance');
        setTargetSaleId(editingEntry.type === 'cash_received' ? (editingEntry.referenceId || 'advance') : 'advance');
      } else {
        setVendorId(selectedVendorId || (vendors[0]?.id || ''));
        setEntryType('cash_sent');
        setAmount('');
        setEntryCode('Cash');
        setBillNumber('');
        setDate(currentDateStr);
        setTime(currentTimeStr);
        setPaymentMethod('Cash');
        setReceiptNumber('');
        setDescription('');
        setNotes('');
        setTargetPurchaseId('advance');
        setTargetSaleId('advance');
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

    let finalBillNumber = billNumber.trim();
    let finalReferenceId: string | undefined = undefined;
    let autoDesc = '';

    if (entryType === 'cash_sent' && targetPurchaseId !== 'advance') {
      const selectedPurchase = purchases.find(p => p.id === targetPurchaseId);
      const billRef = selectedPurchase?.billNumber || targetPurchaseId;
      finalBillNumber = billRef;
      finalReferenceId = targetPurchaseId;
      autoDesc = `Cash payment sent for Bill #${billRef} (${targetPurchaseId})`;
    } else if (entryType === 'cash_sent' && targetPurchaseId === 'advance') {
      autoDesc = `Advance cash payment sent to vendor`;
    } else if (entryType === 'cash_received' && targetSaleId !== 'advance') {
      finalBillNumber = targetSaleId;
      finalReferenceId = targetSaleId;
      autoDesc = `Cash received for ${targetSaleId}`;
    } else if (entryType === 'cash_received' && targetSaleId === 'advance') {
      autoDesc = `Advance cash received from vendor`;
    } else {
      autoDesc = `Cash payment sent${finalBillNumber ? ` against bill #${finalBillNumber}` : ''}`;
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

    const newEntryData: Omit<VendorLedgerEntry, 'id' | 'createdAt'> = {
      vendorId,
      date: isoDateStr,
      type: entryType,
      entryCode: entryCode.trim() || (entryType === 'cash_sent' ? 'Cash' : 'Cash Recv'),
      billNumber: finalBillNumber || undefined,
      referenceId: finalReferenceId,
      description: description.trim() || autoDesc,
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

                    {/* Target Purchase / Advance Selector for Cash Sent */}
          {entryType === 'cash_sent' && vendorId && (
            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-amber-900 uppercase tracking-wide">
                  Against Purchase Bill / Invoice
                </label>
                <span className="text-[11px] text-amber-800 font-medium">
                  {purchases.filter(p => {
                    const matchesVendor = p.vendorId === vendorId || (selectedVendor && p.vendorName && p.vendorName.trim().toLowerCase() === (selectedVendor.businessName || selectedVendor.name || '').trim().toLowerCase());
                    const due = p.netBalanceDue ?? p.balanceDue ?? Math.max(0, (p.netAmount ?? p.totalAmount) - (p.amountPaid || 0));
                    return matchesVendor && (due > 0 || (editingEntry && editingEntry.referenceId === p.id));
                  }).length} Pending Bill(s)
                </span>
              </div>
              <select
                id="cash-entry-purchase-select"
                value={targetPurchaseId}
                onChange={(e) => {
                  const val = e.target.value;
                  setTargetPurchaseId(val);
                  if (val !== 'advance') {
                    const selPur = purchases.find(p => p.id === val);
                    if (selPur) {
                      setBillNumber(selPur.billNumber || selPur.id);
                      const due = selPur.netBalanceDue ?? selPur.balanceDue ?? Math.max(0, (selPur.netAmount ?? selPur.totalAmount) - (selPur.amountPaid || 0));
                      if (due > 0 && (!amount || Number(amount) === 0)) {
                        setAmount(due);
                      }
                    }
                  } else {
                    setBillNumber('');
                  }
                }}
                className="w-full px-3 py-2.5 bg-white border border-amber-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="advance">Advance Cash (No specific bill / On Account)</option>
                {purchases
                  .filter(p => {
                    const matchesVendor = p.vendorId === vendorId || (selectedVendor && p.vendorName && p.vendorName.trim().toLowerCase() === (selectedVendor.businessName || selectedVendor.name || '').trim().toLowerCase());
                    const due = p.netBalanceDue ?? p.balanceDue ?? Math.max(0, (p.netAmount ?? p.totalAmount) - (p.amountPaid || 0));
                    return matchesVendor && (due > 0 || (editingEntry && editingEntry.referenceId === p.id));
                  })
                  .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
                  .map(p => {
                    const due = p.netBalanceDue ?? p.balanceDue ?? Math.max(0, (p.netAmount ?? p.totalAmount) - (p.amountPaid || 0));
                    const billLabel = p.billNumber ? `Bill #${p.billNumber} (${p.id})` : p.id;
                    const dateStr = p.date ? new Date(p.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
                    return (
                      <option key={p.id} value={p.id}>
                        {billLabel} • Date: {dateStr} • Due: Rs. {due.toLocaleString()}{due <= 0 ? ' (Paid)' : ''}
                      </option>
                    );
                  })
                }
              </select>
              <p className="mt-1 text-[11px] text-amber-800">
                {targetPurchaseId === 'advance' 
                  ? 'Payment will be credited to vendor account as an advance/on-account payment.'
                  : 'Selecting a purchase bill will automatically link this payment and reduce its balance due.'}
              </p>
            </div>
          )}

          {/* Target Sale / Advance Selector for Cash Received */}
          {entryType === 'cash_received' && vendorId && (
            <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
              <label className="block text-xs font-semibold text-emerald-800 mb-1.5 uppercase tracking-wide">
                Against Sale / Invoice
              </label>
              <select
                id="cash-entry-sale-select"
                value={targetSaleId}
                onChange={(e) => {
                  const val = e.target.value;
                  setTargetSaleId(val);
                  if (val !== 'advance') {
                    const selSale = sales.find(s => s.id === val);
                    if (selSale) {
                      setBillNumber(selSale.id);
                      if (!amount || amount === '') {
                        if (selSale.balanceDue > 0) setAmount(selSale.balanceDue);
                      }
                    }
                  } else {
                    setBillNumber('');
                  }
                }}
                className="w-full px-3 py-2.5 bg-white border border-emerald-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="advance">Advance Cash (No specific invoice)</option>
                {sales
                  .filter(s => s.isVendorSale && s.vendorId === vendorId && s.paymentStatus !== 'paid')
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.id} (Date: {new Date(s.date).toLocaleDateString()}) - Due: Rs. {s.balanceDue.toLocaleString()}
                    </option>
                  ))
                }
              </select>
            </div>
          )}

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

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                Transaction Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="cash-entry-date-input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
                  required
                />
                <Calendar className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                Transaction Time (Order)
              </label>
              <div className="relative">
                <input
                  type="time"
                  id="cash-entry-time-input"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none"
                />
                <Clock className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
              </div>
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
