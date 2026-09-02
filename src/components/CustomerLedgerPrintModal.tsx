import React, { useState, useMemo, useRef } from 'react';
import { Customer, ComputedCustomerLedgerRow } from '../types';
import { formatPKR } from '../services/pricing';
import { downloadCustomerLedgerPDF } from '../services/pdfReportGenerator';
import { 
  X, 
  Printer, 
  Calendar, 
  Building2, 
  User, 
  Phone, 
  MapPin, 
  Download,
  Filter,
  FileSpreadsheet
} from 'lucide-react';

interface CustomerLedgerPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  ledgerRows: ComputedCustomerLedgerRow[];
  currentBalance: number;
}

export const CustomerLedgerPrintModal: React.FC<CustomerLedgerPrintModalProps> = ({
  isOpen,
  onClose,
  customer,
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

    const resultRows: ComputedCustomerLedgerRow[] = [];
    if (priorRows.length > 0 || priorBalance !== 0) {
      resultRows.push({
        id: 'period-opening-bf',
        sourceType: 'opening_balance',
        date: startDate.toISOString(),
        entryCode: 'B/F',
        description: `Balance Brought Forward (Prior to ${startDate.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })})`,
        debit: priorBalance > 0 ? priorBalance : 0,
        credit: priorBalance < 0 ? Math.abs(priorBalance) : 0,
        runningBalance: priorBalance,
      });
    }

    resultRows.push(...currentPeriodRows);

    const d = currentPeriodRows.reduce((sum, r) => sum + (r.debit || 0), 0) + (priorBalance > 0 ? priorBalance : 0);
    const c = currentPeriodRows.reduce((sum, r) => sum + (r.credit || 0), 0) + (priorBalance < 0 ? Math.abs(priorBalance) : 0);
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
    downloadCustomerLedgerPDF(customer, statementRows, closingBalance, getPeriodTitle());
  };

  return (
    <div 
      id="customer-ledger-print-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Action Bar (Hidden when printing) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center font-bold text-white shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight leading-tight">
                Customer Statement / Khata Ledger Print
              </h2>
              <p className="text-[11px] text-slate-400">
                {customer.name} • Net Balance: <span className="font-bold text-white">{formatPKR(currentBalance)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-white outline-hidden cursor-pointer"
            >
              <option value="all">All Transactions</option>
              <option value="30days">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
            </select>

            <button
              type="button"
              id="btn-customer-modal-download-pdf"
              onClick={handleDownloadPDF}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              title="Download formatted statement report as PDF"
            >
              <Download className="w-4 h-4 text-red-400" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              id="btn-customer-modal-print"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Statement</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div ref={printRef} className="p-6 sm:p-8 overflow-y-auto print:p-0 print:overflow-visible space-y-6 text-slate-900 bg-white">
          
          {/* Header Brand */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-xs">
                  PFH
                </div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  Precision Filter House
                </h1>
              </div>
              <p className="text-xs text-slate-600 font-semibold mt-1">
                Industrial, Heavy Earthmoving & Commercial Vehicle Filtration Specialists
              </p>
              <p className="text-[11px] text-slate-500">
                Auto Market, Faisalabad & Lahore • Phone: 0300-5551234 • Accounts Dept.
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-md">
                Customer Account Statement
              </span>
              <p className="text-[11px] text-slate-500 font-semibold mt-1.5">
                Statement Date: {new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-[11px] text-slate-500">
                Period: {dateFilter === 'all' ? 'All Recorded History' : dateFilter.replace('_', ' ').toUpperCase()}
              </p>
            </div>
          </div>

          {/* Customer Details Box & Balance Highlight */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="sm:col-span-2 space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Customer / Company Account
              </div>
              <h3 className="text-base font-black text-slate-900">
                {customer.name}
              </h3>
              {customer.contactPerson && (
                <p className="text-xs text-slate-600 font-medium">
                  Attn: <span className="font-bold text-slate-800">{customer.contactPerson}</span>
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap pt-0.5">
                {customer.phone && <span>📞 {customer.phone}</span>}
                {customer.city && <span>📍 {customer.city}</span>}
                {customer.ntn && <span>🏛 NTN: {customer.ntn}</span>}
                {customer.strn && <span>STRN: {customer.strn}</span>}
              </div>
              {customer.address && (
                <p className="text-[11px] text-slate-500">
                  {customer.address}
                </p>
              )}
            </div>

            {/* Current Net Balance Box */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-right flex flex-col justify-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Net Outstanding Balance
              </span>
              <div className={`text-xl font-black mt-0.5 ${
                currentBalance > 0 
                  ? 'text-red-600' 
                  : (currentBalance < 0 ? 'text-emerald-600' : 'text-slate-700')
              }`}>
                {formatPKR(Math.abs(currentBalance))}
              </div>
              <span className={`text-[10px] font-bold mt-0.5 ${
                currentBalance > 0 
                  ? 'text-red-700' 
                  : (currentBalance < 0 ? 'text-emerald-700' : 'text-slate-500')
              }`}>
                {currentBalance > 0 ? 'Receivable from Customer' : (currentBalance < 0 ? 'Customer Advance Credit' : 'Account Settled (Zero)')}
              </span>
            </div>
          </div>

          {/* Statement Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-black">
                  <th className="py-2.5 px-3 border-r border-slate-800 w-24">Date</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 w-28">Ref / Code</th>
                  <th className="py-2.5 px-3 border-r border-slate-800">Particulars / Description</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 text-right w-28">Debit (PKR)</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 text-right w-28">Credit (PKR)</th>
                  <th className="py-2.5 px-3 text-right w-32">Balance (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {statementRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                      No transaction entries found for this customer.
                    </td>
                  </tr>
                ) : (
                  statementRows.map((row) => (
                    <tr key={row.id} className={row.id === 'period-opening-bf' ? 'bg-amber-50/60 font-semibold' : 'hover:bg-slate-50'}>
                      <td className="py-2 px-3 text-slate-600 border-r border-slate-200 text-[11px]">
                        {new Date(row.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 font-mono font-bold text-slate-800 text-[11px]">
                        {row.entryCode || row.billNumber || '—'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-slate-800">
                        <div>{row.description}</div>
                        {row.paymentMethod && (
                          <span className="text-[10px] text-slate-500 font-semibold">
                            Method: {row.paymentMethod}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                        {row.debit > 0 ? formatPKR(row.debit) : '—'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-emerald-700">
                        {row.credit > 0 ? formatPKR(row.credit) : '—'}
                      </td>
                      <td className={`py-2 px-3 text-right font-mono font-black ${
                        row.runningBalance > 0 ? 'text-red-700' : (row.runningBalance < 0 ? 'text-emerald-700' : 'text-slate-600')
                      }`}>
                        {formatPKR(Math.abs(row.runningBalance))} {row.runningBalance > 0 ? 'Dr' : (row.runningBalance < 0 ? 'Cr' : '')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="py-2.5 px-3 text-slate-900 uppercase tracking-wider text-[11px]">
                    Period Total & Closing Balance:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 border-r border-slate-200">
                    {formatPKR(totalDebit)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-800 border-r border-slate-200">
                    {formatPKR(totalCredit)}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono ${
                    closingBalance > 0 ? 'text-red-700' : (closingBalance < 0 ? 'text-emerald-700' : 'text-slate-700')
                  }`}>
                    {formatPKR(Math.abs(closingBalance))} {closingBalance > 0 ? 'Dr' : (closingBalance < 0 ? 'Cr' : '')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signatures & Notes */}
          <div className="pt-8 grid grid-cols-3 gap-8 text-center text-xs">
            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold text-slate-800">Prepared By</p>
              <p className="text-[10px] text-slate-400">Accountant / POS System</p>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold text-slate-800">Verified & Checked</p>
              <p className="text-[10px] text-slate-400">Store Manager</p>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold text-slate-800">Customer Signature</p>
              <p className="text-[10px] text-slate-400">Authorized Signatory / Stamp</p>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-100">
            This is a computer-generated account statement from Precision Filter House POS system.
          </div>
        </div>
      </div>
    </div>
  );
};
