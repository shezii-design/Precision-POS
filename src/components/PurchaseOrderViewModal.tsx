import React, { useRef } from 'react';
import { PurchaseOrder, Vendor } from '../types';
import { 
  X, 
  Printer, 
  Truck, 
  Building2, 
  Calendar, 
  Box, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Receipt,
  FileText,
  Scale,
  ExternalLink,
  Edit3
} from 'lucide-react';

interface PurchaseOrderViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder?: PurchaseOrder | null;
  po?: PurchaseOrder | null;
  vendors?: Vendor[];
  onOpenReceiveModal?: (po: PurchaseOrder) => void;
  onReceive?: (po: PurchaseOrder) => void;
  onOpenEditPO?: (po: PurchaseOrder) => void;
  onEdit?: (po: PurchaseOrder) => void;
  onDelete?: (poId: string) => void;
}

export const PurchaseOrderViewModal: React.FC<PurchaseOrderViewModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  po: poProp,
  vendors,
  onOpenReceiveModal,
  onReceive,
  onOpenEditPO,
  onEdit,
  onDelete
}) => {
  const printAreaRef = useRef<HTMLDivElement | null>(null);
  const po = purchaseOrder || poProp || null;

  if (!isOpen || !po) return null;

  const handleReceiveCargo = () => {
    onClose();
    if (onReceive) {
      onReceive(po);
    } else if (onOpenReceiveModal) {
      onOpenReceiveModal(po);
    }
  };

  const handleEditPO = () => {
    onClose();
    if (onEdit) {
      onEdit(po);
    } else if (onOpenEditPO) {
      onOpenEditPO(po);
    }
  };

  const handleDeletePO = () => {
    if (window.confirm(`Are you sure you want to delete Purchase Order ${po.poNumber}?`)) {
      onClose();
      if (onDelete) {
        onDelete(po.id);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = () => {
    switch (po.status) {
      case 'completed':
        return (
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-lg border border-emerald-300/80 flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed • Landed Costs Finalized</span>
          </span>
        );
      case 'pending_bill':
        return (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-xs font-black rounded-lg border border-amber-300/80 flex items-center gap-1.5 shadow-2xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Stock Received • Bill Pending</span>
          </span>
        );
      case 'ordered':
        return (
          <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-black rounded-lg border border-blue-300/80 flex items-center gap-1.5 shadow-2xs">
            <Truck className="w-3.5 h-3.5" />
            <span>Ordered (In Transit)</span>
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-black rounded-lg border border-slate-300/80 flex items-center gap-1.5 shadow-2xs">
            <FileText className="w-3.5 h-3.5" />
            <span>Draft Order</span>
          </span>
        );
    }
  };

  const balanceDue = Math.max(0, (po.totalLandedCost || 0) - (po.amountPaid || 0));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Actions Bar */}
        <div className="bg-slate-900 px-5 sm:px-7 py-4 text-white flex items-center justify-between shrink-0 shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-bold text-amber-300 border border-white/10 shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white font-mono">
                  {po.poNumber}
                </h2>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Supplier: <strong className="text-white">{po.vendorName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-bold rounded-xl border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print PO / GRN</span>
            </button>

            {(po.status === 'pending_bill' || po.status === 'ordered') && (onReceive || onOpenReceiveModal) && (
              <button
                type="button"
                onClick={handleReceiveCargo}
                className={`px-3.5 py-1.5 text-xs font-black rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  po.status === 'pending_bill'
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {po.status === 'pending_bill' ? (
                  <>
                    <DollarSign className="w-4 h-4 stroke-[2.5]" />
                    <span>Finalize Bill Costs</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4 stroke-[2.5]" />
                    <span>Receive Cargo</span>
                  </>
                )}
              </button>
            )}

            {(po.status === 'ordered' || po.status === 'draft') && (onEdit || onOpenEditPO) && (
              <button
                type="button"
                onClick={handleEditPO}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                title="Edit PO"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer ml-1"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable PO Document View */}
        <div ref={printAreaRef} className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 bg-white print:p-0">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 block mb-1">
                  Precision Auto Parts & Filters
                </span>
                <h1 className="text-2xl font-black text-slate-950 tracking-tight">
                  PURCHASE ORDER & GOODS NOTE
                </h1>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Document ID: <strong>{po.poNumber}</strong> • Reference: {po.id}
                </p>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <div className="inline-block">{getStatusBadge()}</div>
                <div className="text-xs text-slate-600 font-medium">
                  <p>Order Date: <strong className="text-slate-950 font-mono">{po.orderDate}</strong></p>
                  {po.receivingDate && (
                    <p>Cargo Arrival: <strong className="text-emerald-700 font-mono">{po.receivingDate}</strong></p>
                  )}
                  {po.billNumber && (
                    <p>Supplier Bill #: <strong className="text-slate-950 font-mono">{po.billNumber}</strong></p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Supplier & Cargo Carrier Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                Supplier Details
              </span>
              <h3 className="font-black text-sm text-slate-900">{po.vendorName}</h3>
              {po.vendorPhone && <p className="text-slate-600 mt-0.5">Phone: {po.vendorPhone}</p>}
              {po.vendorAddress && <p className="text-slate-500 mt-0.5">{po.vendorAddress}</p>}
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                Cargo & Transport Details
              </span>
              {po.transporterName ? (
                <p className="font-bold text-slate-900">{po.transporterName}</p>
              ) : (
                <p className="text-slate-500 italic">Transporter: Direct Dispatch</p>
              )}
              {po.biltyNumber && (
                <p className="text-slate-700 font-mono mt-0.5">
                  Bilty / Tracking #: <strong>{po.biltyNumber}</strong>
                </p>
              )}
              <p className="text-amber-800 font-semibold mt-0.5">
                Total Cargo Freight: <strong>₨ {(po.cargoCost || 0).toLocaleString()}</strong>
                {po.cargoCostPerUnit > 0 && <span> (₨ {po.cargoCostPerUnit}/pc distributed)</span>}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full min-w-[700px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-[11px]">
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  <th className="py-2.5 px-3">Product / Part</th>
                  <th className="py-2.5 px-2 text-center w-18">Ordered</th>
                  <th className="py-2.5 px-2 text-center w-20">Received</th>
                  <th className="py-2.5 px-3 text-right w-24">Base Rate (₨)</th>
                  <th className="py-2.5 px-2 text-center w-22">Cargo/pc</th>
                  <th className="py-2.5 px-3 text-right w-28">Landed Cost (₨)</th>
                  <th className="py-2.5 px-3 text-right w-28">Line Total (₨)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {po.items.map((item, idx) => {
                  const qty = po.isStockReceived ? (item.receivedQuantity || 0) : (item.orderedQuantity || 0);
                  const isExtra = item.isExtraItem || (item.orderedQuantity === 0);
                  const qtyDiff = (item.receivedQuantity || 0) - (item.orderedQuantity || 0);

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] text-amber-800 bg-amber-100 px-1 py-0.2 rounded font-bold">
                            {item.internalId}
                          </span>
                          <span>{item.productName}</span>
                          {isExtra && (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-900 text-[9px] font-bold rounded">
                              Extra in Cargo
                            </span>
                          )}
                        </div>
                        {item.brandName && (
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            {item.brandName} {item.typeName ? `• ${item.typeName}` : ''}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-500">
                        {item.orderedQuantity || 0} {item.unit}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-md font-black text-xs ${
                          po.isStockReceived ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.receivedQuantity || 0} {item.unit}
                        </span>
                        {po.isStockReceived && item.orderedQuantity > 0 && qtyDiff !== 0 && (
                          <span className={`block text-[9px] font-bold mt-0.5 ${
                            qtyDiff > 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            {qtyDiff > 0 ? `+${qtyDiff} extra` : `${qtyDiff} short`}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                        ₨ {(item.actualUnitPrice || item.estimatedUnitPrice || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-500">
                        ₨ {(item.allocatedCargoCost || po.cargoCostPerUnit || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800">
                        ₨ {(item.landedUnitCost || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                        ₨ {(item.totalLineCost || 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation & Ledger Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            {/* Left: Notes & System Status */}
            <div className="space-y-3">
              {po.notes && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block mb-1">Order Remarks:</span>
                  <p className="text-slate-600 whitespace-pre-line">{po.notes}</p>
                </div>
              )}

              <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80 text-xs text-emerald-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Inventory & Ledger Integration</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  • <strong>Stock Status:</strong> {po.isStockReceived ? 'Physical stock added into inventory' : 'Stock not received yet'}
                </p>
                <p className="text-[11px] text-emerald-800">
                  • <strong>Ledger Status:</strong> {po.isBilled ? `Posted to Vendor Ledger on receiving date (${po.receivingDate || po.orderDate})` : 'Pending final bill/costs'}
                </p>
              </div>
            </div>

            {/* Right: Financial Totals Box */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Total Items / Units:</span>
                <span className="font-bold text-slate-900">
                  {po.items.length} items • {po.isStockReceived ? po.totalReceivedQty : po.totalOrderedQty} units
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Subtotal Base Cost:</span>
                <span className="font-mono font-bold text-slate-900">
                  ₨ {(po.subtotalBaseCost || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center text-emerald-800 font-semibold">
                <span>Cargo / Freight Cost:</span>
                <span className="font-mono font-bold">
                  + ₨ {(po.cargoCost || 0).toLocaleString()}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-black text-slate-950">
                <span>Total Landed Cost:</span>
                <span className="font-mono text-base text-emerald-800">
                  ₨ {(po.totalLandedCost || 0).toLocaleString()}
                </span>
              </div>

              {po.amountPaid && po.amountPaid > 0 ? (
                <>
                  <div className="flex justify-between items-center text-emerald-700 font-bold text-xs pt-1">
                    <span>Amount Paid on Spot:</span>
                    <span className="font-mono">₨ {po.amountPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-rose-700 font-black text-xs border-t border-slate-200 pt-1">
                    <span>Balance Due:</span>
                    <span className="font-mono">₨ {balanceDue.toLocaleString()}</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs text-slate-400 border-t border-slate-200 mt-6">
            <div>
              <div className="h-10 border-b border-dashed border-slate-300 mb-1" />
              <span>Prepared / Issued By</span>
            </div>
            <div>
              <div className="h-10 border-b border-dashed border-slate-300 mb-1" />
              <span>Goods Received & Inspected By</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Goods Note</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
