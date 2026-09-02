import React, { useRef } from 'react';
import { Quotation } from '../types';
import { formatPKR } from '../services/pricing';
import { 
  getQuotationDaysRemaining, 
  getQuotationEffectiveStatus 
} from '../services/storage';
import { 
  Printer, 
  X, 
  Calendar, 
  Clock, 
  Building2, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  ArrowRight, 
  Edit3, 
  Trash2, 
  FileText,
  ShieldAlert,
  Info
} from 'lucide-react';

interface QuotationViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
  onEdit?: (quotation: Quotation) => void;
  onDelete?: (quotationId: string) => void;
  onConvertToSale?: (quotation: Quotation) => void;
  onRenewValidity?: (quotationId: string, days?: number) => void;
}

// Convert numbers into standard English words for financial clarity
function numberToWordsPKR(num: number): string {
  if (num === 0) return 'Zero Rupees Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n: number): string {
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += a[n] + ' ';
    }
    return str.trim();
  }

  let result = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remaining = Math.floor(num);

  if (crore > 0) result += convertGroup(crore) + ' Crore ';
  if (lakh > 0) result += convertGroup(lakh) + ' Lakh ';
  if (thousand > 0) result += convertGroup(thousand) + ' Thousand ';
  if (remaining > 0) result += convertGroup(remaining) + ' ';

  return result.trim() + ' Rupees Only';
}

