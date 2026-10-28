import React, { useState, useMemo } from 'react';
import { 
  Product, 
  Sale, 
  Purchase, 
  CustomerReturn, 
  VendorReturn, 
  Expense, 
  ExpenseCategory, 
  IncomeStatementPeriod, 
  AppWorkspaceView,
  Vendor,
  VendorLedgerEntry,
  Customer,
  CustomerLedgerEntry
} from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Printer, 
  Download, 
  Plus, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Receipt, 
  ShoppingBag, 
  RotateCcw, 
  FileSpreadsheet, 
  ChevronRight, 
  Trash2, 
  Edit3, 
  X, 
  Layers, 
  Scale, 
  HelpCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Search,
  Banknote,
  Coins,
  BookOpen,
  Eye,
  ArrowUp,
  ArrowDown,
  ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { calculateSaleCogs } from '../services/sales';
import { addFinancial, subtractFinancial, roundCurrency, safeFinancialNumber } from '../services/financialMath';
import { calculateUnifiedMetrics, UNIFIED_EXPENSE_CATEGORIES, buildProductLookupMap } from '../services/unifiedFinancialMetrics';
import { calculateVendorBalance } from '../services/storage';

interface IncomeStatementPageProps {
  sales: Sale[];
  purchases: Purchase[];
  customerReturns: CustomerReturn[];
  vendorReturns: VendorReturn[];
  products: Product[];
  expenses: Expense[];
  vendors?: Vendor[];
  vendorLedger?: VendorLedgerEntry[];
  customerLedger?: CustomerLedgerEntry[];
  customers?: Customer[];
  onSaveExpense: (expense: Partial<Expense>) => void;
  onDeleteExpense?: (expenseId: string) => void;
  onGoToView: (view: AppWorkspaceView) => void;
  onViewInvoice?: (sale: Sale) => void;
  onViewPurchase?: (purchase: Purchase) => void;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Shop Rent',
  'Electricity & Utilities',
  'Staff Wages & Salaries',
  'Cargo & Freight Outward',
  'Packaging & Tape',
  'Tea, Refreshments & Mess',
  'Shop Maintenance & Repairs',
  'Printing & Office Supplies',
  'Vehicle / Delivery Fuel',
  'Marketing & Advertising',
  'Taxes, Duties & Legal',
  'Bank & Raast Charges',
  'Miscellaneous',
];

function formatPKR(amount: number): string {
  const rounded = Math.round(amount || 0);
  return `₨ ${rounded.toLocaleString('en-PK')}`;
}

function formatPKRShort(val: number): string {
  const num = val || 0;
  if (Math.abs(num) >= 10000000) return `₨ ${(num / 10000000).toFixed(2)} Cr`;
  if (Math.abs(num) >= 1000000) return `₨ ${(num / 1000000).toFixed(2)}M`;
  if (Math.abs(num) >= 1000) return `₨ ${(num / 1000).toFixed(1)}k`;
  return `₨ ${Math.round(num).toLocaleString('en-PK')}`;
}

