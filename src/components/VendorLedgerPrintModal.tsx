import React, { useState, useMemo, useRef } from 'react';
import { Vendor, ComputedLedgerRow } from '../types';
import { formatPKR } from '../services/pricing';
import { downloadVendorLedgerPDF } from '../services/pdfReportGenerator';
import { 
  X, 
  Printer, 
  Building2, 
  Phone, 
  MapPin, 
  Receipt,
  FileSpreadsheet,
  Download
} from 'lucide-react';

interface VendorLedgerPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: Vendor;
  ledgerRows: ComputedLedgerRow[];
  currentBalance: number;
}

export const VendorLedgerPrintModal: React.FC<VendorLedgerPrintModalProps> = ({
  isOpen,
  onClose,
  vendor,
  ledgerRows,
  currentBalance,
}) => {
  const [dateFilter, setDateFilter] = useState<'all' | '30days' | 'this_month' | 'this_year'>('all');
  const printRef = useRef<HTMLDivElement | null>(null);

  const { statementRows, periodOpeningBalance, totalDebit, totalCredit, closingBalance } = useMemo(() => {
    if (dateFilter === 'all') {
      const d = ledgerRows.reduce((sum, r) => sum + (r.debit || 0), 0);
      const c = ledgerRows.reduce((sum, r) => sum + (r.credit || 0), 0);
      return {
        statementRows: ledgerRows,
        periodOpeningBalance: 0,
        totalDebit: d,
        totalCredit: c,
        closingBalance: currentBalance,
      };
    }

    const now = new Date();
    let startDate: Date;

    if (dateFilter === '30days') {
      startDate = new Date(Date.now() - 30 * 86400000);
    } else if (dateFilter === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const priorRows = ledgerRows.filter(r => new Date(r.date) < startDate);
    const currentPeriodRows = ledgerRows.filter(r => new Date(r.date) >= startDate);

    let priorBalance = 0;
    if (priorRows.length > 0) {
      priorBalance = priorRows[priorRows.length - 1].runningBalance;
    }

    const resultRows: ComputedLedgerRow[] = [];
    if (priorRows.length > 0 || priorBalance !== 0) {
      resultRows.push({
        id: 'period-opening-bf',
        sourceType: 'opening_balance',
        date: startDate.toISOString(),
        entryCode: 'B/F',
        description: `Balance Brought Forward (Prior to ${startDate.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })})`,
        debit: priorBalance < 0 ? Math.abs(priorBalance) : 0,
        credit: priorBalance > 0 ? priorBalance : 0,
        runningBalance: priorBalance,
      });
    }

    resultRows.push(...currentPeriodRows);

    const d = currentPeriodRows.reduce((sum, r) => sum + (r.debit || 0), 0) + (priorBalance < 0 ? Math.abs(priorBalance) : 0);
    const c = currentPeriodRows.reduce((sum, r) => sum + (r.credit || 0), 0) + (priorBalance > 0 ? priorBalance : 0);
    const closing = currentPeriodRows.length > 0 ? currentPeriodRows[currentPeriodRows.length - 1].runningBalance : priorBalance;

    return {
      statementRows: resultRows,
      periodOpeningBalance: priorBalance,
      totalDebit: d,
      totalCredit: c,
      closingBalance: closing,
    };
  }, [ledgerRows, dateFilter, currentBalance]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const getPeriodTitle = () => {
    if (dateFilter === '30days') return 'Last 30 Days';
    if (dateFilter === 'this_month') return 'This Month';
    if (dateFilter === 'this_year') return 'This Year';
    return 'All Recorded Transactions';
  };

  const handleDownloadPDF = () => {
    downloadVendorLedgerPDF(vendor, statementRows, closingBalance, getPeriodTitle());
  };

  return (
    <div 
      id="vendor-ledger-print-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Action Bar (Hidden when printing) */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center font-bold text-white shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight leading-tight">
                Vendor Statement / Ledger Print
              </h2>
              <p className="text-[11px] text-neutral-400">
                {vendor.businessName} • Balance We Owe: <span className="font-bold text-white">{formatPKR(Math.abs(currentBalance))} {currentBalance > 0 ? '(Payable)' : (currentBalance < 0 ? '(Advance)' : '')}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-xl text-xs font-semibold text-white outline-hidden cursor-pointer"
            >
              <option value="all">All Transactions</option>
              <option value="30days">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
            </select>

            <button
              type="button"
              id="btn-vendor-modal-download-pdf"
              onClick={handleDownloadPDF}
              className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl border border-neutral-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              title="Download formatted statement report as PDF"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              id="btn-vendor-modal-print"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Statement</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div ref={printRef} className="p-6 sm:p-8 overflow-y-auto print:p-0 print:overflow-visible space-y-6 text-neutral-900 bg-white">
          
          {/* Header Brand */}
          <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center font-black text-xs">
                  PFH
                </div>
                <h1 className="text-xl font-black tracking-tight text-neutral-900 uppercase">
                  Precision Filter House
                </h1>
              </div>
              <p className="text-xs text-neutral-600 font-semibold mt-1">
                Industrial, Heavy Earthmoving & Commercial Vehicle Filtration Specialists
              </p>
              <p className="text-[11px] text-neutral-500">
                Auto Market, Faisalabad & Lahore • Phone: 0300-5551234 • Accounts & Procurement
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-neutral-900 text-white text-xs font-black uppercase tracking-wider rounded-md">
                Vendor Statement of Account
              </span>
              <p className="text-[11px] text-neutral-500 font-semibold mt-1.5">
                Statement Date: {new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-[11px] text-neutral-500">
                Period: {dateFilter === 'all' ? 'All Recorded History' : dateFilter.replace('_', ' ').toUpperCase()}
              </p>
            </div>
          </div>

          {/* Vendor Details Box & Balance Highlight */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
            <div className="sm:col-span-2 space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Supplier / Vendor Account
              </div>
              <h3 className="text-base font-black text-neutral-900">
                {vendor.businessName}
              </h3>
              {vendor.contactPerson && (
                <p className="text-xs text-neutral-600 font-medium">
                  Contact: <span className="font-bold text-neutral-800">{vendor.contactPerson}</span>
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-neutral-600 flex-wrap pt-0.5">
                {vendor.phone && <span>📞 {vendor.phone}</span>}
                {vendor.city && <span>📍 {vendor.city}</span>}
                {vendor.email && <span>✉️ {vendor.email}</span>}
              </div>
              {vendor.address && (
                <p className="text-[11px] text-neutral-500">
                  {vendor.address}
                </p>
              )}
            </div>

            {/* Current Net Balance Box */}
            <div className="bg-white p-3.5 rounded-xl border border-neutral-200 text-right flex flex-col justify-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Current Net Balance
              </span>
              <div className={`text-xl font-black mt-0.5 ${
                closingBalance > 0 
                  ? 'text-amber-700' 
                  : (closingBalance < 0 ? 'text-emerald-600' : 'text-neutral-700')
              }`}>
                {formatPKR(Math.abs(closingBalance))}
              </div>
              <span className={`text-[10px] font-bold mt-0.5 ${
                closingBalance > 0 
                  ? 'text-amber-800' 
                  : (closingBalance < 0 ? 'text-emerald-700' : 'text-neutral-500')
              }`}>
                {closingBalance > 0 ? 'Amount We Owe Vendor (Payable)' : (closingBalance < 0 ? 'Advance Paid to Vendor' : 'Account Settled (Zero)')}
              </span>
            </div>
          </div>

          {/* Statement Table */}
          <div className="border border-neutral-300 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-900 text-white font-black">
                  <th className="py-2.5 px-3 border-r border-neutral-800 w-24">Date</th>
                  <th className="py-2.5 px-3 border-r border-neutral-800 w-28">Ref / Bill #</th>
                  <th className="py-2.5 px-3 border-r border-neutral-800">Particulars / Description</th>
                  <th className="py-2.5 px-3 border-r border-neutral-800 text-right w-28">Debit (PKR)</th>
                  <th className="py-2.5 px-3 border-r border-neutral-800 text-right w-28">Credit (PKR)</th>
                  <th className="py-2.5 px-3 text-right w-32">Balance (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 font-medium">
                {statementRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-400 font-semibold">
                      No transaction entries found for this vendor.
                    </td>
                  </tr>
                ) : (
                  statementRows.map((row) => (
                    <tr key={row.id} className={row.id === 'period-opening-bf' ? 'bg-amber-50/60 font-semibold' : 'hover:bg-neutral-50'}>
                      <td className="py-2 px-3 text-neutral-600 border-r border-neutral-200 text-[11px]">
                        {new Date(row.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-2 px-3 border-r border-neutral-200 font-mono font-bold text-neutral-800 text-[11px]">
                        {row.entryCode || row.billNumber || '—'}
                      </td>
                      <td className="py-2 px-3 border-r border-neutral-200 text-neutral-800">
                        <div>{row.description}</div>
                      </td>
                      <td className="py-2 px-3 border-r border-neutral-200 text-right font-mono font-bold text-emerald-700">
                        {row.debit > 0 ? formatPKR(row.debit) : '—'}
                      </td>
                      <td className="py-2 px-3 border-r border-neutral-200 text-right font-mono font-bold text-amber-900">
                        {row.credit > 0 ? formatPKR(row.credit) : ((row.sourceType === 'purchase' && ((row.credit === 0 && row.debit === 0) || row.description?.includes('Pending'))) ? <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">₨ 0 (Pending)</span> : '—')}
                      </td>
                      <td className={`py-2 px-3 text-right font-mono font-black ${
                        row.runningBalance > 0 ? 'text-amber-800' : (row.runningBalance < 0 ? 'text-emerald-700' : 'text-neutral-600')
                      }`}>
                        {formatPKR(Math.abs(row.runningBalance))} {row.runningBalance > 0 ? 'Cr' : (row.runningBalance < 0 ? 'Dr' : '')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-neutral-100 font-black border-t-2 border-neutral-300">
                <tr>
                  <td colSpan={3} className="py-2.5 px-3 text-neutral-900 uppercase tracking-wider text-[11px]">
                    Period Total & Closing Balance:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-800 border-r border-neutral-200">
                    {formatPKR(totalDebit)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-900 border-r border-neutral-200">
                    {formatPKR(totalCredit)}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono ${
                    closingBalance > 0 ? 'text-amber-800' : (closingBalance < 0 ? 'text-emerald-700' : 'text-neutral-700')
                  }`}>
                    {formatPKR(Math.abs(closingBalance))} {closingBalance > 0 ? 'Cr' : (closingBalance < 0 ? 'Dr' : '')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signatures & Notes */}
          <div className="pt-8 grid grid-cols-3 gap-8 text-center text-xs">
            <div className="border-t border-neutral-400 pt-2">
              <p className="font-bold text-neutral-800">Prepared By</p>
              <p className="text-[10px] text-neutral-400">Procurement / POS System</p>
            </div>
            <div className="border-t border-neutral-400 pt-2">
              <p className="font-bold text-neutral-800">Verified & Checked</p>
              <p className="text-[10px] text-neutral-400">Finance Manager</p>
            </div>
            <div className="border-t border-neutral-400 pt-2">
              <p className="font-bold text-neutral-800">Vendor Signature</p>
              <p className="text-[10px] text-neutral-400">Authorized Representative / Stamp</p>
            </div>
          </div>

          <div className="text-center text-[10px] text-neutral-400 pt-4 border-t border-neutral-100">
            This is a computer-generated account statement from Precision Filter House POS system.
          </div>
        </div>
      </div>
    </div>
  );
};
