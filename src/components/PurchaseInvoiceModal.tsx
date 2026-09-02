import React, { useRef, useMemo } from 'react';
import { Purchase, PurchaseItem, Vendor, VendorReturn } from '../types';
import { formatPKR } from '../services/pricing';
import { isMatchingPurchaseId, isMatchingReturnItem } from '../services/storage';
import { 
  Printer, 
  Download, 
  X, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Building2, 
  Phone, 
  MapPin, 
  Layers, 
  ShieldAlert,
  CreditCard,
  Banknote,
  ShoppingBag,
  PackageCheck,
  RotateCcw
} from 'lucide-react';

interface PurchaseInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
  vendor?: Vendor | null;
  vendorReturns?: VendorReturn[];
}

export const PurchaseInvoiceModal: React.FC<PurchaseInvoiceModalProps> = ({
  isOpen,
  onClose,
  purchase,
  vendor,
  vendorReturns = [],
}) => {
  const printContainerRef = useRef<HTMLDivElement | null>(null);

  // Derive linked vendor returns / debit notes
  const linkedReturns = useMemo(() => {
    if (!purchase) return [];
    if (purchase.returnsList && purchase.returnsList.length > 0) {
      return purchase.returnsList;
    }
    if (vendorReturns && vendorReturns.length > 0) {
      return vendorReturns
        .filter(r => isMatchingPurchaseId(purchase, r.purchaseId, r.billNumber))
        .map(r => ({
          returnId: r.id,
          returnNumber: r.returnNumber,
          debitNoteNumber: r.debitNoteNumber,
          date: r.date || r.createdAt,
          totalAmount: Number(r.totalAmount) || 0,
          settlementMethod: r.settlementMethod,
          itemsCount: r.items?.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0) || 0,
        }));
    }
    return [];
  }, [purchase, vendorReturns]);

  if (!isOpen || !purchase) return null;

  // Calculate per-item return metrics
  const getItemMetrics = (it: PurchaseItem) => {
    let returnedQty = typeof it.returnedQuantity === 'number' ? it.returnedQuantity : 0;
    if (returnedQty === 0 && vendorReturns && vendorReturns.length > 0) {
      const relevantReturns = vendorReturns.filter(r => isMatchingPurchaseId(purchase, r.purchaseId, r.billNumber));

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

  const totalReturnedAmount = typeof purchase.totalReturnedAmount === 'number' && purchase.totalReturnedAmount > 0
    ? purchase.totalReturnedAmount
    : linkedReturns.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);

  const hasReturns = (purchase.hasReturns ?? false) || totalReturnedAmount > 0 || linkedReturns.length > 0;
  const netBillAmount = hasReturns 
    ? Math.max(0, typeof purchase.netAmount === 'number' ? purchase.netAmount : (purchase.totalAmount - totalReturnedAmount))
    : purchase.totalAmount;

  const netBalanceDue = (purchase.balanceDue > 0 || purchase.paymentStatus === 'unpaid' || purchase.paymentStatus === 'partial')
    ? Math.max(0, netBillAmount - (Number(purchase.amountPaid) || 0))
    : 0;

  const formattedDate = new Date(purchase.date || purchase.createdAt).toLocaleDateString('en-PK', {
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
    if (!purchase) return;
    const invoiceHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Purchase Bill ${purchase.billNumber || purchase.id} - ${purchase.vendorName}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #1e293b; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #d97706; padding-bottom: 20px; margin-bottom: 20px; }
    .company { font-size: 24px; font-weight: 900; color: #d97706; margin: 0; }
    .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    .meta { text-align: right; }
    .inv-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .vendor-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }
    .return-alert-box { background: #fffbeb; border: 1px solid #fde68a; padding: 12px 15px; border-radius: 8px; margin-bottom: 20px; font-size: 12px; color: #92400e; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    th { background: #f1f5f9; color: #334155; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals { width: 340px; margin-left: auto; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; }
    .totals-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
    .grand-total { font-size: 16px; font-weight: 800; color: #d97706; border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 8px; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    .badge-paid { background: #dcfce7; color: #15803d; }
    .badge-partial { background: #fef3c7; color: #b45309; }
    .badge-unpaid { background: #fee2e2; color: #b91c1c; }
    .strike { text-decoration: line-through; color: #94a3b8; font-size: 11px; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="company">PRECISION PARTS & INVENTORY</h1>
      <div class="sub">Goods Received Note & Purchase Bill Record | Pakistan</div>
    </div>
    <div class="meta">
      <h2 class="inv-title">PURCHASE BILL: ${purchase.billNumber || purchase.id}</h2>
      <div class="sub">Date: ${formattedDate}</div>
      <div class="sub">Status: <span class="badge badge-${purchase.paymentStatus}">${purchase.paymentStatus.toUpperCase()}</span></div>
      ${hasReturns ? `<div class="sub" style="margin-top:4px;"><span class="badge badge-partial">⚠️ DEBIT NOTE ADJUSTED</span></div>` : ''}
    </div>
  </div>

  <div class="vendor-box">
    <div style="display: flex; justify-content: space-between;">
      <div>
        <strong>Vendor / Supplier:</strong> ${purchase.vendorName}<br>
        ${purchase.poNumber ? `<strong>PO Reference:</strong> #${purchase.poNumber}${purchase.biltyNumber ? ` &nbsp;|&nbsp; <strong>Bilty / Tracking:</strong> ${purchase.biltyNumber}` : ''}${purchase.transporterName ? ` &nbsp;|&nbsp; <strong>Transporter:</strong> ${purchase.transporterName}` : ''}<br>` : ''}
        ${purchase.notes ? `<strong>Notes:</strong> ${purchase.notes}` : ''}
      </div>
      ${purchase.cargoCost && purchase.cargoCost > 0 ? `
        <div style="text-align: right; font-size: 11px; color: #92400e;">
          <strong>Cargo Freight Allocated:</strong> ₨ ${purchase.cargoCost.toLocaleString()}
        </div>
      ` : ''}
    </div>
  </div>

  ${hasReturns ? `
    <div class="return-alert-box">
      <strong>Debit Note Adjustment Active:</strong> Goods returned to vendor against this bill have been deducted.
      ${linkedReturns.map(lr => `<div style="margin-top:4px;">• Voucher: <strong>${lr.returnNumber}</strong> (${lr.debitNoteNumber ? `Debit Note: ${lr.debitNoteNumber}` : 'Debit Note'}) - Amount: <strong>${formatPKR(lr.totalAmount)}</strong></div>`).join('')}
    </div>
  ` : ''}

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item Description</th>
        <th>Part Number</th>
        <th class="text-center">Orig Qty</th>
        ${hasReturns ? '<th class="text-center">Net Qty</th>' : ''}
        <th class="text-right">Buying Rate (PKR)</th>
        <th class="text-right">Total (PKR)</th>
      </tr>
    </thead>
    <tbody>
      ${purchase.items.map((it, idx) => {
        const metrics = getItemMetrics(it);
        return `
        <tr style="${metrics.isFullyReturned ? 'background-color: #fff1f2;' : ''}">
          <td>${idx + 1}</td>
          <td>
            <strong>${it.productName}</strong> ${it.brandName ? `(${it.brandName} • ${it.typeName || ''})` : ''}
            ${metrics.returnedQty > 0 ? `<div style="font-size:11px;color:#b45309;font-weight:bold;margin-top:2px;">↳ Returned: -${metrics.returnedQty} ${it.unit || 'Pcs'}</div>` : ''}
          </td>
          <td><code>${it.internalId || '-'}</code></td>
          <td class="text-center">${it.quantity} ${it.unit || 'Pcs'}</td>
          ${hasReturns ? `
            <td class="text-center">
              <strong>${metrics.netQty} ${it.unit || 'Pcs'}</strong>
            </td>
          ` : ''}
          <td class="text-right">Rs ${it.unitPrice.toLocaleString()}</td>
          <td class="text-right">
            ${metrics.returnedQty > 0 ? `<div class="strike">Rs ${metrics.originalLineTotal.toLocaleString()}</div>` : ''}
            <strong>Rs ${metrics.netLineTotal.toLocaleString()}</strong>
          </td>
        </tr>
      `}).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Original Subtotal:</span>
      <span>Rs ${purchase.subtotal.toLocaleString()}</span>
    </div>
    ${purchase.discountAmount ? `
      <div class="totals-row" style="color: #16a34a;">
        <span>Discount:</span>
        <span>- Rs ${purchase.discountAmount.toLocaleString()}</span>
      </div>
    ` : ''}
    <div class="totals-row">
      <span>Original Total Bill:</span>
      <span>Rs ${purchase.totalAmount.toLocaleString()}</span>
    </div>
    ${hasReturns ? `
      <div class="totals-row" style="color: #b45309; font-weight: bold; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 6px;">
        <span>Less Vendor Returns (Debit Note):</span>
        <span>- Rs ${totalReturnedAmount.toLocaleString()}</span>
      </div>
      <div class="totals-row grand-total">
        <span>Net Adjusted Bill:</span>
        <span>Rs ${netBillAmount.toLocaleString()}</span>
      </div>
    ` : `
      <div class="totals-row grand-total">
        <span>Net Total Bill:</span>
        <span>Rs ${purchase.totalAmount.toLocaleString()}</span>
      </div>
    `}
    <div class="totals-row" style="margin-top: 6px;">
      <span>Amount Paid (Cash Sent):</span>
      <span style="color: #16a34a; font-weight: bold;">Rs ${purchase.amountPaid.toLocaleString()}</span>
    </div>
    ${netBalanceDue > 0 ? `
      <div class="totals-row" style="color: #dc2626; font-weight: bold;">
        <span>Balance Owed to Vendor:</span>
        <span>Rs ${netBalanceDue.toLocaleString()}</span>
      </div>
    ` : `
      <div class="totals-row" style="color: #16a34a; font-weight: bold;">
        <span>Payment Status:</span>
        <span>FULLY SETTLED</span>
      </div>
    `}
  </div>

  <div class="footer">
    Inventory received & FIFO cost batch recorded • Generated by Precision POS
  </div>
</body>
</html>`;

    const blob = new Blob([invoiceHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Purchase-Bill-${purchase.billNumber || purchase.id}-${purchase.vendorName.replace(/\s+/g, '_')}${hasReturns ? '_ReturnAdjusted' : ''}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white">
      {/* Modal Container */}
      <div 
        id="purchase-invoice-modal-card"
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-3xl overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200 print:shadow-none print:border-none print:max-h-none print:w-full print:rounded-none"
      >
        {/* Top Control Bar (Hidden on Print) */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between gap-2 print:hidden border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black truncate flex items-center gap-2">
                <span>Purchase Bill #{purchase.billNumber || purchase.id}</span>
                {hasReturns && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Debit Note Adjusted</span>
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {purchase.vendorName} • {formattedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Print purchase bill or save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Bill</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHTML}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              title="Download standalone HTML bill"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">HTML</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Purchase Receipt Area */}
        <div 
          ref={printContainerRef}
          id="printable-purchase-bill"
          className="p-5 sm:p-8 overflow-y-auto flex-1 text-slate-900 bg-white space-y-6 print:p-0 print:overflow-visible"
        >
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b-2 border-amber-600 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-amber-600 text-white font-black text-xs rounded-lg uppercase tracking-wider">
                  Goods Received & Purchase Bill
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                  purchase.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                  purchase.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                  'bg-red-100 text-red-800 border border-red-300'
                }`}>
                  {purchase.paymentStatus}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5">
                PRECISION PARTS & INVENTORY
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Automotive Filters & Machinery Spare Parts • Pakistan
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-lg sm:text-xl font-black font-mono text-amber-700">
                #{purchase.billNumber || purchase.id}
              </div>
              <div className="text-xs text-slate-500 font-semibold mt-0.5">
                Date: {formattedDate}
              </div>
              <div className="text-xs text-slate-500 font-semibold">
                Internal Ref: {purchase.id}
              </div>
            </div>
          </div>

          {/* Vendor Info Box */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Purchased From (Vendor)
              </div>
              <div className="text-base font-black text-slate-900 mt-1 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-600" />
                <span>{purchase.vendorName}</span>
              </div>
              {purchase.poNumber && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg font-bold">
                    Order Ref: PO #{purchase.poNumber}
                  </span>
                  {purchase.biltyNumber && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-medium">
                      Bilty / Tracking: {purchase.biltyNumber}
                    </span>
                  )}
                  {purchase.transporterName && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-medium">
                      Transporter: {purchase.transporterName}
                    </span>
                  )}
                </div>
              )}
              {purchase.notes && (
                <div className="text-xs text-slate-600 mt-2 italic bg-white p-2 rounded-lg border border-slate-200/60 inline-block">
                  <strong>Notes:</strong> {purchase.notes}
                </div>
              )}
            </div>

            <div className="text-left sm:text-right space-y-2">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Inventory FIFO Status
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold mt-1">
                  <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Stock Batches Logged</span>
                </div>
              </div>
              {purchase.cargoCost && purchase.cargoCost > 0 ? (
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Allocated Cargo Freight
                  </div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold mt-0.5">
                    ₨ {purchase.cargoCost.toLocaleString()} (Landed Cost Adjusted)
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Return Notice Banner (If Purchase has Linked Returns) */}
          {hasReturns && (
            <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-black">
                <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Vendor Return & Debit Adjustments Active</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-bold ml-auto">
                  -{formatPKR(totalReturnedAmount)} Debited
                </span>
              </div>
              <p className="text-amber-800 leading-relaxed text-[11px]">
                Items returned to vendor have been deducted from bill quantities. The bill net total has been adjusted accordingly.
              </p>
              {linkedReturns.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-amber-200/60">
                  {linkedReturns.map((lr) => (
                    <div key={lr.returnId} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-300/80 rounded-xl text-[11px] text-amber-900 font-semibold shadow-2xs">
                      <span className="font-mono font-bold text-amber-700">{lr.returnNumber}</span>
                      {lr.debitNoteNumber && <span className="text-slate-500 font-mono text-[10px]">({lr.debitNoteNumber})</span>}
                      <span>• {formatPKR(lr.totalAmount)}</span>
                      <span className="text-[10px] text-slate-500">({lr.settlementMethod === 'reduce_vendor_balance' ? 'Vendor Khata Deducted' : 'Cash Received Back'})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full min-w-[700px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="px-3.5 py-3 w-10 text-center">#</th>
                  <th className="px-3.5 py-3">Part #</th>
                  <th className="px-3.5 py-3">Product Description</th>
                  <th className="px-3.5 py-3 text-center w-24">Orig Qty</th>
                  {hasReturns && <th className="px-3.5 py-3 text-center w-24">Net Billed</th>}
                  <th className="px-3.5 py-3 text-right w-28">Buying Rate</th>
                  <th className="px-3.5 py-3 text-right w-28">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchase.items.map((item, idx) => {
                  const metrics = getItemMetrics(item);
                  return (
                    <tr key={item.id || idx} className={`hover:bg-slate-50/70 ${metrics.isFullyReturned ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-3.5 py-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="px-3.5 py-3 font-mono font-bold text-amber-900">
                        <span className="bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                          {item.internalId || '-'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-black text-slate-900">{item.productName}</div>
                        {(item.brandName || item.typeName) && (
                          <div className="text-[11px] text-slate-500 font-medium">
                            {item.brandName} {item.typeName ? `• ${item.typeName}` : ''}
                          </div>
                        )}
                        {metrics.returnedQty > 0 && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300/70">
                            <RotateCcw className="w-2.5 h-2.5 text-amber-700" />
                            <span>Returned: -{metrics.returnedQty} {item.unit || 'Pcs'}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-center font-bold text-slate-800">
                        {item.quantity} {item.unit || 'Pcs'}
                      </td>
                      {hasReturns && (
                        <td className="px-3.5 py-3 text-center font-black">
                          {metrics.isFullyReturned ? (
                            <span className="text-slate-400 line-through">0 {item.unit || 'Pcs'}</span>
                          ) : (
                            <span className="text-emerald-700">{metrics.netQty} {item.unit || 'Pcs'}</span>
                          )}
                        </td>
                      )}
                      <td className="px-3.5 py-3 text-right font-mono font-semibold text-slate-700">
                        {formatPKR(item.unitPrice)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono">
                        {metrics.returnedQty > 0 ? (
                          <div>
                            <div className="text-[10px] text-slate-400 line-through">
                              {formatPKR(metrics.originalLineTotal)}
                            </div>
                            <div className="font-black text-slate-900">
                              {formatPKR(metrics.netLineTotal)}
                            </div>
                          </div>
                        ) : (
                          <div className="font-black text-slate-900">
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

          {/* Financial Breakdown & Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
            <div className="text-xs text-slate-500 space-y-1 max-w-sm">
              <p className="font-semibold text-slate-700">Purchase Accounting Details:</p>
              <p>• Stock quantities have been added to inventory.</p>
              <p>• FIFO Cost Batches recorded for profit calculations during future sales.</p>
              {purchase.amountPaid > 0 && (
                <p className="text-emerald-700 font-semibold">
                  • ₨ {purchase.amountPaid.toLocaleString()} credited to vendor cash payment ledger.
                </p>
              )}
              {hasReturns && (
                <p className="text-amber-600 font-semibold">
                  • Debit Note processed and adjusted against vendor payable ledger.
                </p>
              )}
            </div>

            <div className="w-full sm:w-80 bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
              <div className="flex justify-between text-xs text-slate-600 font-semibold">
                <span>Original Subtotal:</span>
                <span className="font-mono">{formatPKR(purchase.subtotal)}</span>
              </div>

              {Boolean(purchase.discountAmount && purchase.discountAmount > 0) && (
                <div className="flex justify-between text-xs text-emerald-700 font-semibold">
                  <span>Discount Given:</span>
                  <span className="font-mono">- {formatPKR(purchase.discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-xs text-slate-600">
                <span>Original Total Bill:</span>
                <span className="font-mono font-bold text-slate-800">{formatPKR(purchase.totalAmount)}</span>
              </div>

              {hasReturns && (
                <div className="flex justify-between text-xs font-bold p-2 rounded-xl bg-amber-100/80 border border-amber-200 text-amber-900">
                  <span className="flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                    <span>Less Debit Notes:</span>
                  </span>
                  <span className="font-mono">-{formatPKR(totalReturnedAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>{hasReturns ? 'Net Adjusted Bill:' : 'Total Net Bill:'}</span>
                <span className="font-mono text-amber-700">{formatPKR(netBillAmount)}</span>
              </div>

              <div className="flex justify-between text-xs font-bold text-emerald-700">
                <span>Amount Paid:</span>
                <span className="font-mono">{formatPKR(purchase.amountPaid)}</span>
              </div>

              <div className="flex justify-between text-xs font-black pt-2 border-t border-slate-200">
                <span className={netBalanceDue > 0 ? 'text-red-700' : 'text-emerald-700'}>
                  Balance Due:
                </span>
                <span className={`font-mono text-sm ${netBalanceDue > 0 ? 'text-red-700 font-black' : 'text-emerald-700'}`}>
                  {formatPKR(netBalanceDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Print Footer */}
          <div className="pt-6 border-t border-slate-200 text-center text-slate-400 text-[11px] print:block">
            Precision POS & Inventory System • Official Purchase Record
          </div>
        </div>
      </div>
    </div>
  );
};