export const IncomeStatementPage: React.FC<IncomeStatementPageProps> = ({
  sales,
  purchases,
  customerReturns,
  vendorReturns,
  products,
  expenses,
  vendors = [],
  vendorLedger = [],
  customerLedger = [],
  customers = [],
  onSaveExpense,
  onDeleteExpense,
  onGoToView,
  onViewInvoice,
  onViewPurchase,
}) => {
  const [period, setPeriod] = useState<IncomeStatementPeriod>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'statement' | 'expenses_manager'>('statement');
  const [compareWithPrevious, setCompareWithPrevious] = useState<boolean>(false);

  // Cash in Hand & Cash Flow Journal Modal State
  const [showCashJournalModal, setShowCashJournalModal] = useState<boolean>(false);
  const [cashJournalFilter, setCashJournalFilter] = useState<'all' | 'inflow' | 'outflow' | 'cash_only' | 'bank_only'>('all');
  const [cashJournalSearch, setCashJournalSearch] = useState<string>('');
  const [cashViewScope, setCashViewScope] = useState<'period' | 'all_time'>('period');

  // Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState<{
    title: string;
    category: ExpenseCategory;
    amount: number | string;
    date: string;
    paymentMethod: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Online / Raast' | 'Other';
    paidTo: string;
    receiptNumber: string;
    notes: string;
  }>({
    title: '',
    category: 'Shop Rent',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    paidTo: '',
    receiptNumber: '',
    notes: '',
  });

  // Expense List Search & Filter
  const [expenseSearch, setExpenseSearch] = useState<string>('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');

  // Drilldown Modal
  const [drilldownType, setDrilldownType] = useState<string | null>(null);

  // Calculate Reporting Periods
  const dateBoundaries = useMemo(() => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    let prevStart = new Date(now);
    let prevEnd = new Date(now);
    let label = 'This Month';
    let prevLabel = 'Previous Month';

    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
        prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        label = `Today (${now.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })})`;
        prevLabel = 'Yesterday';
        break;
      case 'yesterday': {
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        start = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0);
        end = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59);
        prevStart = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate() - 1, 0, 0, 0);
        prevEnd = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate() - 1, 23, 59, 59);
        label = `Yesterday (${start.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })})`;
        prevLabel = 'Day Before Yesterday';
        break;
      }
      case 'this_week': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(now.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        prevStart = new Date(start);
        prevStart.setDate(prevStart.getDate() - 7);
        prevEnd = new Date(start);
        prevEnd.setDate(prevEnd.getDate() - 1);
        label = 'This Week';
        prevLabel = 'Last Week';
        break;
      }
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        label = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
        prevLabel = `${prevStart.toLocaleString('default', { month: 'long' })} ${prevStart.getFullYear()}`;
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0);
        prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);
        label = `${start.toLocaleString('default', { month: 'long' })} ${start.getFullYear()}`;
        prevLabel = `${prevStart.toLocaleString('default', { month: 'long' })} ${prevStart.getFullYear()}`;
        break;
      case 'this_quarter': {
        const q = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0);
        end = new Date(now.getFullYear(), (q + 1) * 3, 0, 23, 59, 59);
        prevStart = new Date(now.getFullYear(), (q - 1) * 3, 1, 0, 0, 0);
        prevEnd = new Date(now.getFullYear(), q * 3, 0, 23, 59, 59);
        label = `Q${q + 1} ${now.getFullYear()}`;
        prevLabel = `Q${q === 0 ? 4 : q} ${q === 0 ? now.getFullYear() - 1 : now.getFullYear()}`;
        break;
      }
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0);
        prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        label = `Fiscal Year ${now.getFullYear()}`;
        prevLabel = `Fiscal Year ${now.getFullYear() - 1}`;
        break;
      case 'last_year':
        start = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0);
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        prevStart = new Date(now.getFullYear() - 2, 0, 1, 0, 0, 0);
        prevEnd = new Date(now.getFullYear() - 2, 11, 31, 23, 59, 59);
        label = `Fiscal Year ${now.getFullYear() - 1}`;
        prevLabel = `Fiscal Year ${now.getFullYear() - 2}`;
        break;
      case 'all_time':
        start = new Date(2020, 0, 1, 0, 0, 0);
        end = new Date(2035, 11, 31, 23, 59, 59);
        prevStart = new Date(2020, 0, 1);
        prevEnd = new Date(2035, 11, 31);
        label = 'All Time Records';
        prevLabel = 'N/A';
        break;
      case 'custom':
        if (customStartDate) start = new Date(`${customStartDate}T00:00:00`);
        else start = new Date(2020, 0, 1);
        if (customEndDate) end = new Date(`${customEndDate}T23:59:59`);
        else end = new Date();
        prevStart = new Date(start);
        prevEnd = new Date(end);
        label = `${customStartDate || 'Start'} to ${customEndDate || 'End'}`;
        prevLabel = 'Prior Custom Period';
        break;
    }

    return {
      start,
      end,
      startStr: start.toISOString().split('T')[0],
      endStr: end.toISOString().split('T')[0],
      prevStart,
      prevEnd,
      prevStartStr: prevStart.toISOString().split('T')[0],
      prevEndStr: prevEnd.toISOString().split('T')[0],
      label,
      prevLabel,
    };
  }, [period, customStartDate, customEndDate]);

  // Helper to compute income statement metrics for a specific date range
  const calculateStatementForDates = (sDate: Date, eDate: Date) => {
    const isTarget = (dateStr?: string) => {
      if (!dateStr) return false;
      try {
        const d = new Date(dateStr);
        return d >= sDate && d <= eDate;
      } catch {
        return false;
      }
    };

    const targetSales = sales.filter(s => isTarget(s.date || s.createdAt));
    const targetPurchases = purchases.filter(p => isTarget(p.date || p.createdAt));
    const targetCustomerReturns = customerReturns.filter(r => isTarget(r.date || (r as any).returnDate || r.createdAt));
    const targetVendorReturns = vendorReturns.filter(r => isTarget(r.date || (r as any).returnDate || r.createdAt));
    const targetExpenses = expenses.filter(e => isTarget(e.date || e.createdAt));

    // Execute standard calculation engine
    const metrics = calculateUnifiedMetrics({
      sales: targetSales,
      customerReturns: targetCustomerReturns,
      vendorReturns: targetVendorReturns,
      purchases: targetPurchases,
      expenses: targetExpenses,
      products,
    });

    return {
      grossSales: metrics.grossSalesBeforeDiscount,
      salesDiscounts: metrics.salesDiscounts,
      invoicedSales: metrics.grossRevenue,
      salesReturns: metrics.salesReturnsAmount,
      restockFeesCollected: metrics.restockFeesCollected,
      netSales: metrics.netRevenue,
      fifoCOGS: metrics.fifoCOGS,
      damagedLoss: metrics.damagedLoss,
      totalCOGS: metrics.totalCOGS,
      grossProfit: metrics.grossProfit,
      grossProfitMargin: metrics.grossMarginPercent,
      expensesByCategory: metrics.expensesByCategory,
      totalOperatingExpenses: metrics.totalOperatingExpenses,
      operatingIncome: metrics.operatingIncome,
      operatingMargin: metrics.operatingMarginPercent,
      otherIncomeTotal: metrics.otherIncome,
      netIncome: metrics.netIncome,
      netProfitMargin: metrics.netProfitMarginPercent,
      salesCount: metrics.salesCount,
      customerReturnsCount: targetCustomerReturns.length,
      expensesCount: metrics.expensesCount,
      purchasesCount: metrics.purchasesCount,
      purchasesTotal: metrics.purchasesSpend,
      totalCashReceived: metrics.totalCashReceived,
      totalCreditOutstanding: metrics.totalCreditOutstanding,
    };
  };

  // Main Period Statement
  const statement = useMemo(() => {
    return calculateStatementForDates(dateBoundaries.start, dateBoundaries.end);
  }, [dateBoundaries, sales, purchases, customerReturns, vendorReturns, expenses, products]);

  // Prior Period Statement (for Comparison Mode)
  const priorStatement = useMemo(() => {
    return calculateStatementForDates(dateBoundaries.prevStart, dateBoundaries.prevEnd);
  }, [dateBoundaries, sales, purchases, customerReturns, vendorReturns, expenses, products]);

  // Advanced Financial & Supplier Distribution Breakdown
  const advancedBreakdown = useMemo(() => {
    const targetSales = sales.filter(s => {
      const d = new Date(s.date || s.createdAt);
      return d >= dateBoundaries.start && d <= dateBoundaries.end;
    });

    const prodMap = buildProductLookupMap(products);
    const vendorMap = new Map<string, { id: string; name: string; revenueGenerated: number; itemsSold: number; currentPayable: number }>();

    for (const v of vendors) {
      vendorMap.set(v.id, {
        id: v.id,
        name: v.businessName || 'Supplier',
        revenueGenerated: 0,
        itemsSold: 0,
        currentPayable: calculateVendorBalance(v.id, vendors, purchases, sales, vendorLedger, v.businessName),
      });
    }

    const unassigned = { id: 'unassigned', name: 'Unassigned / Direct', revenueGenerated: 0, itemsSold: 0, currentPayable: 0 };

    for (const s of targetSales) {
      if (s.items) {
        for (const item of s.items) {
          const prod = prodMap.get(item.productId) || prodMap.get(item.internalId);
          const lineVal = safeFinancialNumber(item.netLineTotal ?? (item.quantity * item.unitPrice), 0);
          const qty = item.netQuantity !== undefined ? item.netQuantity : item.quantity;

          let matchedVendorId: string | null = null;
          if (prod && prod.vendorId && vendorMap.has(prod.vendorId)) {
            matchedVendorId = prod.vendorId;
          } else {
            for (const v of vendors) {
              if (v.linkedProductIds && v.linkedProductIds.includes(item.productId)) {
                matchedVendorId = v.id;
                break;
              }
            }
          }

          if (matchedVendorId && vendorMap.has(matchedVendorId)) {
            const vObj = vendorMap.get(matchedVendorId)!;
            vObj.revenueGenerated += lineVal;
            vObj.itemsSold += qty;
          } else {
            unassigned.revenueGenerated += lineVal;
            unassigned.itemsSold += qty;
          }
        }
      }
    }

    const supplierList = Array.from(vendorMap.values()).filter(v => v.revenueGenerated > 0 || v.currentPayable !== 0);
    if (unassigned.revenueGenerated > 0) supplierList.push(unassigned);

    return {
      supplierList,
    };
  }, [sales, purchases, vendorLedger, vendorReturns, products, vendors, dateBoundaries]);

  // Master Chronological Cash Movement Journal (All Inflows & Outflows)
  const allCashTransactions = useMemo(() => {
    interface CashJournalItem {
      id: string;
      date: string;
      type: 'inflow' | 'outflow';
      category: string;
      description: string;
      entityName?: string;
      referenceId?: string;
      paymentMethod: string;
      amount: number;
      isPhysicalCash: boolean;
    }

    const list: CashJournalItem[] = [];

    // 1. Direct Sales Counter Checkout Cash
    for (const s of sales) {
      const saleDate = s.date || s.createdAt || new Date().toISOString();
      const isCash = !s.paymentMethod || s.paymentMethod === 'Cash' || s.paymentMethod === 'Split';

      // Check if customer ledger has separate payment entries referencing this sale
      const linkedCustLedgerPayments = (customerLedger || [])
        .filter(e => (e.referenceId === s.id || e.billNumber === s.id) && e.type === 'payment_received')
        .reduce((sum, e) => sum + (Number(e.amount ?? e.credit) || 0), 0);

      const checkoutReceived = Math.max(0, (Number(s.amountReceived) || 0) - linkedCustLedgerPayments);
      if (checkoutReceived > 0) {
        list.push({
          id: `sale-cash-${s.id}`,
          date: saleDate,
          type: 'inflow',
          category: 'Counter POS Sale',
          description: `Cash received at counter for Invoice #${s.id}`,
          entityName: s.customerName || 'Walk-in Customer',
          referenceId: s.id,
          paymentMethod: s.paymentMethod || 'Cash',
          amount: checkoutReceived,
          isPhysicalCash: isCash,
        });
      }
    }

    // 2. Customer Ledger Payments (Collections / Debt Recovery)
    for (const cle of (customerLedger || [])) {
      if (cle.type === 'payment_received') {
        const amt = Number(cle.amount ?? cle.credit) || 0;
        if (amt > 0) {
          const isCash = !cle.paymentMethod || cle.paymentMethod === 'Cash';
          list.push({
            id: cle.id,
            date: cle.date || cle.createdAt || new Date().toISOString(),
            type: 'inflow',
            category: 'Customer Debt Collection',
            description: cle.description || `Customer payment received (${cle.entryCode || 'Payment'})`,
            entityName: cle.customerName || 'Customer',
            referenceId: cle.billNumber || cle.referenceId || cle.id,
            paymentMethod: cle.paymentMethod || 'Cash',
            amount: amt,
            isPhysicalCash: isCash,
          });
        }
      } else if (cle.type === 'cash_refund') {
        const amt = Number(cle.amount ?? cle.debit) || 0;
        if (amt > 0) {
          list.push({
            id: cle.id,
            date: cle.date || cle.createdAt || new Date().toISOString(),
            type: 'outflow',
            category: 'Customer Cash Refund',
            description: cle.description || `Cash refund paid to customer (${cle.entryCode || 'Refund'})`,
            entityName: cle.customerName || 'Customer',
            referenceId: cle.billNumber || cle.referenceId || cle.id,
            paymentMethod: cle.paymentMethod || 'Cash',
            amount: amt,
            isPhysicalCash: true,
          });
        }
      }
    }

    // 3. Customer Returns (Cash Refunds on returns and Restock Fees)
    for (const cr of customerReturns) {
      const isCashRefund = cr.refundMethod === 'cash' || (cr as any).settlementMethod === 'cash';
      const refundAmt = Number(cr.totalRefundAmount ?? (cr as any).totalReturnAmount ?? 0);
      const feeAmt = Number(cr.deductionOrRestockFee ?? (cr as any).restockFee ?? 0);
      const crDate = cr.date || (cr as any).returnDate || cr.createdAt || new Date().toISOString();

      if (isCashRefund && refundAmt > 0) {
        list.push({
          id: `cr-refund-${cr.id}`,
          date: crDate,
          type: 'outflow',
          category: 'Customer Return Refund',
          description: `Cash refund paid on Return Voucher #${cr.returnNumber || cr.id}`,
          entityName: cr.customerName || 'Customer',
          referenceId: cr.returnNumber || cr.id,
          paymentMethod: 'Cash',
          amount: refundAmt,
          isPhysicalCash: true,
        });
      }

      if (feeAmt > 0) {
        list.push({
          id: `cr-fee-${cr.id}`,
          date: crDate,
          type: 'inflow',
          category: 'Return Restock Fee',
          description: `Restock handling fee collected on Return #${cr.returnNumber || cr.id}`,
          entityName: cr.customerName || 'Customer',
          referenceId: cr.returnNumber || cr.id,
          paymentMethod: 'Cash',
          amount: feeAmt,
          isPhysicalCash: true,
        });
      }
    }

    // 4. Operating Expenses
    for (const exp of expenses) {
      const amt = Number(exp.amount) || 0;
      if (amt > 0) {
        const isCash = !exp.paymentMethod || exp.paymentMethod === 'Cash';
        list.push({
          id: exp.id,
          date: exp.date || exp.createdAt || new Date().toISOString(),
          type: 'outflow',
          category: exp.category || 'Operating Expense',
          description: `${exp.title}${exp.paidTo ? ` • Paid to: ${exp.paidTo}` : ''}`,
          entityName: exp.paidTo || exp.category,
          referenceId: exp.expenseNumber || exp.receiptNumber || exp.id,
          paymentMethod: exp.paymentMethod || 'Cash',
          amount: amt,
          isPhysicalCash: isCash,
        });
      }
    }

    // 5. Purchases (Cash paid at purchase receiving)
    for (const pur of purchases) {
      const purDate = pur.date || pur.createdAt || new Date().toISOString();
      const isCash = !pur.paymentMethod || pur.paymentMethod === 'Cash';

      const linkedVendorPayments = (vendorLedger || [])
        .filter(e => (e.referenceId === pur.id || e.billNumber === pur.billNumber) && (e.type === 'cash_sent' || (e.type as string) === 'debit'))
        .reduce((sum, e) => sum + (Number(e.amount ?? e.debit) || 0), 0);

      const checkoutPaid = Math.max(0, (Number(pur.amountPaid) || 0) - linkedVendorPayments);
      if (checkoutPaid > 0) {
        list.push({
          id: `pur-pay-${pur.id}`,
          date: purDate,
          type: 'outflow',
          category: 'Purchase Bill Payment',
          description: `Cash paid on purchase bill #${pur.billNumber || pur.id}`,
          entityName: pur.vendorName || 'Supplier',
          referenceId: pur.billNumber || pur.id,
          paymentMethod: pur.paymentMethod || 'Cash',
          amount: checkoutPaid,
          isPhysicalCash: isCash,
        });
      }
    }

    // 6. Vendor Ledger (Cash sent to suppliers or cash refunds received from suppliers)
    for (const vle of (vendorLedger || [])) {
      if (vle.type === 'cash_sent' || (vle.type as string) === 'debit') {
        const amt = Number(vle.amount ?? vle.debit) || 0;
        if (amt > 0) {
          const isCash = !vle.paymentMethod || vle.paymentMethod === 'Cash';
          list.push({
            id: vle.id,
            date: vle.date || vle.createdAt || new Date().toISOString(),
            type: 'outflow',
            category: 'Supplier Payment',
            description: vle.description || `Payment sent to supplier (${vle.entryCode || 'Cash Sent'})`,
            entityName: vle.vendorName || 'Supplier',
            referenceId: vle.billNumber || vle.referenceId || vle.id,
            paymentMethod: vle.paymentMethod || 'Cash',
            amount: amt,
            isPhysicalCash: isCash,
          });
        }
      } else if (vle.type === 'cash_received' || (vle.type as string) === 'credit') {
        const amt = Number(vle.amount ?? vle.credit) || 0;
        if (amt > 0 && vle.entryCode && vle.entryCode.toLowerCase().includes('cash')) {
          const isCash = !vle.paymentMethod || vle.paymentMethod === 'Cash';
          list.push({
            id: vle.id,
            date: vle.date || vle.createdAt || new Date().toISOString(),
            type: 'inflow',
            category: 'Vendor Cash Refund',
            description: vle.description || `Cash refund received from supplier (${vle.entryCode})`,
            entityName: vle.vendorName || 'Supplier',
            referenceId: vle.billNumber || vle.referenceId || vle.id,
            paymentMethod: vle.paymentMethod || 'Cash',
            amount: amt,
            isPhysicalCash: isCash,
          });
        }
      }
    }

    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sales, customerLedger, customerReturns, expenses, purchases, vendorLedger]);

  // Period Cash Flow & Drawer Liquidity Metrics
  const cashMetrics = useMemo(() => {
    const isTarget = (dateStr?: string) => {
      if (!dateStr) return false;
      try {
        const d = new Date(dateStr);
        return d >= dateBoundaries.start && d <= dateBoundaries.end;
      } catch {
        return false;
      }
    };

    const priorTxs = allCashTransactions.filter(t => new Date(t.date) < dateBoundaries.start);
    const openingPhysicalCash = priorTxs.reduce(
      (acc, t) => t.isPhysicalCash ? (t.type === 'inflow' ? acc + t.amount : acc - t.amount) : acc,
      0
    );

    const periodTxs = allCashTransactions.filter(t => isTarget(t.date));

    // Inflow Breakdown
    let posCashInflows = 0;
    let customerRecoveryInflows = 0;
    let vendorRefundInflows = 0;
    let restockFeeInflows = 0;
    let totalPeriodCashInflows = 0;
    let totalPeriodBankInflows = 0;

    // Outflow Breakdown
    let expenseCashOutflows = 0;
    let supplierCashOutflows = 0;
    let customerReturnRefundOutflows = 0;
    let totalPeriodCashOutflows = 0;
    let totalPeriodBankOutflows = 0;

    for (const t of periodTxs) {
      if (t.type === 'inflow') {
        if (t.isPhysicalCash) {
          totalPeriodCashInflows += t.amount;
          if (t.category === 'Counter POS Sale') posCashInflows += t.amount;
          else if (t.category === 'Customer Debt Collection') customerRecoveryInflows += t.amount;
          else if (t.category === 'Vendor Cash Refund') vendorRefundInflows += t.amount;
          else if (t.category === 'Return Restock Fee') restockFeeInflows += t.amount;
          else posCashInflows += t.amount;
        } else {
          totalPeriodBankInflows += t.amount;
        }
      } else {
        if (t.isPhysicalCash) {
          totalPeriodCashOutflows += t.amount;
          if (t.category === 'Customer Return Refund' || t.category === 'Customer Cash Refund') {
            customerReturnRefundOutflows += t.amount;
          } else if (t.category === 'Purchase Bill Payment' || t.category === 'Supplier Payment') {
            supplierCashOutflows += t.amount;
          } else {
            expenseCashOutflows += t.amount;
          }
        } else {
          totalPeriodBankOutflows += t.amount;
        }
      }
    }

    const netPeriodCashFlow = totalPeriodCashInflows - totalPeriodCashOutflows;
    const closingPhysicalCash = openingPhysicalCash + netPeriodCashFlow;
    const allTimeDrawerCash = allCashTransactions.reduce(
      (acc, t) => t.isPhysicalCash ? (t.type === 'inflow' ? acc + t.amount : acc - t.amount) : acc,
      0
    );

    const netRev = statement.netSales || 1;
    const cashRealizationPercent = Math.min(100, Math.max(0, (totalPeriodCashInflows / netRev) * 100));

    // Profit in hand vs receivables
    const realizedRatio = Math.min(1, Math.max(0, totalPeriodCashInflows / netRev));
    const profitInHand = statement.netIncome * realizedRatio;
    const profitInReceivables = statement.netIncome - profitInHand;

    return {
      openingPhysicalCash,
      posCashInflows,
      customerRecoveryInflows,
      vendorRefundInflows,
      restockFeeInflows,
      totalPeriodCashInflows,
      totalPeriodBankInflows,
      expenseCashOutflows,
      supplierCashOutflows,
      customerReturnRefundOutflows,
      totalPeriodCashOutflows,
      totalPeriodBankOutflows,
      netPeriodCashFlow,
      closingPhysicalCash,
      allTimeDrawerCash,
      cashRealizationPercent,
      profitInHand,
      profitInReceivables,
      cashReceivables: statement.totalCreditOutstanding || 0,
      periodTransactionsCount: periodTxs.length,
      allTransactionsCount: allCashTransactions.length,
    };
  }, [allCashTransactions, dateBoundaries, statement]);

  // Handle Expense Modal Actions
  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setExpenseForm({
      title: '',
      category: 'Shop Rent',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Cash',
      paidTo: '',
      receiptNumber: '',
      notes: '',
    });
    setShowExpenseModal(true);
  };

  const handleOpenEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      paymentMethod: expense.paymentMethod || 'Cash',
      paidTo: expense.paidTo || '',
      receiptNumber: expense.receiptNumber || '',
      notes: expense.notes || '',
    });
    setShowExpenseModal(true);
  };

  const handleSaveExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title.trim()) return;
    const numAmount = Math.max(0, Number(expenseForm.amount) || 0);

    onSaveExpense({
      id: editingExpense?.id,
      title: expenseForm.title.trim(),
      category: expenseForm.category,
      amount: numAmount,
      date: expenseForm.date,
      paymentMethod: expenseForm.paymentMethod,
      paidTo: expenseForm.paidTo.trim() || undefined,
      receiptNumber: expenseForm.receiptNumber.trim() || undefined,
      notes: expenseForm.notes.trim() || undefined,
    });

    setShowExpenseModal(false);
  };

  // Filtered Expenses List
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchesSearch = 
        (e.title || '').toLowerCase().includes(expenseSearch.toLowerCase()) ||
        (e.expenseNumber || '').toLowerCase().includes(expenseSearch.toLowerCase()) ||
        (e.paidTo || '').toLowerCase().includes(expenseSearch.toLowerCase()) ||
        (e.receiptNumber || '').toLowerCase().includes(expenseSearch.toLowerCase());
      
      const matchesCategory = expenseCategoryFilter === 'all' || e.category === expenseCategoryFilter;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, expenseSearch, expenseCategoryFilter]);

  // Export Income Statement to Excel / CSV
  const handleExportStatementExcel = () => {
    const data = [
      ['KFH FILTER HOUSE & PRECISION SPARE PARTS'],
      ['STATEMENT OF PROFIT AND LOSS (INCOME STATEMENT)'],
      [`Period: ${dateBoundaries.label} (${dateBoundaries.startStr} to ${dateBoundaries.endStr})`],
      [`Generated: ${new Date().toLocaleString('en-PK')}`],
      ['Currency: Pakistani Rupee (PKR - ₨)'],
      [''],
      ['ACCOUNTING CLASSIFICATION', 'CURRENT PERIOD (PKR)', 'NOTES / DETAIL'],
      ['I. REVENUE FROM OPERATIONS', '', ''],
      ['  Gross Sales (Invoiced Revenue)', statement.grossSales, `${statement.salesCount} Sales Invoices`],
      ['  Less: Sales Returns & Credit Notes', -statement.salesReturns, `${statement.customerReturnsCount} Return Vouchers`],
      ['  Less: Trade Discounts Allowed', -statement.salesDiscounts, 'Cash & Volume Discounts'],
      ['TOTAL NET REVENUE', statement.netSales, 'Net Operating Inflow'],
      [''],
      ['II. COST OF GOODS SOLD (COGS)', '', ''],
      ['  Cost of Stock Sold (FIFO Valuation)', statement.fifoCOGS, 'Direct Weighted Landed Cost'],
      ['  Damaged / Scrap Inventory Losses', statement.damagedLoss, 'Write-offs from Returns'],
      ['TOTAL COST OF GOODS SOLD', statement.totalCOGS, 'Cost of Goods Sold'],
      [''],
      ['GROSS PROFIT / (TRADING LOSS)', statement.grossProfit, `Gross Margin: ${statement.grossProfitMargin.toFixed(2)}%`],
      [''],
      ['III. OPERATING EXPENSES (OPEX)', '', ''],
      ...EXPENSE_CATEGORIES.map(cat => [
        `  ${cat}`,
        statement.expensesByCategory[cat] || 0,
        'Shop Overhead'
      ]),
      ['TOTAL OPERATING EXPENSES', statement.totalOperatingExpenses, `${statement.expensesCount} Logged Expenses`],
      [''],
      ['OPERATING INCOME / EBIT', statement.operatingIncome, `Operating Margin: ${statement.operatingMargin.toFixed(2)}%`],
      [''],
      ['IV. OTHER INCOME / ADJUSTMENTS', '', ''],
      ['  Restock & Handling Fees Collected', statement.restockFeesCollected, 'Sales Returns Restock Fee'],
      ['TOTAL OTHER INCOME', statement.otherIncomeTotal, 'Non-core Inflow'],
      [''],
      ['NET PROFIT / NET INCOME (BOTTOM LINE)', statement.netIncome, `Net Margin: ${statement.netProfitMargin.toFixed(2)}%`],
      [''],
      ['V. CASH IN HAND & REALIZED LIQUIDITY RECONCILIATION', '', ''],
      ['  Opening Cash in Hand (Period Start)', cashMetrics.openingPhysicalCash, 'Beginning Drawer Cash'],
      ['  Add: Counter POS Cash Sales', cashMetrics.posCashInflows, 'Cash Collected at Counter Checkout'],
      ['  Add: Customer Recoveries & Collections', cashMetrics.customerRecoveryInflows, 'Customer Ledger Debt Payments'],
      ['  Add: Supplier Cash Refunds Received', cashMetrics.vendorRefundInflows, 'Vendor Cash Returns'],
      ['  Add: Return Restock Fees Collected', cashMetrics.restockFeeInflows, 'Cash Handling Fees'],
      ['TOTAL CASH INFLOWS', cashMetrics.totalPeriodCashInflows, 'Total Liquid Cash Inflow'],
      ['  Less: Operating Expenses Paid in Cash', -cashMetrics.expenseCashOutflows, 'Cash Shop Overheads'],
      ['  Less: Cash Paid to Suppliers (Purchases)', -cashMetrics.supplierCashOutflows, 'Cash Stock Purchases & Sent'],
      ['  Less: Cash Refunds Paid on Returns', -cashMetrics.customerReturnRefundOutflows, 'Cash Returned to Customers'],
      ['TOTAL CASH OUTFLOWS', -cashMetrics.totalPeriodCashOutflows, 'Total Liquid Cash Outflow'],
      ['NET OPERATING CASH FLOW (PERIOD)', cashMetrics.netPeriodCashFlow, 'Net Cash Generated / (Drawn)'],
      ['CLOSING PHYSICAL CASH IN HAND (PERIOD END)', cashMetrics.closingPhysicalCash, 'Ending Cash Drawer Balance'],
      ['CUMULATIVE CASH IN HAND (CURRENT DRAWER BALANCE)', cashMetrics.allTimeDrawerCash, 'Live Till / Cash Register Position'],
      [''],
      ['VI. LIQUIDITY QUALITY & RATIOS', '', ''],
      ['  Cash Realization Rate', `${cashMetrics.cashRealizationPercent.toFixed(1)}%`, 'Percent of Sales Realized in Cash'],
      ['  Profit in Hand (Realized from Cash Collections)', cashMetrics.profitInHand, 'Cash-Backed Net Income'],
      ['  Profit in Receivables (Locked in Customer Debt)', cashMetrics.profitInReceivables, 'Accrual Profit Pending Collection'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Income Statement');
    XLSX.writeFile(wb, `Income_Statement_${dateBoundaries.startStr}_to_${dateBoundaries.endStr}.xlsx`);
  };

  // Export Detailed Cash Journal to Excel
  const handleExportCashJournalExcel = () => {
    const isTarget = (dateStr?: string) => {
      if (!dateStr) return false;
      try {
        const d = new Date(dateStr);
        return d >= dateBoundaries.start && d <= dateBoundaries.end;
      } catch {
        return false;
      }
    };

    const targetTxs = (cashViewScope === 'period' 
      ? allCashTransactions.filter(t => isTarget(t.date))
      : allCashTransactions
    );

    let running = cashViewScope === 'period' ? cashMetrics.openingPhysicalCash : 0;
    const rows = targetTxs.map((t, idx) => {
      const delta = t.isPhysicalCash ? (t.type === 'inflow' ? t.amount : -t.amount) : 0;
      running += delta;
      return {
        '#': idx + 1,
        'Date & Time': new Date(t.date).toLocaleString('en-PK'),
        'Direction': t.type === 'inflow' ? 'Cash Inflow (+)' : 'Cash Outflow (-)',
        'Category / Source': t.category,
        'Description': t.description,
        'Party / Entity': t.entityName || '',
        'Reference ID': t.referenceId || '',
        'Payment Method': t.paymentMethod,
        'Is Physical Cash': t.isPhysicalCash ? 'Yes (Drawer)' : 'No (Bank/Online)',
        'Inflow Amount (PKR)': t.type === 'inflow' ? t.amount : '',
        'Outflow Amount (PKR)': t.type === 'outflow' ? t.amount : '',
        'Running Drawer Balance (PKR)': running,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cash Journal');
    XLSX.writeFile(wb, `Cash_Journal_${cashViewScope === 'period' ? dateBoundaries.startStr + '_to_' + dateBoundaries.endStr : 'All_Time'}.xlsx`);
  };

  // Computations for Cash Flow Journal Audit Modal
  const modalCashJournalData = useMemo(() => {
    const isTarget = (dateStr?: string) => {
      if (!dateStr) return false;
      try {
        const d = new Date(dateStr);
        return d >= dateBoundaries.start && d <= dateBoundaries.end;
      } catch {
        return false;
      }
    };

    const targetTxs = cashViewScope === 'period'
      ? allCashTransactions.filter(t => isTarget(t.date))
      : allCashTransactions;

    const openingBalance = cashViewScope === 'period' ? cashMetrics.openingPhysicalCash : 0;
    let running = openingBalance;

    const withRunning = targetTxs.map((t) => {
      if (t.isPhysicalCash) {
        if (t.type === 'inflow') {
          running += t.amount;
        } else {
          running -= t.amount;
        }
      }
      return {
        ...t,
        runningBalance: running,
      };
    });

    const filtered = withRunning.filter((t) => {
      if (cashJournalFilter === 'inflow' && t.type !== 'inflow') return false;
      if (cashJournalFilter === 'outflow' && t.type !== 'outflow') return false;
      if (cashJournalFilter === 'cash_only' && !t.isPhysicalCash) return false;
      if (cashJournalFilter === 'bank_only' && t.isPhysicalCash) return false;

      if (cashJournalSearch.trim()) {
        const q = cashJournalSearch.toLowerCase();
        const match =
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.entityName && t.entityName.toLowerCase().includes(q)) ||
          (t.referenceId && t.referenceId.toLowerCase().includes(q)) ||
          t.paymentMethod.toLowerCase().includes(q) ||
          t.amount.toString().includes(q);
        if (!match) return false;
      }
      return true;
    });

    const totalCashInflows = targetTxs
      .filter(t => t.type === 'inflow' && t.isPhysicalCash)
      .reduce((s, t) => s + t.amount, 0);

    const totalCashOutflows = targetTxs
      .filter(t => t.type === 'outflow' && t.isPhysicalCash)
      .reduce((s, t) => s + t.amount, 0);

    const netCashFlow = totalCashInflows - totalCashOutflows;
    const closingDrawer = openingBalance + netCashFlow;

    return {
      transactions: filtered,
      totalCount: targetTxs.length,
      filteredCount: filtered.length,
      openingBalance,
      totalCashInflows,
      totalCashOutflows,
      netCashFlow,
      closingDrawer,
    };
  }, [allCashTransactions, cashViewScope, cashJournalFilter, cashJournalSearch, dateBoundaries, cashMetrics.openingPhysicalCash]);

  // Direct Print Window
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* 1. HEADER & PERIOD CONTROLS (Screen view only) */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-300 shadow-lg print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Title & Brand */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shadow-emerald-600/20">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Income Statement (P&L)
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black rounded-lg">
                    Multi-Step Accounting
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Official Statement of Profit & Loss with revenue deductions, FIFO COGS, and operating expenses.
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Mode Tabs & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* View Tab Toggle */}
            <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('statement')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'statement' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                P&L Statement
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('expenses_manager')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'expenses_manager' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Expenses Manager ({expenses.length})
              </button>
            </div>

            {/* + Add Expense Button */}
            <button
              type="button"
              onClick={handleOpenAddExpense}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Record shop rent, electricity, wages or courier expense"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Record Expense</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Print formal Income Statement sheet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print P&L</span>
            </button>

            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportStatementExcel}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Export complete financial statement to Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          </div>
        </div>

        {/* Reporting Period Filter Bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-red-600" /> Period:
            </span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as IncomeStatementPeriod)}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded-xl text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month ({new Date().toLocaleString('default', { month: 'short' })})</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Fiscal Year ({new Date().getFullYear()})</option>
              <option value="last_year">Last Fiscal Year ({new Date().getFullYear() - 1})</option>
              <option value="all_time">All Time Cumulative</option>
              <option value="custom">Custom Date Range...</option>
            </select>

            {period === 'custom' && (
              <div className="flex items-center gap-1.5 bg-slate-200 p-1 rounded-xl border border-slate-200 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                />
                <span className="text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>
            )}

            {/* Comparison Mode Toggle */}
            <label className="flex items-center gap-1.5 ml-2 cursor-pointer select-none text-slate-600 font-bold">
              <input
                type="checkbox"
                checked={compareWithPrevious}
                onChange={(e) => setCompareWithPrevious(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <span>Compare with Previous Period</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">
              Scope: <strong>{dateBoundaries.startStr}</strong> to <strong>{dateBoundaries.endStr}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* 2. EXECUTIVE HIGHLIGHT CARDS (P&L Snapshot) */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
        
        {/* Net Sales */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block truncate">
            1. Net Revenue
          </span>
          <span className="text-base sm:text-xl font-black text-slate-900 block font-mono mt-1 truncate">
            {formatPKRShort(statement.netSales)}
          </span>
          <span className="text-[10px] text-slate-400 block font-medium mt-0.5 truncate">
            Gross: {formatPKRShort(statement.grossSales)}
          </span>
        </div>

        {/* COGS */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block truncate">
            2. Cost of Sales
          </span>
          <span className="text-base sm:text-xl font-black text-slate-900 block font-mono mt-1 truncate">
            {formatPKRShort(statement.totalCOGS)}
          </span>
          <span className="text-[10px] text-slate-400 block font-medium mt-0.5 truncate">
            FIFO Product Cost
          </span>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block truncate">
            3. Gross Profit
          </span>
          <span className={`text-base sm:text-xl font-black block font-mono mt-1 truncate ${
            statement.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {formatPKRShort(statement.grossProfit)}
          </span>
          <span className="text-[10px] font-bold text-slate-600 block mt-0.5">
            Margin: <strong>{statement.grossProfitMargin.toFixed(1)}%</strong>
          </span>
        </div>

        {/* OPEX */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block truncate">
            4. Overheads
          </span>
          <span className="text-base sm:text-xl font-black text-slate-900 block font-mono mt-1 truncate">
            {formatPKRShort(statement.totalOperatingExpenses)}
          </span>
          <span className="text-[10px] text-slate-400 block font-medium mt-0.5 truncate">
            {statement.expensesCount} Overheads Logged
          </span>
        </div>

        {/* Net Income */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-md border border-slate-800">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block truncate">
            5. Net Profit
          </span>
          <span className={`text-base sm:text-xl font-black block font-mono mt-1 truncate ${
            statement.netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {formatPKRShort(statement.netIncome)}
          </span>
          <span className="text-[10px] font-bold text-slate-300 block mt-0.5">
            Margin: <strong>{statement.netProfitMargin.toFixed(1)}%</strong>
          </span>
        </div>

        {/* 6. Cash in Hand (Net Flow & Drawer) */}
        <div 
          onClick={() => setShowCashJournalModal(true)}
          className="bg-emerald-950/20 hover:bg-emerald-950/30 p-3.5 sm:p-4 rounded-2xl border-2 border-emerald-500/50 hover:border-emerald-500 transition-all cursor-pointer shadow-sm group"
          title="Click to inspect complete Cash Inflow & Outflow Journal (Cash Book)"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block truncate flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5 text-emerald-600 inline" /> 6. Cash in Hand
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-black group-hover:scale-105 transition-transform">
              Cash Book
            </span>
          </div>
          <span className={`text-base sm:text-xl font-black block font-mono mt-1 truncate ${
            cashMetrics.netPeriodCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'
          }`}>
            {formatPKRShort(cashMetrics.netPeriodCashFlow)}
          </span>
          <span className="text-[10px] text-slate-600 block font-bold mt-0.5 truncate">
            Till: <strong className="text-slate-900 font-mono">{formatPKRShort(cashMetrics.allTimeDrawerCash)}</strong>
          </span>
        </div>

      </section>

      {/* 3. MAIN P&L STATEMENT TABLE (Print-Formatted & Formal Accounting Sheet) */}
      {activeTab === 'statement' ? (
        <section className="bg-white rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-sm space-y-6 print:p-0 print:border-none print:shadow-none">
          
          {/* Formal Accounting Report Title Header */}
          <div className="text-center pb-5 border-b-2 border-slate-900 space-y-1">
            <div className="flex items-center justify-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center">
                ₨
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                KFH Filter House & Precision Parts
              </h2>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-700 uppercase tracking-wider">
              Statement of Profit and Loss (Income Statement)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              For the Period Ended: <strong className="text-slate-800">{dateBoundaries.label}</strong> ({dateBoundaries.startStr} to {dateBoundaries.endStr})
            </p>
            <p className="text-[11px] font-mono text-slate-400 font-semibold">
              Amounts Expressed in Pakistani Rupees (PKR)
            </p>
          </div>

          {/* Statement Accounting Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 text-slate-900 text-xs font-black uppercase tracking-wider">
                  <th className="py-2.5 px-3">Account Description</th>
                  <th className="py-2.5 px-3 text-right">Details (₨)</th>
                  <th className="py-2.5 px-3 text-right">Current Period ({dateBoundaries.label})</th>
                  {compareWithPrevious && (
                    <>
                      <th className="py-2.5 px-3 text-right text-slate-500">Prior ({dateBoundaries.prevLabel})</th>
                      <th className="py-2.5 px-3 text-right text-slate-500">Variance</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                
                {/* ---------------- 1. REVENUE FROM OPERATIONS ---------------- */}
                <tr className="bg-slate-200/80 font-black text-slate-900">
                  <td colSpan={compareWithPrevious ? 5 : 3} className="py-2 px-3 tracking-wide">
                    1. REVENUE FROM OPERATIONS
                  </td>
                </tr>

                {/* Gross Sales */}
                <tr className="hover:bg-slate-300/50">
                  <td className="py-2 px-3 pl-6">
                    <span className="font-semibold text-slate-800">Gross Sales Revenue</span>
                    <span className="text-[11px] text-slate-400 block">({statement.salesCount} Invoices generated)</span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600">
                    {formatPKR(statement.grossSales)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono"></td>
                  {compareWithPrevious && (
                    <>
                      <td className="py-2 px-3 text-right font-mono text-slate-400">{formatPKR(priorStatement.grossSales)}</td>
                      <td className="py-2 px-3 text-right font-mono text-xs">
                        {statement.grossSales >= priorStatement.grossSales ? (
                          <span className="text-emerald-600">+{((statement.grossSales - priorStatement.grossSales) / (priorStatement.grossSales || 1) * 100).toFixed(1)}%</span>
                        ) : (
                          <span className="text-rose-600">{((statement.grossSales - priorStatement.grossSales) / (priorStatement.grossSales || 1) * 100).toFixed(1)}%</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>

                {/* Sales Returns */}
                <tr className="hover:bg-slate-300/50 text-slate-700">
                  <td className="py-2 px-3 pl-6">
                    <span className="text-rose-700 font-semibold">Less: Sales Returns & Allowances</span>
                    <span className="text-[11px] text-slate-400 block">({statement.customerReturnsCount} Credit notes issued to customers)</span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-rose-700">
                    ({formatPKR(statement.salesReturns)})
                  </td>
                  <td className="py-2 px-3 text-right font-mono"></td>
                  {compareWithPrevious && (
                    <>
                      <td className="py-2 px-3 text-right font-mono text-slate-400">({formatPKR(priorStatement.salesReturns)})</td>
                      <td className="py-2 px-3 text-right font-mono text-xs text-slate-400">—</td>
                    </>
                  )}
                </tr>

                {/* Sales Discounts */}
                {statement.salesDiscounts > 0 && (
                  <tr className="hover:bg-slate-300/50 text-slate-700">
                    <td className="py-2 px-3 pl-6">
                      <span className="text-rose-700 font-semibold">Less: Trade Discounts Allowed</span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-rose-700">
                      ({formatPKR(statement.salesDiscounts)})
                    </td>
                    <td className="py-2 px-3 text-right font-mono"></td>
                    {compareWithPrevious && (
                      <>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">({formatPKR(priorStatement.salesDiscounts)})</td>
                        <td className="py-2 px-3 text-right font-mono text-xs text-slate-400">—</td>
                      </>
                    )}
                  </tr>
                )}

                {/* Net Sales Subtotal */}
                <tr className="bg-slate-200/70 font-black text-slate-900 border-t border-b border-slate-300">
                  <td className="py-2.5 px-3 pl-6">
                    TOTAL NET REVENUE (A)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500"></td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700 text-sm sm:text-base">
                    {formatPKR(statement.netSales)}
                  </td>
                  {compareWithPrevious && (
                    <>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatPKR(priorStatement.netSales)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-black">
                        {statement.netSales >= priorStatement.netSales ? (
                          <span className="text-emerald-600">+{((statement.netSales - priorStatement.netSales) / (priorStatement.netSales || 1) * 100).toFixed(1)}%</span>
                        ) : (
                          <span className="text-rose-600">{((statement.netSales - priorStatement.netSales) / (priorStatement.netSales || 1) * 100).toFixed(1)}%</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>

                {/* ---------------- 2. COST OF GOODS SOLD (COGS) ---------------- */}
                <tr className="bg-slate-200/80 font-black text-slate-900">
                  <td colSpan={compareWithPrevious ? 5 : 3} className="py-2 px-3 tracking-wide">
                    2. COST OF GOODS SOLD (COGS)
                  </td>
                </tr>

                <tr className="hover:bg-slate-300/50">
                  <td className="py-2 px-3 pl-6">
                    <span className="font-semibold text-slate-800">Direct FIFO Inventory Cost of Sold Parts</span>
                    <span className="text-[11px] text-slate-400 block">Weighted average cost basis per batch sold</span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600">
                    {formatPKR(statement.fifoCOGS)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono"></td>
                  {compareWithPrevious && (
                    <>
                      <td className="py-2 px-3 text-right font-mono text-slate-400">{formatPKR(priorStatement.fifoCOGS)}</td>
                      <td className="py-2 px-3 text-right font-mono text-xs text-slate-400">—</td>
                    </>
                  )}
                </tr>

                {statement.damagedLoss > 0 && (
                  <tr className="hover:bg-slate-300/50">
                    <td className="py-2 px-3 pl-6">
                      <span className="font-semibold text-slate-800">Damaged & Scrap Parts Written-off</span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">
                      {formatPKR(statement.damagedLoss)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono"></td>
                    {compareWithPrevious && (
                      <>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">{formatPKR(priorStatement.damagedLoss)}</td>
                        <td className="py-2 px-3 text-right font-mono text-xs text-slate-400">—</td>
                      </>
                    )}
                  </tr>
                )}

                {/* Total COGS Subtotal */}
                <tr className="bg-slate-200/70 font-black text-slate-900 border-t border-b border-slate-300">
                  <td className="py-2.5 px-3 pl-6">
                    TOTAL COST OF GOODS SOLD (B)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500"></td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 text-sm sm:text-base">
                    ({formatPKR(statement.totalCOGS)})
                  </td>
                  {compareWithPrevious && (
                    <>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">({formatPKR(priorStatement.totalCOGS)})</td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-400">—</td>
                    </>
                  )}
                </tr>

                {/* ---------------- 3. GROSS PROFIT ---------------- */}
                <tr className="bg-emerald-50/90 font-black text-emerald-950 border-t-2 border-b-2 border-emerald-400 text-sm sm:text-base">
                  <td className="py-3 px-3">
                    GROSS PROFIT / (LOSS) (A - B)
                    <span className="text-xs font-bold text-emerald-800 block mt-0.5">
                      Gross Margin: {statement.grossProfitMargin.toFixed(2)}% of Net Sales
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono"></td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-900 font-black text-base sm:text-lg">
                    {formatPKR(statement.grossProfit)}
                  </td>
                  {compareWithPrevious && (
                    <>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 font-black">{formatPKR(priorStatement.grossProfit)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs font-black">
                        {statement.grossProfit >= priorStatement.grossProfit ? (
                          <span className="text-emerald-700">+{((statement.grossProfit - priorStatement.grossProfit) / (priorStatement.grossProfit || 1) * 100).toFixed(1)}%</span>
                        ) : (
                          <span className="text-rose-700">{((statement.grossProfit - priorStatement.grossProfit) / (priorStatement.grossProfit || 1) * 100).toFixed(1)}%</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>

                {/* ---------------- 4. OPERATING EXPENSES (OPEX) ---------------- */}
                <tr className="bg-slate-200/80 font-black text-slate-900">
                  <td colSpan={compareWithPrevious ? 5 : 3} className="py-2 px-3 tracking-wide flex items-center justify-between">
                    <span>3. OPERATING OVERHEAD EXPENSES (OPEX)</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('expenses_manager')}
                      className="text-xs text-red-600 hover:text-red-700 hover:underline font-bold print:hidden"
                    >
                      Manage Logged Expenses ({expenses.length}) →
                    </button>
                  </td>
                </tr>

                {EXPENSE_CATEGORIES.map(cat => {
                  const amt = statement.expensesByCategory[cat] || 0;
                  const priorAmt = priorStatement.expensesByCategory[cat] || 0;

                  return (
                    <tr key={cat} className={`hover:bg-slate-300/50 ${amt === 0 ? 'text-slate-400' : 'text-slate-800'}`}>
                      <td className="py-1.5 px-3 pl-6">
                        <span className="font-semibold">{cat}</span>
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono">
                        {amt > 0 ? formatPKR(amt) : '—'}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono"></td>
                      {compareWithPrevious && (
                        <>
                          <td className="py-1.5 px-3 text-right font-mono text-slate-400">{priorAmt > 0 ? formatPKR(priorAmt) : '—'}</td>
                          <td className="py-1.5 px-3 text-right font-mono text-xs text-slate-400">—</td>
                        </>
                      )}
                    </tr>
                  );
                })}

                {/* Total Operating Expenses Subtotal */}
                <tr className="bg-slate-200/70 font-black text-slate-900 border-t border-b border-slate-300">
                  <td className="py-2.5 px-3 pl-6">
                    TOTAL OPERATING OVERHEADS (C)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500"></td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-700 text-sm sm:text-base">
                    ({formatPKR(statement.totalOperatingExpenses)})
                  </td>
                  {compareWithPrevious && (
                    <>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">({formatPKR(priorStatement.totalOperatingExpenses)})</td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-400">—</td>
                    </>
                  )}
                </tr>

                {/* ---------------- 5. OPERATING INCOME (EBIT) ---------------- */}
                <tr className="bg-slate-200/80 font-black text-slate-900 border-t border-b border-slate-300">
                  <td className="py-2.5 px-3">
                    OPERATING INCOME / EBIT (Gross Profit - OPEX)
                    <span className="text-xs font-bold text-slate-500 block">
                      Operating Margin: {statement.operatingMargin.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500"></td>
                  <td className={`py-2.5 px-3 text-right font-mono font-black text-sm sm:text-base ${
                    statement.operatingIncome >= 0 ? 'text-slate-900' : 'text-rose-700'
                  }`}>
                    {formatPKR(statement.operatingIncome)}
                  </td>
                  {compareWithPrevious && (
                    <>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatPKR(priorStatement.operatingIncome)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-400">—</td>
                    </>
                  )}
                </tr>

                {/* ---------------- 6. OTHER INCOME / ADJUSTMENTS ---------------- */}
                <tr className="bg-slate-200/80 font-black text-slate-900">
                  <td colSpan={compareWithPrevious ? 5 : 3} className="py-2 px-3 tracking-wide">
                    4. OTHER INCOME & ADJUSTMENTS
                  </td>
                </tr>

                <tr className="hover:bg-slate-300/50">
                  <td className="py-2 px-3 pl-6">
                    <span className="font-semibold text-slate-800">Restock & Handling Fees Collected</span>
                    <span className="text-[11px] text-slate-400 block">Fees charged on returned goods</span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600">
                    {formatPKR(statement.restockFeesCollected)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono"></td>
                  {compareWithPrevious && (
                    <>
                      <td className="py-2 px-3 text-right font-mono text-slate-400">{formatPKR(priorStatement.restockFeesCollected)}</td>
                      <td className="py-2 px-3 text-right font-mono text-xs text-slate-400">—</td>
                    </>
                  )}
                </tr>

                {/* ---------------- 7. NET PROFIT / NET INCOME (BOTTOM LINE) ---------------- */}
                <tr className="bg-slate-900 text-white font-black border-t-4 border-b-4 border-slate-950 text-base sm:text-lg">
                  <td className="py-4 px-3">
                    <div className="flex items-center gap-2">
                      <span>NET PROFIT / (NET LOSS) (BOTTOM LINE)</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                        statement.netIncome >= 0 ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                      }`}>
                        {statement.netIncome >= 0 ? 'Profitable' : 'Net Loss'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-300 block mt-0.5">
                      Net Profit Margin: <strong>{statement.netProfitMargin.toFixed(2)}%</strong> of Net Revenue
                    </span>
                  </td>
                  <td className="py-4 px-3 text-right font-mono"></td>
                  <td className={`py-4 px-3 text-right font-mono font-black text-lg sm:text-2xl ${
                    statement.netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {formatPKR(statement.netIncome)}
                  </td>
                  {compareWithPrevious && (
                    <>
                      <td className="py-4 px-3 text-right font-mono text-slate-300 text-base font-black">{formatPKR(priorStatement.netIncome)}</td>
                      <td className="py-4 px-3 text-right font-mono text-xs font-black">
                        {statement.netIncome >= priorStatement.netIncome ? (
                          <span className="text-emerald-400">+{((statement.netIncome - priorStatement.netIncome) / (Math.abs(priorStatement.netIncome) || 1) * 100).toFixed(1)}%</span>
                        ) : (
                          <span className="text-rose-400">{((statement.netIncome - priorStatement.netIncome) / (Math.abs(priorStatement.netIncome) || 1) * 100).toFixed(1)}%</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>

                {/* ---------------- 8. SECTION V: CASH IN HAND & REALIZED LIQUIDITY RECONCILIATION ---------------- */}
                <tr className="bg-slate-100 text-slate-800 font-black border-t-2 border-slate-300">
                  <td colSpan={compareWithPrevious ? 5 : 3} className="py-2.5 px-3 uppercase text-xs tracking-wider text-slate-700 bg-slate-200">
                    V. Cash in Hand & Realized Liquidity Reconciliation
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 text-xs">
                  <td className="py-2 px-3 pl-6">
                    <span className="font-semibold text-slate-800">Opening Physical Cash in Hand (Period Start)</span>
                    <span className="text-[11px] text-slate-400 block">Drawer / register balance at beginning of period</span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600"></td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatPKR(cashMetrics.openingPhysicalCash)}</td>
                  {compareWithPrevious && <td colSpan={2} className="py-2 px-3"></td>}
                </tr>
                <tr className="hover:bg-slate-50 text-xs">
                  <td className="py-2 px-3 pl-6">
                    <span className="font-semibold text-emerald-700">Add: Total Operating Cash Inflows</span>
                    <span className="text-[11px] text-slate-400 block">POS counter sales, customer recoveries & refunds</span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-600 font-bold">{formatPKR(cashMetrics.totalPeriodCashInflows)}</td>
                  <td className="py-2 px-3 text-right font-mono"></td>
                  {compareWithPrevious && <td colSpan={2} className="py-2 px-3"></td>}
                </tr>
                <tr className="hover:bg-slate-50 text-xs">
                  <td className="py-2 px-3 pl-6">
                    <span className="font-semibold text-rose-700">Less: Total Operating Cash Outflows</span>
                    <span className="text-[11px] text-slate-400 block">Cash expenses, supplier stock payments & customer refunds</span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-rose-600 font-bold">-{formatPKR(cashMetrics.totalPeriodCashOutflows)}</td>
                  <td className="py-2 px-3 text-right font-mono"></td>
                  {compareWithPrevious && <td colSpan={2} className="py-2 px-3"></td>}
                </tr>
                <tr className="bg-emerald-50/60 font-bold text-xs border-t border-slate-200">
                  <td className="py-2.5 px-3 pl-6">
                    <span className="text-emerald-950 font-black">Net Cash Flow Generated in Period</span>
                    <span className="text-[11px] text-emerald-700 block">Net liquid funds added / (drawn) across drawer</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono"></td>
                  <td className={`py-2.5 px-3 text-right font-mono font-black ${cashMetrics.netPeriodCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatPKR(cashMetrics.netPeriodCashFlow)}
                  </td>
                  {compareWithPrevious && <td colSpan={2} className="py-2 px-3"></td>}
                </tr>
                <tr className="bg-slate-800 text-white font-black text-xs sm:text-sm">
                  <td className="py-3 px-3 pl-6">
                    <span className="text-white font-black">Closing Physical Cash in Hand (Period End)</span>
                    <span className="text-[11px] text-slate-300 block">Physical cash register position at period close</span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono"></td>
                  <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 text-sm sm:text-base">
                    {formatPKR(cashMetrics.closingPhysicalCash)}
                  </td>
                  {compareWithPrevious && <td colSpan={2} className="py-2 px-3"></td>}
                </tr>

              </tbody>
            </table>
          </div>

          {/* Advanced Financial Breakdown: Cash in Hand Intelligence & Supplier Payables Distribution */}
          <div className="mt-8 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-5 sm:p-8 shadow-2xl border border-slate-800 space-y-6 print:hidden">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/30">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    <span>Cash in Hand & Direct Cash Flow Intelligence</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                      Live Till Audit
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time drawer reconciliation, counter cash, customer debt recoveries, and supplier cash settlements
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCashJournalModal(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 stroke-[2.5]" />
                  <span>Open Cash Book ({cashMetrics.periodTransactionsCount})</span>
                </button>
              </div>
            </div>

            {/* 4 Core Liquidity KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Physical Drawer Balance (All-Time Live) */}
              <div className="bg-slate-950/70 p-4 rounded-2xl border-2 border-emerald-500/40 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="font-bold flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-emerald-400" />
                    Physical Cash in Hand
                  </span>
                  <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                    Live Till
                  </span>
                </div>
                <div className="text-2xl font-mono font-black text-emerald-400">
                  {formatPKR(cashMetrics.allTimeDrawerCash)}
                </div>
                <p className="text-[11px] text-slate-400">
                  Actual physical cash balance in the register drawer across all settled cash entries.
                </p>
              </div>

              {/* Card 2: Net Cash Flow in Period */}
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="font-bold flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Net Period Cash Flow
                  </span>
                  <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border ${
                    cashMetrics.netPeriodCashFlow >= 0 
                      ? 'text-emerald-400 bg-emerald-950/80 border-emerald-800' 
                      : 'text-rose-400 bg-rose-950/80 border-rose-800'
                  }`}>
                    {cashMetrics.netPeriodCashFlow >= 0 ? '+ Surplus' : '- Deficit'}
                  </span>
                </div>
                <div className={`text-2xl font-mono font-black ${
                  cashMetrics.netPeriodCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatPKR(cashMetrics.netPeriodCashFlow)}
                </div>
                <p className="text-[11px] text-slate-400">
                  Net liquid funds added to drawer this period (vs Book Profit: {formatPKRShort(statement.netIncome)}).
                </p>
              </div>

              {/* Card 3: Cash Inflows */}
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="font-bold flex items-center gap-1.5">
                    <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                    Total Cash Inflows
                  </span>
                  <span className="text-[10px] font-black text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                    Period
                  </span>
                </div>
                <div className="text-2xl font-mono font-black text-white">
                  {formatPKR(cashMetrics.totalPeriodCashInflows)}
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  POS Sales: {formatPKRShort(cashMetrics.posCashInflows)} • Recoveries: {formatPKRShort(cashMetrics.customerRecoveryInflows)}
                </p>
              </div>

              {/* Card 4: Cash Outflows */}
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="font-bold flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4 text-rose-400" />
                    Total Cash Outflows
                  </span>
                  <span className="text-[10px] font-black text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                    Period
                  </span>
                </div>
                <div className="text-2xl font-mono font-black text-white">
                  {formatPKR(cashMetrics.totalPeriodCashOutflows)}
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Expenses: {formatPKRShort(cashMetrics.expenseCashOutflows)} • Suppliers: {formatPKRShort(cashMetrics.supplierCashOutflows)}
                </p>
              </div>

            </div>

            {/* Inflows vs Outflows Detailed Waterfall Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Pillar 1: Liquid Cash Inflows */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                    1. Liquid Cash Inflows (Collections & Receipts)
                  </h4>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    +{formatPKR(cashMetrics.totalPeriodCashInflows)}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                    <div>
                      <span className="font-semibold text-slate-200 block">Direct POS Counter Cash Sales</span>
                      <span className="text-[10px] text-slate-400">Cash collected across the counter at checkout</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">+{formatPKR(cashMetrics.posCashInflows)}</span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                    <div>
                      <span className="font-semibold text-slate-200 block">Customer Debt Collections & Recoveries</span>
                      <span className="text-[10px] text-slate-400">Cash paid on outstanding customer ledger accounts</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">+{formatPKR(cashMetrics.customerRecoveryInflows)}</span>
                  </div>

                  {cashMetrics.vendorRefundInflows > 0 && (
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                      <div>
                        <span className="font-semibold text-slate-200 block">Supplier Cash Refunds & Credits</span>
                        <span className="text-[10px] text-slate-400">Cash returned by suppliers or purchase settlements</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">+{formatPKR(cashMetrics.vendorRefundInflows)}</span>
                    </div>
                  )}

                  {cashMetrics.restockFeeInflows > 0 && (
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                      <div>
                        <span className="font-semibold text-slate-200 block">Customer Return Restock Fees</span>
                        <span className="text-[10px] text-slate-400">Handling fees collected in cash on returned goods</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">+{formatPKR(cashMetrics.restockFeeInflows)}</span>
                    </div>
                  )}

                  {cashMetrics.totalPeriodBankInflows > 0 && (
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-blue-950/20 border border-blue-900/40 text-blue-300">
                      <div>
                        <span className="font-semibold block">Non-Cash Receipts (Bank / Raast / Cheque)</span>
                        <span className="text-[10px] text-blue-400">Settled directly via bank without touching drawer</span>
                      </div>
                      <span className="font-mono font-bold">{formatPKR(cashMetrics.totalPeriodBankInflows)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pillar 2: Liquid Cash Outflows */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-rose-400" />
                    2. Liquid Cash Outflows (Disbursements)
                  </h4>
                  <span className="text-xs font-mono font-bold text-rose-400">
                    -{formatPKR(cashMetrics.totalPeriodCashOutflows)}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                    <div>
                      <span className="font-semibold text-slate-200 block">Operating Overheads Paid in Cash</span>
                      <span className="text-[10px] text-slate-400">Shop rent, electricity, wages, tea, mess & delivery</span>
                    </div>
                    <span className="font-mono font-bold text-rose-400">-{formatPKR(cashMetrics.expenseCashOutflows)}</span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                    <div>
                      <span className="font-semibold text-slate-200 block">Cash Paid to Suppliers & Cargo</span>
                      <span className="text-[10px] text-slate-400">Cash payments made for purchases and vendor dues</span>
                    </div>
                    <span className="font-mono font-bold text-rose-400">-{formatPKR(cashMetrics.supplierCashOutflows)}</span>
                  </div>

                  {cashMetrics.customerReturnRefundOutflows > 0 && (
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                      <div>
                        <span className="font-semibold text-slate-200 block">Cash Refunds Paid to Customers</span>
                        <span className="text-[10px] text-slate-400">Cash handed back on accepted sales returns</span>
                      </div>
                      <span className="font-mono font-bold text-rose-400">-{formatPKR(cashMetrics.customerReturnRefundOutflows)}</span>
                    </div>
                  )}

                  {cashMetrics.totalPeriodBankOutflows > 0 && (
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-blue-950/20 border border-blue-900/40 text-blue-300">
                      <div>
                        <span className="font-semibold block">Non-Cash Disbursements (Bank / Raast)</span>
                        <span className="text-[10px] text-blue-400">Expenses/payments sent via bank account</span>
                      </div>
                      <span className="font-mono font-bold">{formatPKR(cashMetrics.totalPeriodBankOutflows)}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Realization & Profit Reconciliation Bar */}
            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 block font-bold">
                  Cash Realization & Profit Reconciliation:
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  • <strong>{cashMetrics.cashRealizationPercent.toFixed(1)}%</strong> of Net Sales were realized in physical cash. 
                  • Profit in Hand (cash-backed): <strong className="text-emerald-400 font-mono">{formatPKR(cashMetrics.profitInHand)}</strong> 
                  • Profit in Receivables (credit due): <strong className="text-amber-400 font-mono">{formatPKR(cashMetrics.profitInReceivables)}</strong>
                  {cashMetrics.cashReceivables > 0 && (
                    <span className="text-slate-400"> (₨ {Math.round(cashMetrics.cashReceivables).toLocaleString()} total customer balance pending recovery).</span>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCashJournalModal(true)}
                className="self-start md:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer text-xs shrink-0"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Inspect All Cash Entries</span>
              </button>
            </div>

            {/* Card 3: Supplier Payables & Revenue Distribution */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> 3. Supplier Payables & Revenue Distribution (Item Sales vs Dues)
                </h4>
                <span className="text-[11px] text-slate-400">Shows revenue generated by each supplier's items alongside current supplier payables</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Supplier / Vendor Name</th>
                      <th className="py-2.5 px-3 text-center">Items Sold (Units)</th>
                      <th className="py-2.5 px-3 text-right">Revenue Generated</th>
                      <th className="py-2.5 px-3 text-right">Current Payable (Owed)</th>
                      <th className="py-2.5 px-3 text-right">Recommended Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    {advancedBreakdown.supplierList.map((sup) => (
                      <tr key={sup.id} className="hover:bg-slate-800/40 text-slate-200">
                        <td className="py-3 px-3 font-sans font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                          {sup.name}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-300">{sup.itemsSold}</td>
                        <td className="py-3 px-3 text-right text-emerald-400 font-bold">{formatPKR(sup.revenueGenerated)}</td>
                        <td className="py-3 px-3 text-right text-amber-400 font-bold">{formatPKR(sup.currentPayable)}</td>
                        <td className="py-3 px-3 text-right font-sans">
                          {sup.currentPayable > 0 ? (
                            <span className="inline-block px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-lg text-[10px] font-black">
                              Payable: {formatPKR(sup.currentPayable)}
                            </span>
                          ) : sup.currentPayable < 0 ? (
                            <span className="inline-block px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-[10px] font-black">
                              Advance / Credit
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-black">
                              Settled
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {advancedBreakdown.supplierList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                          No supplier sales or payable distributions recorded in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Formal Statement Signatures & Verification Block (Visible in Print & Screen) */}
          <div className="pt-8 border-t-2 border-slate-300 grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs text-slate-600">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-8">
                Prepared By (Accountant / Cashier):
              </span>
              <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                Authorized Signature & Date
              </div>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-8">
                Audited & Verified By:
              </span>
              <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                Internal Auditor Signature
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-8">
                Approved By:
              </span>
              <div className="border-t border-slate-400 pt-1 font-bold text-slate-900">
                Managing Director / Proprietor
              </div>
            </div>
          </div>

        </section>
      ) : (
        /* ---------------- OPERATING EXPENSES MANAGER SECTION ---------------- */
        <section className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-300 shadow-lg space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                Operating Overhead Expenses Ledger
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Log and manage shop rent, utility bills, salaries, packaging, and tea expenses.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddExpense}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Record New Expense</span>
            </button>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                placeholder="Search expense title, receipt #, payee..."
                className="w-full pl-9 pr-3 py-2 bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-500"
              />
            </div>

            <select
              value={expenseCategoryFilter}
              onChange={(e) => setExpenseCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">All Categories ({expenses.length})</option>
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Expenses Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-black">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Voucher #</th>
                  <th className="py-2.5 px-3">Expense Title / Payee</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Payment Method</th>
                  <th className="py-2.5 px-3 text-right">Amount (PKR)</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-300/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-600 whitespace-nowrap">
                      {exp.date}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-500">
                      {exp.expenseNumber || exp.id}
                    </td>
                    <td className="py-2.5 px-3 min-w-[200px]">
                      <span className="font-bold text-slate-900 block">{exp.title}</span>
                      {exp.paidTo && (
                        <span className="text-[11px] text-slate-500 block">Paid to: {exp.paidTo}</span>
                      )}
                      {exp.notes && (
                        <span className="text-[10px] text-slate-400 italic block">{exp.notes}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-bold text-[10px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-600 whitespace-nowrap">
                      {exp.paymentMethod || 'Cash'}
                      {exp.receiptNumber && (
                        <span className="text-[10px] text-slate-400 block font-mono">Rec #{exp.receiptNumber}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 text-sm whitespace-nowrap">
                      {formatPKR(exp.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditExpense(exp)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-300"
                          title="Edit expense"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(exp.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="Delete expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400 font-semibold">
                      No operating expenses matching current filter
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </section>
      )}

      {/* 4. ADD / EDIT EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div 
            className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-5 sm:p-6 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 leading-tight">
                    {editingExpense ? 'Edit Operating Expense' : 'Record Operating Expense'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Enter overhead expense details for P&L reporting
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpenseSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Expense Title / Purpose *
                </label>
                <input
                  type="text"
                  required
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Shop Rent for September, Diesel Fuel, Staff Wages"
                  className="w-full px-3 py-2 bg-slate-200 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                    className="w-full px-3 py-2 bg-slate-200 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Amount (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="e.g. 25000"
                    className="w-full px-3 py-2 bg-slate-200 border border-slate-200 rounded-xl font-black text-slate-900 text-sm focus:outline-none focus:border-red-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-200 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-200 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="Cash">Cash In Hand</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Online / Raast">Online / Raast</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Paid To (Payee / Beneficiary)
                  </label>
                  <input
                    type="text"
                    value={expenseForm.paidTo}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, paidTo: e.target.value }))}
                    placeholder="e.g. LESCO, Landlord, Staff name"
                    className="w-full px-3 py-2 bg-slate-200 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Receipt / Bill #
                  </label>
                  <input
                    type="text"
                    value={expenseForm.receiptNumber}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, receiptNumber: e.target.value }))}
                    placeholder="e.g. REC-8891"
                    className="w-full px-3 py-2 bg-slate-200 border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Notes / Description
                </label>
                <textarea
                  rows={2}
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional details, cheque number, or remarks..."
                  className="w-full px-3 py-2 bg-slate-200 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                >
                  {editingExpense ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. CASH FLOW JOURNAL & LIVE REGISTER AUDIT MODAL (CASH BOOK) */}
      {showCashJournalModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs">
          <div 
            className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shadow-emerald-600/20">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                      Cash in Hand & Direct Cash Book Journal
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                      Live Till Audit
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {cashViewScope === 'period' ? (
                      <>Reporting Period: <strong className="text-slate-800">{dateBoundaries.label}</strong> ({dateBoundaries.startStr} to {dateBoundaries.endStr})</>
                    ) : (
                      <>All-Time Cumulative Cash Transactions (Live Cash Drawer / Register Position)</>
                    )}
                  </p>
                </div>
              </div>

              {/* Scope Switch & Close */}
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 bg-slate-200 rounded-xl text-xs font-bold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setCashViewScope('period')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      cashViewScope === 'period'
                        ? 'bg-white text-emerald-800 shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    This Period
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashViewScope('all_time')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      cashViewScope === 'all_time'
                        ? 'bg-white text-emerald-800 shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All-Time Live Drawer
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCashJournalModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-4 sm:p-5 bg-slate-100/70 border-b border-slate-200">
              
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  {cashViewScope === 'period' ? 'Opening Cash (Drawer)' : 'Starting Till Balance'}
                </span>
                <span className="text-base sm:text-lg font-mono font-black text-slate-800 block mt-0.5">
                  {formatPKR(modalCashJournalData.openingBalance)}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">
                  {cashViewScope === 'period' ? 'Carried forward' : 'Baseline'}
                </span>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block flex items-center gap-1">
                  <ArrowDown className="w-3 h-3 inline text-emerald-600" /> Cash Inflows (+)
                </span>
                <span className="text-base sm:text-lg font-mono font-black text-emerald-600 block mt-0.5">
                  +{formatPKR(modalCashJournalData.totalCashInflows)}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium truncate">
                  POS Sales & Debt Collections
                </span>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider block flex items-center gap-1">
                  <ArrowUp className="w-3 h-3 inline text-rose-600" /> Cash Outflows (-)
                </span>
                <span className="text-base sm:text-lg font-mono font-black text-rose-600 block mt-0.5">
                  -{formatPKR(modalCashJournalData.totalCashOutflows)}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium truncate">
                  Expenses & Supplier Cash
                </span>
              </div>

              <div className="bg-slate-900 text-white p-3 rounded-2xl border border-slate-800 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">
                    Closing Drawer Cash
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                    modalCashJournalData.netCashFlow >= 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}>
                    {modalCashJournalData.netCashFlow >= 0 ? '+ Surplus' : '- Deficit'}
                  </span>
                </div>
                <span className="text-base sm:text-lg font-mono font-black text-emerald-400 block mt-0.5">
                  {formatPKR(modalCashJournalData.closingDrawer)}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium truncate">
                  Net Flow: {formatPKR(modalCashJournalData.netCashFlow)}
                </span>
              </div>

            </div>

            {/* Filter & Search Bar */}
            <div className="p-3 sm:px-5 py-2.5 bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
                <button
                  type="button"
                  onClick={() => setCashJournalFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                    cashJournalFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({modalCashJournalData.totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setCashJournalFilter('inflow')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                    cashJournalFilter === 'inflow'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <ArrowDown className="w-3 h-3" /> Inflows (+)
                </button>
                <button
                  type="button"
                  onClick={() => setCashJournalFilter('outflow')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                    cashJournalFilter === 'outflow'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  <ArrowUp className="w-3 h-3" /> Outflows (-)
                </button>
                <button
                  type="button"
                  onClick={() => setCashJournalFilter('cash_only')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                    cashJournalFilter === 'cash_only'
                      ? 'bg-teal-700 text-white'
                      : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
                  }`}
                >
                  <Banknote className="w-3 h-3" /> Cash Drawer Only
                </button>
                <button
                  type="button"
                  onClick={() => setCashJournalFilter('bank_only')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                    cashJournalFilter === 'bank_only'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  Bank / Raast / Cheque
                </button>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cashJournalSearch}
                  onChange={(e) => setCashJournalSearch(e.target.value)}
                  placeholder="Search invoice, vendor, party, category..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500"
                />
                {cashJournalSearch && (
                  <button
                    type="button"
                    onClick={() => setCashJournalSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

            </div>

            {/* Journal Transactions Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase tracking-wider text-[10px] font-black border-b border-slate-200 shadow-xs">
                  <tr>
                    <th className="py-2.5 px-3">Date / Time</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Category / Source</th>
                    <th className="py-2.5 px-3">Description & Reference</th>
                    <th className="py-2.5 px-3">Payment Channel</th>
                    <th className="py-2.5 px-3 text-right">Inflow (+)</th>
                    <th className="py-2.5 px-3 text-right">Outflow (-)</th>
                    <th className="py-2.5 px-3 text-right">Drawer Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Opening Balance Row if Period View */}
                  {cashViewScope === 'period' && (
                    <tr className="bg-slate-50/80 font-bold text-slate-700">
                      <td className="py-2.5 px-3 font-semibold text-slate-500 whitespace-nowrap">
                        {dateBoundaries.startStr}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-black text-[10px]">
                          Opening
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        Opening Till Position
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        Drawer balance carried forward from prior period
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        Physical Cash
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">—</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">—</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                        {formatPKR(modalCashJournalData.openingBalance)}
                      </td>
                    </tr>
                  )}

                  {modalCashJournalData.transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-600 whitespace-nowrap text-[11px]">
                        {new Date(t.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {new Date(t.date).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded font-black text-[10px] inline-flex items-center gap-1 ${
                          t.type === 'inflow'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {t.type === 'inflow' ? (
                            <>
                              <ArrowDown className="w-2.5 h-2.5" /> Inflow
                            </>
                          ) : (
                            <>
                              <ArrowUp className="w-2.5 h-2.5" /> Outflow
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                        {t.category}
                      </td>

                      <td className="py-2.5 px-3 min-w-[200px]">
                        <span className="font-semibold text-slate-900 block">{t.description}</span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          {t.entityName && <span>Party: <strong>{t.entityName}</strong></span>}
                          {t.referenceId && (
                            <span className="font-mono bg-slate-100 px-1 rounded text-slate-600">
                              Ref: {t.referenceId}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.isPhysicalCash 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {t.paymentMethod || (t.isPhysicalCash ? 'Cash' : 'Bank')}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-black text-xs whitespace-nowrap text-emerald-600">
                        {t.type === 'inflow' ? `+${formatPKR(t.amount)}` : '—'}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-black text-xs whitespace-nowrap text-rose-600">
                        {t.type === 'outflow' ? `-${formatPKR(t.amount)}` : '—'}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-xs whitespace-nowrap text-slate-900">
                        {t.isPhysicalCash ? (
                          formatPKR(t.runningBalance)
                        ) : (
                          <span className="text-slate-400 font-normal italic text-[11px]">Bank (no till effect)</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {modalCashJournalData.transactions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-slate-400 font-semibold">
                        <Banknote className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        No cash journal records found for the current filter criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 font-medium">
                Showing <strong>{modalCashJournalData.filteredCount}</strong> of <strong>{modalCashJournalData.totalCount}</strong> movements • Live Drawer Balance: <strong className="text-emerald-700 font-mono">{formatPKR(cashMetrics.allTimeDrawerCash)}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCashJournalExcel}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Journal (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCashJournalModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
