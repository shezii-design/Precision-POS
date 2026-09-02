import React, { useRef, useMemo } from 'react';
import { CustomerReturn, Sale, SaleItem } from '../types';
import { formatPKR } from '../services/pricing';
import { formatItemInvoiceName } from '../services/sales';
import { isMatchingSaleId, isMatchingReturnItem } from '../services/storage';
import { 
  Printer, 
  Download, 
  X, 
  CheckCircle2, 
  Clock, 
  FileText, 
  User, 
  Phone, 
  MapPin, 
  Layers, 
  ShieldAlert,
  CreditCard,
  Banknote,
  Receipt,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  customerReturns?: CustomerReturn[];
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  sale,
  customerReturns = [],
}) => {
  const printContainerRef = useRef<HTMLDivElement | null>(null);

  // Derive linked returns from sale.returnsList or cross-reference customerReturns
  const linkedReturns = useMemo(() => {
    if (!sale) return [];
    if (sale.returnsList && sale.returnsList.length > 0) {
      return sale.returnsList;
    }
    if (customerReturns && customerReturns.length > 0) {
      return customerReturns
        .filter(r => isMatchingSaleId(sale, r.saleId))
        .map(r => ({
          returnId: r.id,
          returnNumber: r.returnNumber,
          creditNoteNumber: r.creditNoteNumber,
          date: r.date || r.createdAt,
          totalRefundAmount: Number(r.totalRefundAmount) || 0,
          refundMethod: r.refundMethod,
          itemsCount: r.items?.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0) || 0,
        }));
    }
    return [];
  }, [sale, customerReturns]);

  if (!isOpen || !sale) return null;

  // Calculate per-item return metrics
  const getItemMetrics = (it: SaleItem) => {
    let returnedQty = typeof it.returnedQuantity === 'number' ? it.returnedQuantity : 0;
    if (returnedQty === 0 && customerReturns && customerReturns.length > 0) {
      const relevantReturns = customerReturns.filter(r => isMatchingSaleId(sale, r.saleId));

      for (const ret of relevantReturns) {
        for (const rItem of ret.items || []) {
          if (isMatchingReturnItem(it, rItem)) {
            returnedQty += Number(rItem.quantity) || 0;
          }
        }
      }
    }

    const netQty = Math.max(0, it.quantity - returnedQty);
    const originalLineTotal = it.totalPrice || (it.quantity * it.unitPrice);
    const netLineTotal = netQty * it.unitPrice;

    return {
      returnedQty,
      netQty,
      originalLineTotal,
      netLineTotal,
      isFullyReturned: netQty === 0 && returnedQty > 0,
      isPartiallyReturned: netQty > 0 && returnedQty > 0,
    };
  };

  const totalReturnedAmount = typeof sale.totalReturnedAmount === 'number' && sale.totalReturnedAmount > 0
    ? sale.totalReturnedAmount
    : linkedReturns.reduce((sum, r) => sum + (Number(r.totalRefundAmount) || 0), 0);

  const hasReturns = (sale.hasReturns ?? false) || totalReturnedAmount > 0 || linkedReturns.length > 0;
  const netInvoiceAmount = hasReturns 
    ? Math.max(0, typeof sale.netAmount === 'number' ? sale.netAmount : (sale.totalAmount - totalReturnedAmount))
    : sale.totalAmount;

  const netBalanceDue = (sale.balanceDue > 0 || sale.paymentType === 'credit' || sale.paymentType === 'partial')
    ? Math.max(0, netInvoiceAmount - (Number(sale.amountReceived) || 0))
    : 0;

  const formattedDate = new Date(sale.date || sale.createdAt).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHTML = () => {
    if (!sale) return;
    const invoiceHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${sale.id} - ${sale.customerName}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #1e293b; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #dc2626; padding-bottom: 20px; margin-bottom: 20px; }
    .company { font-size: 24px; font-weight: 900; color: #dc2626; margin: 0; }
    .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    .meta { text-align: right; }
    .inv-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .cust-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }
    .return-alert-box { background: #fffbeb; border: 1px solid #fde68a; padding: 12px 15px; border-radius: 8px; margin-bottom: 20px; font-size: 12px; color: #92400e; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    th { background: #f1f5f9; color: #334155; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals { width: 340px; margin-left: auto; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; }
    .totals-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
    .grand-total { font-size: 16px; font-weight: 800; color: #dc2626; border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 8px; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    .badge-cash { background: #dcfce7; color: #15803d; }
    .badge-credit { background: #fee2e2; color: #b91c1c; }
    .badge-return { background: #fef3c7; color: #b45309; }
    .strike { text-decoration: line-through; color: #94a3b8; font-size: 11px; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="company">PRECISION PARTS & INVENTORY</h1>
      <div class="sub">Automotive Filters & Machinery Spare Parts | Pakistan</div>
    </div>
    <div class="meta">
      <h2 class="inv-title">INVOICE: ${sale.id}</h2>
      <div class="sub">Date: ${formattedDate}</div>
      <div class="sub">Payment: <span class="badge ${sale.paymentType === 'cash' ? 'badge-cash' : 'badge-credit'}">${sale.paymentType.toUpperCase()}</span></div>
      ${hasReturns ? `<div class="sub" style="margin-top:4px;"><span class="badge badge-return">⚠️ RETURN ADJUSTED</span></div>` : ''}
    </div>
  </div>

  <div class="cust-box">
    <strong>Billed To:</strong> ${sale.customerName}<br>
    ${sale.customerPhone ? `<strong>Phone:</strong> ${sale.customerPhone}<br>` : ''}
    ${sale.notes ? `<strong>Notes:</strong> ${sale.notes}` : ''}
  </div>

  ${hasReturns ? `
    <div class="return-alert-box">
      <strong>Notice of Return Adjustment:</strong> Customer return(s) have been processed against this invoice. Billed item quantities and financial net totals below reflect returned goods and credit adjustments.
      ${linkedReturns.map(lr => `<div style="margin-top:4px;">• Voucher: <strong>${lr.returnNumber}</strong> (${lr.creditNoteNumber ? `Credit Note: ${lr.creditNoteNumber}` : 'Credit Note'}) - Refund/Credit: <strong>${formatPKR(lr.totalRefundAmount)}</strong> via ${lr.refundMethod === 'customer_khata_credit' ? 'Customer Khata Credit' : 'Cash Refund'}</div>`).join('')}
    </div>
  ` : ''}

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item Description</th>
        <th>Brand</th>
        <th class="text-center">Orig Qty</th>
        ${hasReturns ? '<th class="text-center">Return / Net</th>' : '<th class="text-right">Qty</th>'}
        <th class="text-right">Rate (PKR)</th>
        <th class="text-right">Total (PKR)</th>
      </tr>
    </thead>
    <tbody>
      ${sale.items.map((it, idx) => {
        const metrics = getItemMetrics(it);
        return `
        <tr style="${metrics.isFullyReturned ? 'background-color: #fff1f2;' : ''}">
          <td>${idx + 1}</td>
          <td>
            <strong>${formatItemInvoiceName(it, sale.invoiceNamingPreference)}</strong>
            ${(it.locationName || it.cabinNumber) ? `<div style="font-size:11px;color:#1e40af;margin-top:2px;">📍 Location: <strong>${it.locationName || 'Main Shop'}</strong>${it.cabinNumber ? ` (Cabin: ${it.cabinNumber})` : ''}</div>` : ''}
            ${it.showDetailsOnInvoice && it.crossReferences ? `<div style="font-size:11px;color:#64748b;">Cross Ref: ${it.crossReferences.replace(/\n/g, ', ')}</div>` : ''}
            ${it.showDetailsOnInvoice && it.machineNames ? `<div style="font-size:11px;color:#64748b;">Machine: ${it.machineNames.replace(/\n/g, ', ')}</div>` : ''}
            ${metrics.returnedQty > 0 ? `<div style="font-size:11px;color:#b45309;font-weight:bold;margin-top:2px;">↳ Returned: -${metrics.returnedQty} ${it.unit} (${metrics.isFullyReturned ? 'Fully Returned' : 'Partial Return'})</div>` : ''}
          </td>
          <td>${it.brandName || '-'}</td>
          <td class="text-center">${it.quantity} ${it.unit}</td>
          ${hasReturns ? `
            <td class="text-center">
              ${metrics.returnedQty > 0 ? `<span style="color:#b45309;">-${metrics.returnedQty}</span> / ` : ''}
              <strong>${metrics.netQty} ${it.unit}</strong>
            </td>
          ` : ''}
          <td class="text-right">${formatPKR(it.unitPrice)}</td>
          <td class="text-right">
            ${metrics.returnedQty > 0 ? `<div class="strike">${formatPKR(metrics.originalLineTotal)}</div>` : ''}
            <strong>${formatPKR(metrics.netLineTotal)}</strong>
          </td>
        </tr>
      `}).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>Original Subtotal:</span><span>${formatPKR(sale.subtotal)}</span></div>
    ${sale.discountAmount > 0 ? `<div class="totals-row"><span>Discount (${sale.discountType === 'percentage' ? `${sale.discountValue}%` : 'PKR'}):</span><span>-${formatPKR(sale.discountAmount)}</span></div>` : ''}
    <div class="totals-row"><span>Original Billed Amount:</span><span>${formatPKR(sale.totalAmount)}</span></div>
    ${hasReturns ? `
      <div class="totals-row" style="color:#b45309;font-weight:bold;border-top:1px solid #e2e8f0;padding-top:6px;margin-top:6px;">
        <span>Less Returns & Credit Note:</span>
        <span>-${formatPKR(totalReturnedAmount)}</span>
      </div>
      <div class="totals-row grand-total">
        <span>Net Adjusted Total:</span>
        <span>${formatPKR(netInvoiceAmount)}</span>
      </div>
    ` : `
      <div class="totals-row grand-total"><span>Total Amount:</span><span>${formatPKR(sale.totalAmount)}</span></div>
    `}
    <div class="totals-row" style="margin-top:8px;"><span>Amount Received:</span><span>${formatPKR(sale.amountReceived)}</span></div>
    ${netBalanceDue > 0 ? `<div class="totals-row" style="color:#dc2626;font-weight:bold;"><span>Balance Due (Credit):</span><span>${formatPKR(netBalanceDue)}</span></div>` : ''}
    ${sale.changeGiven > 0 ? `<div class="totals-row" style="color:#16a34a;font-weight:bold;"><span>Change Returned:</span><span>${formatPKR(sale.changeGiven)}</span></div>` : ''}
  </div>

  <div class="footer">
    Thank you for your business! | Precision Inventory Management System
  </div>
</body>
</html>`;

    const blob = new Blob([invoiceHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${sale.id}_${sale.customerName.replace(/\s+/g, '_')}${hasReturns ? '_ReturnAdjusted' : ''}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Action Bar (Hidden on Print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-xs">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black tracking-tight text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="truncate">Sale Invoice {sale.id}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  sale.paymentType === 'cash' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  {sale.paymentType === 'cash' ? 'Cash Paid' : 'Credit / Pending'}
                </span>
                {hasReturns && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Return Adjusted</span>
                  </span>
                )}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                Created on {formattedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 sm:px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Print Invoice"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadHTML}
              className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              title="Download HTML Invoice Document"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer ml-0.5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div ref={printContainerRef} className="p-4 sm:p-8 space-y-5 sm:space-y-6 max-h-[80vh] overflow-y-auto print:max-h-none print:p-0 print:overflow-visible">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-red-600 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-600 inline-block"></span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  PRECISION INVENTORY
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Automotive Filters & Precision Machinery Spares
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Pakistan • PKR Currency Official Sales Receipt
              </p>
            </div>

            <div className="sm:text-right">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 font-mono text-sm font-black text-slate-800 border border-slate-200">
                <FileText className="w-4 h-4 text-red-600" />
                <span>{sale.id}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1.5">
                <strong>Date:</strong> {formattedDate}
              </div>
              <div className="text-xs text-slate-500">
                <strong>Item Display Mode:</strong>{' '}
                <span className="capitalize font-semibold text-slate-700">
                  {sale.invoiceNamingPreference === 'both' ? 'Part Name & Internal ID' : sale.invoiceNamingPreference.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Customer & Payment Badge Block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">
                Customer Information
              </span>
              <div className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                <User className="w-4 h-4 text-red-600 shrink-0" />
                <span>{sale.customerName}</span>
              </div>
              {sale.customerPhone && (
                <div className="flex items-center gap-1.5 text-slate-600 mt-1 font-medium">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{sale.customerPhone}</span>
                </div>
              )}
            </div>

            <div className="sm:text-right flex flex-col sm:items-end justify-center">
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">
                Payment Status
              </span>
              <div className="flex items-center gap-2">
                {sale.amountReceived >= sale.totalAmount && sale.totalAmount > 0 ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <Banknote className="w-3.5 h-3.5" />
                    <span>CASH SALE (PAID)</span>
                  </span>
                ) : sale.amountReceived > 0 && sale.amountReceived < sale.totalAmount ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>SEMI-PAID INVOICE</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-300">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>CREDIT SALE</span>
                  </span>
                )}
              </div>
              {netBalanceDue > 0 ? (
                <span className="text-red-600 font-bold text-xs mt-1">
                  Pending Balance: {formatPKR(netBalanceDue)}
                </span>
              ) : hasReturns ? (
                <span className="text-emerald-700 font-bold text-[11px] mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Returns Reconciled</span>
                </span>
              ) : null}
            </div>
          </div>

          {/* Return Notice Banner (If Sale has Linked Returns) */}
          {hasReturns && (
            <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-black">
                <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Sales Return & Credit Adjustments Active</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-bold ml-auto">
                  -{formatPKR(totalReturnedAmount)} Credited
                </span>
              </div>
              <p className="text-amber-800 leading-relaxed text-[11px]">
                Items returned against this invoice have been deducted from line quantities. The invoice net total has been adjusted accordingly.
              </p>
              {linkedReturns.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-amber-200/60">
                  {linkedReturns.map((lr) => (
                    <div key={lr.returnId} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-300/80 rounded-xl text-[11px] text-amber-900 font-semibold shadow-2xs">
                      <span className="font-mono font-bold text-amber-700">{lr.returnNumber}</span>
                      {lr.creditNoteNumber && <span className="text-slate-500 font-mono text-[10px]">({lr.creditNoteNumber})</span>}
                      <span>• {formatPKR(lr.totalRefundAmount)}</span>
                      <span className="text-[10px] text-slate-500">({lr.refundMethod === 'customer_khata_credit' ? 'Khata Credit' : 'Cash Refund'})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs border-collapse">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3.5 w-10">#</th>
                    <th className="py-3 px-3.5">Item Description</th>
                    <th className="py-3 px-3.5">Brand</th>
                    <th className="py-3 px-3.5 text-center w-20">Orig Qty</th>
                    {hasReturns && <th className="py-3 px-3.5 text-center w-24">Net Billed</th>}
                    <th className="py-3 px-3.5 text-right w-28">Rate (PKR)</th>
                    <th className="py-3 px-3.5 text-right w-32">Total (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {sale.items.map((item, index) => {
                  const displayName = formatItemInvoiceName(item, sale.invoiceNamingPreference);
                  const metrics = getItemMetrics(item);

                  return (
                    <tr key={item.id || index} className={`hover:bg-slate-50/60 transition-colors ${metrics.isFullyReturned ? 'bg-amber-50/40' : ''}`}>
                      <td className="py-3 px-3.5 font-bold text-slate-400">{index + 1}</td>
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 text-sm">
                          {displayName}
                        </div>
                        {item.typeName && (
                          <div className="text-[11px] text-slate-500 font-medium">
                            Type: {item.typeName}
                          </div>
                        )}
                        {(item.locationName || item.cabinNumber) && (
                          <div className="text-[11px] text-blue-700 font-semibold flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                            <span>Loc: <strong>{item.locationName || 'Main Shop'}</strong></span>
                            {item.cabinNumber && (
                              <span className="bg-blue-100/90 text-blue-900 font-mono px-1 rounded text-[10px]">
                                Cabin: {item.cabinNumber}
                              </span>
                            )}
                          </div>
                        )}
                        {/* Cross References & Machine info if enabled */}
                        {item.showDetailsOnInvoice && (
                          <div className="mt-1 space-y-0.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200/60 text-[11px]">
                            {item.crossReferences && (
                              <div className="text-slate-600">
                                <strong className="text-slate-700">Cross Ref:</strong> {item.crossReferences.replace(/\n/g, ', ')}
                              </div>
                            )}
                            {item.machineNames && (
                              <div className="text-slate-600">
                                <strong className="text-slate-700">Machine:</strong> {item.machineNames.replace(/\n/g, ', ')}
                              </div>
                            )}
                          </div>
                        )}
                        {/* Return Badge indicator */}
                        {metrics.returnedQty > 0 && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300/70">
                            <RotateCcw className="w-2.5 h-2.5 text-amber-700" />
                            <span>Returned: -{metrics.returnedQty} {item.unit} ({metrics.isFullyReturned ? 'Fully Returned' : 'Partial'})</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-slate-700 font-semibold">
                        {item.brandName || '-'}
                      </td>
                      <td className="py-3 px-3.5 text-center font-bold text-slate-700">
                        {item.quantity} <span className="text-[10px] text-slate-400 font-normal">{item.unit}</span>
                      </td>
                      {hasReturns && (
                        <td className="py-3 px-3.5 text-center font-black">
                          {metrics.isFullyReturned ? (
                            <span className="text-slate-400 line-through">0 {item.unit}</span>
                          ) : (
                            <span className="text-emerald-700">{metrics.netQty} {item.unit}</span>
                          )}
                        </td>
                      )}
                      <td className="py-3 px-3.5 text-right font-medium text-slate-700">
                        {formatPKR(item.unitPrice)}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        {metrics.returnedQty > 0 ? (
                          <div>
                            <div className="text-[11px] text-slate-400 line-through">
                              {formatPKR(metrics.originalLineTotal)}
                            </div>
                            <div className="font-black text-slate-900 text-sm">
                              {formatPKR(metrics.netLineTotal)}
                            </div>
                          </div>
                        ) : (
                          <div className="font-black text-slate-900 text-sm">
                            {formatPKR(item.totalPrice)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>

          {/* Bottom Financial Summary & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            {/* Notes Section */}
            <div className="space-y-3">
              {sale.notes ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">
                    Invoice Remarks / Notes
                  </span>
                  <p className="text-slate-700 whitespace-pre-line font-medium leading-relaxed">
                    {sale.notes}
                  </p>
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 rounded-2xl p-4 text-center text-slate-400 text-xs">
                  No additional remarks on this invoice
                </div>
              )}

              <div className="text-[11px] text-slate-400 space-y-1">
                <p>• Goods once sold are subject to store return policy within 7 days.</p>
                <p>• Retain this receipt for any warranty or exchange inquiries.</p>
                {hasReturns && (
                  <p className="text-amber-600 font-semibold">• Return Credit Note processed and synced with customer account.</p>
                )}
              </div>
            </div>

            {/* Calculations Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2.5 shadow-2xs">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-semibold">Subtotal:</span>
                <span className="font-bold text-slate-800">{formatPKR(sale.subtotal)}</span>
              </div>

              {sale.discountAmount > 0 && (
                <div className="flex justify-between items-center text-emerald-700 font-semibold">
                  <span>
                    Discount {sale.discountType === 'percentage' ? `(${sale.discountValue}%)` : '(Fixed PKR)'}:
                  </span>
                  <span className="font-bold">-{formatPKR(sale.discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-600">
                <span>Original Billed Amount:</span>
                <span className="font-bold text-slate-800">{formatPKR(sale.totalAmount)}</span>
              </div>

              {hasReturns && (
                <div className="flex justify-between items-center p-2 rounded-xl bg-amber-100/80 border border-amber-200 text-amber-900 font-bold">
                  <span className="flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                    <span>Less Sales Returns:</span>
                  </span>
                  <span>-{formatPKR(totalReturnedAmount)}</span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-slate-900 font-black text-base">
                <span>{hasReturns ? 'Net Adjusted Total:' : 'Total Amount:'}</span>
                <span className="text-red-700">{formatPKR(netInvoiceAmount)}</span>
              </div>

              <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-slate-700">
                <span className="font-medium">Amount Received:</span>
                <span className="font-bold text-slate-900">{formatPKR(sale.amountReceived)}</span>
              </div>

              {netBalanceDue > 0 && (
                <div className="flex justify-between items-center p-2 rounded-xl bg-red-100/70 border border-red-200 text-red-800 font-bold">
                  <span>Balance Due (Credit):</span>
                  <span>{formatPKR(netBalanceDue)}</span>
                </div>
              )}

              {sale.changeGiven > 0 && !hasReturns && (
                <div className="flex justify-between items-center p-2 rounded-xl bg-emerald-100/70 border border-emerald-200 text-emerald-800 font-bold">
                  <span>Change Returned:</span>
                  <span>{formatPKR(sale.changeGiven)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Signature line for print */}
          <div className="hidden print:flex justify-between pt-12 text-xs text-slate-600 border-t border-slate-300">
            <div className="text-center w-48">
              <div className="border-t border-slate-400 pt-1">Customer Signature</div>
            </div>
            <div className="text-center w-48">
              <div className="border-t border-slate-400 pt-1">Authorized Cashier Stamp</div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer (Hidden on Print) */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex justify-end gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