export const QuotationViewModal: React.FC<QuotationViewModalProps> = ({
  isOpen,
  onClose,
  quotation,
  onEdit,
  onDelete,
  onConvertToSale,
  onRenewValidity
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !quotation) return null;

  const effectiveStatus = getQuotationEffectiveStatus(quotation);
  const daysRemaining = getQuotationDaysRemaining(quotation);
  const isExpired = effectiveStatus === 'expired';
  const isConverted = effectiveStatus === 'converted';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto select-none">
      <div 
        id="quotation-view-modal-dialog"
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl my-auto overflow-hidden flex flex-col max-h-[94vh] select-text"
      >
        {/* TOP MODAL BAR (Hidden on Print) */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600/30 text-red-400 flex items-center justify-center border border-red-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-tight text-white font-mono">
                  {quotation.quotationNumber}
                </h2>
                {isExpired ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Expired (Valid 7 Days)
                  </span>
                ) : isConverted ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Converted to Sale
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Active ({daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">
                Official Commercial Quotation • Stock Not Deducted
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="quotation-print-btn"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* VALIDITY STATUS CALLOUT (Hidden on Print) */}
        {isExpired ? (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 gap-3 shrink-0 print:hidden">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Quotation Expired:</strong> The standard 7-day price validity period ended on <strong>{quotation.validUntil}</strong>. You can renew validity with current rates or convert as agreed.
              </span>
            </div>
            {onRenewValidity && (
              <button
                type="button"
                onClick={() => onRenewValidity(quotation.id, 7)}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-black text-[11px] shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Renew (+7 Days)</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between text-xs text-emerald-900 gap-3 shrink-0 print:hidden">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Active Quotation:</strong> Valid for <strong>{daysRemaining} more days</strong> until <strong>{quotation.validUntil}</strong>. Stock is intact.
              </span>
            </div>
            <span className="font-bold text-[11px] text-emerald-700 font-mono">
              Valid: 7 Days
            </span>
          </div>
        )}

        {/* PRINTABLE QUOTATION SHEET CONTENT */}
        <div ref={printAreaRef} className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-8 space-y-6 text-slate-800 bg-white">
          {/* LETTERHEAD / COMPANY HEADER */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-red-600 uppercase">
                    KHAWAJA FILTER HOUSE
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-700 mt-0.5">
                  Direct Importers & Stockists of Heavy Equipment, Commercial Vehicle & Industrial Filters
                </p>
                <p className="text-[11px] text-slate-500">
                  Sure Filter • Fleetguard • Baldwin • Donaldson • Mann Filter • Sakura OEM
                </p>
                <div className="text-[11px] text-slate-600 mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
                  <span><strong>Phone:</strong> 0300-1234567, 0321-7654321</span>
                  <span><strong>Email:</strong> info@khawajafilters.pk</span>
                  <span><strong>NTN:</strong> 3108942-7</span>
                  <span><strong>STRN:</strong> 07-02-3108-942-11</span>
                </div>
              </div>

              {/* Quotation Badge & Title */}
              <div className="text-left sm:text-right shrink-0">
                <div className="inline-block px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest mb-1.5">
                  Price Quotation / Estimate
                </div>
                <div className="font-mono text-base font-black text-slate-900">
                  {quotation.quotationNumber}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Date: <strong className="text-slate-800">{quotation.date}</strong>
                </div>
                <div className="text-xs font-bold text-red-700 mt-0.5">
                  Valid Until: <span>{quotation.validUntil}</span> (7 Days)
                </div>
              </div>
            </div>
          </div>

          {/* BILLED TO / CUSTOMER INFORMATION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Quotation Issued To:
              </span>
              <div className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                {quotation.customerType === 'company' ? <Building2 className="w-4 h-4 text-red-600" /> : <User className="w-4 h-4 text-red-600" />}
                <span>{quotation.customerName}</span>
              </div>
              {quotation.contactPerson && (
                <div className="text-slate-600 font-semibold">
                  Attn: {quotation.contactPerson}
                </div>
              )}
              {quotation.customerAddress && (
                <div className="text-slate-600">
                  {quotation.customerAddress}{quotation.customerCity ? `, ${quotation.customerCity}` : ''}
                </div>
              )}
              {quotation.customerPhone && (
                <div className="text-slate-600">
                  Phone: {quotation.customerPhone}
                </div>
              )}
              {quotation.customerEmail && (
                <div className="text-slate-600">
                  Email: {quotation.customerEmail}
                </div>
              )}
            </div>

            <div className="space-y-1 sm:text-right flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Commercial Tax Info:
                </span>
                {quotation.customerNtn ? (
                  <div className="text-slate-700 font-mono">
                    NTN: <strong>{quotation.customerNtn}</strong>
                  </div>
                ) : (
                  <div className="text-slate-400">NTN: Not Provided / Unregistered</div>
                )}
                {quotation.customerStrn && (
                  <div className="text-slate-700 font-mono">
                    STRN: <strong>{quotation.customerStrn}</strong>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Validity Period:
                </span>
                <span className="font-black text-xs text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-200 inline-block">
                  Strictly 7 Days from Issue Date
                </span>
              </div>
            </div>
          </div>

          {/* QUOTATION LINE ITEMS TABLE */}
          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Description / Filter Part Number</th>
                  <th className="py-2.5 px-3">Brand</th>
                  <th className="py-2.5 px-3 text-center w-20">Unit</th>
                  <th className="py-2.5 px-3 text-center w-20">Qty</th>
                  <th className="py-2.5 px-3 text-right w-28">Unit Rate (PKR)</th>
                  <th className="py-2.5 px-3 text-right w-32">Total Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {quotation.items.map((item, index) => (
                  <tr key={item.id || index} className="even:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-center font-bold text-slate-400 align-top">
                      {index + 1}
                    </td>
                    <td className="py-2.5 px-3 align-top">
                      <div className="font-black text-slate-900 flex items-center gap-1.5">
                        <span className="font-mono text-red-700 text-[11px]">{item.internalId}</span>
                        <span>{item.productName}</span>
                      </div>
                      {item.machineNames && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          <strong>App:</strong> {item.machineNames}
                        </div>
                      )}
                      {item.crossReferences && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          <strong>Ref:</strong> {item.crossReferences}
                        </div>
                      )}
                      {item.notes && (
                        <div className="text-[10px] text-amber-700 italic mt-0.5">
                          Note: {item.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 align-top font-semibold text-slate-700">
                      {item.brandName || '—'}
                    </td>
                    <td className="py-2.5 px-3 align-top text-center text-slate-600">
                      {item.unit}
                    </td>
                    <td className="py-2.5 px-3 align-top text-center font-black text-slate-900">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-3 align-top text-right font-mono font-bold text-slate-800">
                      ₨ {formatPKR(item.unitPrice)}
                    </td>
                    <td className="py-2.5 px-3 align-top text-right font-mono font-black text-slate-900">
                      ₨ {formatPKR(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FINANCIAL SUMMARY & AMOUNT IN WORDS */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            <div className="sm:col-span-7 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Amount in Words:
                </span>
                <span className="font-bold text-xs text-slate-900 italic">
                  {numberToWordsPKR(quotation.totalAmount)}
                </span>
              </div>

              {/* COMMERCIAL TERMS & CONDITIONS */}
              {quotation.termsAndConditions && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700 space-y-1">
                  <span className="font-black uppercase text-[10px] tracking-wider text-slate-500 block">
                    Terms & Conditions of Quotation:
                  </span>
                  <div className="whitespace-pre-line font-mono text-[10px] leading-relaxed text-slate-600">
                    {quotation.termsAndConditions}
                  </div>
                </div>
              )}
            </div>

            {/* Financial Summary Card */}
            <div className="sm:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal (Gross)</span>
                <span className="font-mono font-bold text-slate-900">₨ {formatPKR(quotation.subtotal)}</span>
              </div>

              {quotation.discountAmount > 0 && (
                <div className="flex items-center justify-between text-amber-700 font-semibold">
                  <span>Discount ({quotation.discountType === 'percentage' ? `${quotation.discountValue}%` : 'Special'})</span>
                  <span className="font-mono">-₨ {formatPKR(quotation.discountAmount)}</span>
                </div>
              )}

              {quotation.taxAmount && quotation.taxAmount > 0 && (
                <div className="flex items-center justify-between text-slate-600">
                  <span>Sales Tax / GST ({quotation.taxPercent}%)</span>
                  <span className="font-mono font-bold text-slate-900">+₨ {formatPKR(quotation.taxAmount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t-2 border-slate-900 text-sm font-black text-slate-900">
                <span>Total Amount (PKR)</span>
                <span className="font-mono text-base text-red-700">₨ {formatPKR(quotation.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* SIGNATURE & AUTH STAMPS */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-6 text-center text-xs text-slate-500">
            <div className="space-y-8">
              <div className="border-b border-slate-300 pb-1 font-semibold text-slate-800">
                Prepared By / Sales Desk
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Khawaja Filter House
              </span>
            </div>
            <div className="space-y-8">
              <div className="border-b border-slate-300 pb-1 font-semibold text-slate-800">
                Authorized Signatory & Stamp
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Commercial Dept.
              </span>
            </div>
            <div className="space-y-8 col-span-2 sm:col-span-1">
              <div className="border-b border-slate-300 pb-1 font-semibold text-slate-800">
                Customer Acceptance / PO
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Sign & Stamp on Acceptance
              </span>
            </div>
          </div>

          <div className="text-[9px] text-slate-400 text-center italic">
            * Note: This is an official price quotation with 7-day price validity. Inventory stock remains un-deducted until an official sales invoice is confirmed.
          </div>
        </div>

        {/* BOTTOM ACTION BAR (Hidden on Print) */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                id="delete-quotation-btn"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete quotation ${quotation.quotationNumber}?`)) {
                    onDelete(quotation.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                id="edit-quotation-btn"
                onClick={() => {
                  onEdit(quotation);
                  onClose();
                }}
                className="px-3 py-2 bg-white hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {onConvertToSale && (
              <button
                type="button"
                id="convert-quotation-to-sale-btn"
                onClick={() => {
                  onConvertToSale(quotation);
                  onClose();
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Convert to Official Sale Invoice</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
