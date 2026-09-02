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
  AppWorkspaceView 
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
  Search
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface IncomeStatementPageProps {
  sales: Sale[];
  purchases: Purchase[];
  customerReturns: CustomerReturn[];
  vendorReturns: VendorReturn[];
  products: Product[];
  expenses: Expense[];
  onSaveExpense: (expense: Partial<Expense>) => void;
  onDeleteExpense: (expenseId: string) => void;
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
    const targetCustomerReturns = customerReturns.filter(r => isTarget(r.returnDate || r.createdAt));
    const targetVendorReturns = vendorReturns.filter(r => isTarget(r.returnDate || r.createdAt));
    const targetExpenses = expenses.filter(e => isTarget(e.date || e.createdAt));

    // 1. Revenue Calculations
    const grossSales = targetSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0) + (Number(s.discount) || 0), 0);
    const salesDiscounts = targetSales.reduce((sum, s) => sum + (Number(s.discount) || 0), 0);
    const invoicedSales = targetSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const salesReturns = targetCustomerReturns.reduce((sum, r) => sum + (Number(r.totalReturnAmount) || 0), 0);
    const restockFeesCollected = targetCustomerReturns.reduce((sum, r) => sum + (Number(r.restockFee) || 0), 0);
    const netSales = Math.max(0, invoicedSales - salesReturns);

    // 2. Cost of Goods Sold (COGS)
    let fifoCOGS = 0;
    targetSales.forEach(s => {
      s.items.forEach(it => {
        const cost = it.cogs !== undefined && it.cogs > 0 ? it.cogs : (it.costPrice || 0);
        fifoCOGS += cost * (it.quantity || 1);
      });
    });

    const damagedLoss = targetCustomerReturns.reduce((sum, r) => {
      // If items were marked scrap/damaged, count their cost
      return sum + r.items.filter(it => it.condition === 'damaged' || it.action === 'scrap').reduce((iSum, it) => iSum + ((it.costPrice || 0) * it.quantity), 0);
    }, 0);

    const totalCOGS = Math.max(0, fifoCOGS + damagedLoss);

    // 3. Gross Profit
    const grossProfit = netSales - totalCOGS;
    const grossProfitMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

    // 4. Operating Expenses by Category
    const expensesByCategory: { [cat: string]: number } = {};
    EXPENSE_CATEGORIES.forEach(c => { expensesByCategory[c] = 0; });
    targetExpenses.forEach(e => {
      const cat = e.category || 'Miscellaneous';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (Number(e.amount) || 0);
    });

    const totalOperatingExpenses = targetExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // 5. Operating Income (EBIT)
    const operatingIncome = grossProfit - totalOperatingExpenses;
    const operatingMargin = netSales > 0 ? (operatingIncome / netSales) * 100 : 0;

    // 6. Other Income
    const otherIncomeTotal = restockFeesCollected;

    // 7. Net Profit / Net Income
    const netIncome = operatingIncome + otherIncomeTotal;
    const netProfitMargin = netSales > 0 ? (netIncome / netSales) * 100 : 0;

    return {
      grossSales,
      salesDiscounts,
      invoicedSales,
      salesReturns,
      restockFeesCollected,
      netSales,
      fifoCOGS,
      damagedLoss,
      totalCOGS,
      grossProfit,
      grossProfitMargin,
      expensesByCategory,
      totalOperatingExpenses,
      operatingIncome,
      operatingMargin,
      otherIncomeTotal,
      netIncome,
      netProfitMargin,
      salesCount: targetSales.length,
      customerReturnsCount: targetCustomerReturns.length,
      expensesCount: targetExpenses.length,
      purchasesCount: targetPurchases.length,
      purchasesTotal: targetPurchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0),
    };
  };

  // Main Period Statement
  const statement = useMemo(() => {
    return calculateStatementForDates(dateBoundaries.start, dateBoundaries.end);
  }, [dateBoundaries, sales, purchases, customerReturns, vendorReturns, expenses]);

  // Prior Period Statement (for Comparison Mode)
  const priorStatement = useMemo(() => {
    return calculateStatementForDates(dateBoundaries.prevStart, dateBoundaries.prevEnd);
  }, [dateBoundaries, sales, purchases, customerReturns, vendorReturns, expenses]);

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
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Income Statement');
    XLSX.writeFile(wb, `Income_Statement_${dateBoundaries.startStr}_to_${dateBoundaries.endStr}.xlsx`);
  };

  // Direct Print Window
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* 1. HEADER & PERIOD CONTROLS (Screen view only) */}
      <section className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs print:hidden">
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
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('statement')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'statement' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                P&L Statement
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('expenses_manager')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'expenses_manager' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
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
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
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
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
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
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
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
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 print:hidden">
        
        {/* Net Sales */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block truncate">
            1. Net Revenue
          </span>
          <span className="text-lg sm:text-xl font-black text-slate-900 block font-mono mt-1 truncate">
            {formatPKRShort(statement.netSales)}
          </span>
          <span className="text-[10px] text-slate-400 block font-medium mt-0.5 truncate">
            Gross: {formatPKRShort(statement.grossSales)}
          </span>
        </div>

        {/* COGS */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block truncate">
            2. Cost of Sales (COGS)
          </span>
          <span className="text-lg sm:text-xl font-black text-slate-900 block font-mono mt-1 truncate">
            {formatPKRShort(statement.totalCOGS)}
          </span>
          <span className="text-[10px] text-slate-400 block font-medium mt-0.5 truncate">
            FIFO Product Cost
          </span>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block truncate">
            3. Gross Profit
          </span>
          <span className={`text-lg sm:text-xl font-black block font-mono mt-1 truncate ${
            statement.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {formatPKRShort(statement.grossProfit)}
          </span>
          <span className="text-[10px] font-bold text-slate-600 block mt-0.5">
            Margin: <strong>{statement.grossProfitMargin.toFixed(1)}%</strong>
          </span>
        </div>

        {/* OPEX */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block truncate">
            4. Operating Expenses
          </span>
          <span className="text-lg sm:text-xl font-black text-slate-900 block font-mono mt-1 truncate">
            {formatPKRShort(statement.totalOperatingExpenses)}
          </span>
          <span className="text-[10px] text-slate-400 block font-medium mt-0.5 truncate">
            {statement.expensesCount} Logged Overheads
          </span>
        </div>

        {/* Net Income */}
        <div className="col-span-2 lg:col-span-1 bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-md">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block truncate">
            5. Net Profit (Bottom Line)
          </span>
          <span className={`text-lg sm:text-xl font-black block font-mono mt-1 truncate ${
            statement.netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {formatPKRShort(statement.netIncome)}
          </span>
          <span className="text-[10px] font-bold text-slate-300 block mt-0.5">
            Net Margin: <strong>{statement.netProfitMargin.toFixed(1)}%</strong>
          </span>
        </div>

      </section>

      {/* 3. MAIN P&L STATEMENT TABLE (Print-Formatted & Formal Accounting Sheet) */}
      {activeTab === 'statement' ? (
        <section className="bg-white rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-xs space-y-6 print:p-0 print:border-none print:shadow-none">
          
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
                <tr className="bg-slate-50/80 font-black text-slate-900">
                  <td colSpan={compareWithPrevious ? 5 : 3} className="py-2 px-3 tracking-wide">
                    1. REVENUE FROM OPERATIONS
                  </td>
                </tr>

                {/* Gross Sales */}
                <tr className="hover:bg-slate-50/50">
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
                <tr className="hover:bg-slate-50/50 text-slate-700">
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
                  <tr className="hover:bg-slate-50/50 text-slate-700">
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
                <tr className="bg-slate-100/70 font-black text-slate-900 border-t border-b border-slate-300">
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
                <tr className="bg-slate-50/80 font-black text-slate-900">
                  <td colSpan={compareWithPrevious ? 5 : 3} className="py-2 px-3 tracking-wide">
                    2. COST OF GOODS SOLD (COGS)
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50">
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
                  <tr className="hover:bg-slate-50/50">
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
                <tr className="bg-slate-100/70 font-black text-slate-900 border-t border-b border-slate-300">
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
                <tr className="bg-slate-50/80 font-black text-slate-900">
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
                    <tr key={cat} className={`hover:bg-slate-50/50 ${amt === 0 ? 'text-slate-400' : 'text-slate-800'}`}>
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
                <tr className="bg-slate-100/70 font-black text-slate-900 border-t border-b border-slate-300">
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
                <tr className="bg-slate-50/80 font-black text-slate-900 border-t border-b border-slate-300">
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
                <tr className="bg-slate-50/80 font-black text-slate-900">
                  <td colSpan={compareWithPrevious ? 5 : 3} className="py-2 px-3 tracking-wide">
                    4. OTHER INCOME & ADJUSTMENTS
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50">
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

              </tbody>
            </table>
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
        <section className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          
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
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-500"
              />
            </div>

            <select
              value={expenseCategoryFilter}
              onChange={(e) => setExpenseCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
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
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
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
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px]">
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
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                          title="Edit expense"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete expense "${exp.title}"?`)) {
                              onDeleteExpense(exp.id);
                            }
                          }}
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
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900 text-sm focus:outline-none focus:border-red-500 focus:bg-white"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-none"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
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

    </div>
  );
};
