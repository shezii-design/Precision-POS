import React, { useRef } from 'react';
import { 
  X, 
  Printer, 
  RotateCcw, 
  Building2, 
  User, 
  Calendar, 
  FileText, 
  CheckCircle2,
  PackageCheck,
  PackageMinus
} from 'lucide-react';
import { CustomerReturn, VendorReturn } from '../types';

interface ReturnVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnDoc: CustomerReturn | VendorReturn | null;
  returnType: 'customer' | 'vendor';
}

export const ReturnVoucherModal: React.FC<ReturnVoucherModalProps> = ({
  isOpen,
  onClose,
  returnDoc,
  returnType,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !returnDoc) return null;

  const isCustomerReturn = returnType === 'customer';
  const customerReturn = isCustomerReturn ? (returnDoc as CustomerReturn) : null;
  const vendorReturn = !isCustomerReturn ? (returnDoc as VendorReturn) : null;

  const title = isCustomerReturn 
    ? 'SALES RETURN & CREDIT NOTE' 
    : 'PURCHASE RETURN & DEBIT NOTE';

  const docNumber = returnDoc.returnNumber || returnDoc.id;
  const noteNumber = isCustomerReturn 
    ? customerReturn?.creditNoteNumber || 'CN-' + docNumber 
    : vendorReturn?.debitNoteNumber || 'DN-' + docNumber;

  const refNumber = isCustomerReturn ? customerReturn?.saleId : vendorReturn?.purchaseId;

  const partyName = isCustomerReturn 
    ? customerReturn?.customerName 
    : vendorReturn?.vendorName;

  const partyPhone = isCustomerReturn ? customerReturn?.customerPhone : undefined;

  const totalAmount = isCustomerReturn 
    ? customerReturn?.totalRefundAmount || customerReturn?.subtotal || 0 
    : vendorReturn?.totalAmount || 0;

  const subtotal = returnDoc.subtotal || totalAmount;
  const deduction = isCustomerReturn ? customerReturn?.deductionOrRestockFee || 0 : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Actions (Hidden during print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-red-500" />
            <span className="text-sm font-bold">
              {isCustomerReturn ? 'Customer Credit Note Preview' : 'Vendor Debit Note Preview'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Voucher</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-900" ref={printRef}>
          {/* Company Branding Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-lg">
                  P
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  Precision
                </h1>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Industrial & Automotive Filtration Specialist • Heavy Machinery Parts
              </p>
              <p className="text-[11px] text-slate-500">
                G.T. Road, Badami Bagh / I-9 Industrial Area, Pakistan • Ph: +92-42-37720000
              </p>
            </div>

            <div className="text-right">
              <span className={`inline-block px-3 py-1 text-xs font-black rounded-md tracking-wider uppercase ${
                isCustomerReturn ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {title}
              </span>
              <div className="mt-2 text-xs font-bold text-slate-800">
                Voucher #: <span className="font-mono">{docNumber}</span>
              </div>
              <div className="text-xs font-bold text-slate-800">
                {isCustomerReturn ? 'Credit Note #' : 'Debit Note #'}: <span className="font-mono text-red-700">{noteNumber}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Date: {new Date(returnDoc.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Party & Reference Meta */}
          <div className="my-5 p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-[10px] font-black uppercase text-slate-400">
                {isCustomerReturn ? 'Customer / Company Details' : 'Supplier / Vendor Details'}
              </div>
              <div className="text-sm font-black text-slate-900 mt-0.5">
                {partyName}
              </div>
              {partyPhone && (
                <div className="text-slate-600 font-medium mt-0.5">
                  Phone: {partyPhone}
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-[10px] font-black uppercase text-slate-400">
                Original Transaction Reference
              </div>
              <div className="text-xs font-bold text-slate-800 mt-0.5">
                {refNumber ? `Linked Ref: ${refNumber}` : 'Direct Return Voucher'}
              </div>
              <div className="text-slate-600 font-medium mt-0.5">
                Settlement: <span className="font-bold capitalize">{isCustomerReturn ? customerReturn?.refundMethod?.replace('_', ' ') : vendorReturn?.settlementMethod?.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl my-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black">
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3">Item Description & Part #</th>
                  <th className="py-2.5 px-3">Brand / Type</th>
                  <th className="py-2.5 px-3">Condition / Reason</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Rate (Rs.)</th>
                  <th className="py-2.5 px-3 text-right">Total (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returnDoc.items.map((item, index) => {
                  const rate = isCustomerReturn 
                    ? (item as any).returnRate || 0 
                    : (item as any).unitCost || 0;
                  const itemCondition = isCustomerReturn ? (item as any).condition : 'Vendor Return';
                  return (
                    <tr key={item.id || index} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-500">{index + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{item.productName}</div>
                        {item.internalId && (
                          <div className="text-[10px] font-mono text-slate-500">{item.internalId}</div>
                        )}
                        {item.notes && (
                          <div className="text-[10px] text-slate-400 italic mt-0.5">{item.notes}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {item.brandName || '-'} {item.typeName ? `• ${item.typeName}` : ''}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-[11px] font-semibold text-slate-700">{item.reason}</div>
                        {isCustomerReturn && (
                          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                            itemCondition === 'restock' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {itemCondition === 'restock' ? 'Restocked' : 'Damaged / Defective'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">
                        {item.quantity} {item.unit || 'Pcs'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                        {rate.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">
                        {item.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals & Financial Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 my-4">
            <div className="flex-1 text-xs text-slate-600 space-y-1">
              <div className="font-bold text-slate-800">Remarks & Terms:</div>
              <p className="text-[11px]">
                {returnDoc.notes || 'Goods received and inspected according to standard inspection protocol.'}
              </p>
              <p className="text-[10px] text-slate-400 pt-1">
                {isCustomerReturn 
                  ? 'This credit note adjusts the customer ledger balance or certifies cash counter reimbursement.'
                  : 'This debit note reduces the payable amount owed to the vendor for returned defective inventory.'}
              </p>
            </div>

            <div className="w-full sm:w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal:</span>
                <span className="font-bold text-slate-900">Rs. {subtotal.toLocaleString()}</span>
              </div>

              {deduction > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Handling / Restock Fee:</span>
                  <span className="font-bold">- Rs. {deduction.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t-2 border-slate-900">
                <span className="text-red-700">
                  {isCustomerReturn ? 'Net Credit / Refund:' : 'Debit Note Total:'}
                </span>
                <span className="text-base text-red-700">
                  Rs. {totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Authorization & Signatures */}
          <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="w-40 border-b border-slate-400 mx-auto mb-2" />
              <span className="font-bold text-slate-700">Prepared & Inspected By</span>
              <p className="text-[10px] text-slate-400">Inventory Store In-Charge</p>
            </div>

            <div>
              <div className="w-40 border-b border-slate-400 mx-auto mb-2" />
              <span className="font-bold text-slate-700">
                {isCustomerReturn ? 'Customer Signature' : 'Authorized Supplier Representative'}
              </span>
              <p className="text-[10px] text-slate-400">Receiver Acknowledgment</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
