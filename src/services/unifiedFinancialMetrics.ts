/**
 * Unified Financial & Inventory Metrics Service
 * 
 * Single Source of Truth for financial reporting across:
 * - Executive Dashboard (DashboardPage)
 * - Formal Income Statement (IncomeStatementPage)
 * - Sales Management & Invoicing (SalesPage)
 * - Internal state stores and ledger updates
 * 
 * Standardizes:
 * 1. Gross Revenue vs. Net Revenue (returns & allowances handling)
 * 2. FIFO Cost of Goods Sold (COGS) & inventory stock valuation
 * 3. Gross Profit & Trading Margins
 * 4. Operating Expenses & Net Income (Bottom Line)
 * 5. Inventory Asset Snapshots & Valuation
 */

import {
  Product,
  Sale,
  Purchase,
  CustomerReturn,
  VendorReturn,
  Expense,
  Customer,
  Vendor,
  CustomerLedgerEntry,
  VendorLedgerEntry,
  ExpenseCategory,
} from '../types';
import {
  safeFinancialNumber,
  roundCurrency,
  addFinancial,
  subtractFinancial,
  divideFinancial,
} from './financialMath';
import { calculateSaleCogs } from './sales';
import { calculateProductStockValue, calculateCustomerNetBalance, calculateVendorBalance } from './storage';

export const UNIFIED_EXPENSE_CATEGORIES: ExpenseCategory[] = [
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

export interface UnifiedSalesAndProfitMetrics {
  // Sales & Volume
  salesCount: number;
  customerReturnsCount: number;
  totalItemsSold: number;

  // Revenue
  grossRevenue: number;         // Total invoiced revenue (sum of original invoice totals)
  salesDiscounts: number;       // Trade discounts allowed on invoices
  grossSalesBeforeDiscount: number; // Invoiced + discounts
  salesReturnsAmount: number;   // Total value refunded / credited to customers
  restockFeesCollected: number; // Restock / handling fees collected on returns
  netRevenue: number;           // True Net Sales: max(0, grossRevenue - salesReturnsAmount)

  // Realized Cash & Receivables
  totalCashReceived: number;    // Cash receipts realized on sales
  totalCreditOutstanding: number; // Balance due on credit sales (accounting for return adjustments)

  // Cost of Goods Sold (COGS)
  fifoCOGS: number;             // Direct FIFO inventory acquisition cost of goods sold
  damagedLoss: number;          // Damaged / scrap inventory losses written off from returns
  totalCOGS: number;            // Total Cost of Goods Sold (fifoCOGS + damagedLoss)

  // Gross Profit
  grossProfit: number;          // netRevenue - totalCOGS
  grossMarginPercent: number;   // (grossProfit / netRevenue) * 100

  // Operating Expenses & EBIT
  expensesCount: number;
  expensesByCategory: Record<string, number>;
  totalOperatingExpenses: number;
  operatingIncome: number;      // EBIT: grossProfit - totalOperatingExpenses
  operatingMarginPercent: number;

  // Other Income & Net Income
  otherIncome: number;          // e.g. restock fees
  netIncome: number;            // operatingIncome + otherIncome (Bottom line)
  netProfitMarginPercent: number;

  // Purchases context
  purchasesCount: number;
  purchasesSpend: number;       // Total purchases billed
  purchasesPaid: number;        // Total paid to suppliers
  purchasesBalanceDue: number;  // Remaining unpaid balance to suppliers
  itemsPurchasedUnits: number;
  vendorReturnsAmount: number;  // Supplier returns/debit notes
}

export interface InventoryValuationMetrics {
  totalProductsCount: number;
  totalStockUnits: number;
  inventoryValuationCost: number;     // FIFO acquisition landed cost of current inventory
  inventoryValuationRetail: number;   // Estimated retail value of current inventory
  potentialProfitInStock: number;     // Unrealized profit in shelf stock
  lowStockCount: number;
  outOfStockCount: number;
  healthyStockCount: number;
}

export interface BalanceSheetSnapshotMetrics {
  inventory: InventoryValuationMetrics;
  totalReceivables: number;           // Total money owed to us by customers
  debtorCustomersCount: number;
  totalPayables: number;              // Total money we owe to suppliers
  creditorVendorsCount: number;
  totalExpensesAllTime: number;
}

/**
 * Creates a fast O(1) lookup Map for products by both their UUID `id` and `internalId` (e.g. KFH-2501)
 */
export function buildProductLookupMap(products: Product[]): Map<string, Product> {
  const map = new Map<string, Product>();
  for (const p of products) {
    if (p.id) map.set(p.id, p);
    if (p.internalId) map.set(p.internalId, p);
  }
  return map;
}

/**
 * Calculates unified sales, revenue, COGS, and profit metrics for any set of transactions.
 * Guarantees identical output across DashboardPage, IncomeStatementPage, and SalesPage.
 */
export function calculateUnifiedMetrics(params: {
  sales: Sale[];
  customerReturns?: CustomerReturn[];
  vendorReturns?: VendorReturn[];
  purchases?: Purchase[];
  expenses?: Expense[];
  products: Product[] | Map<string, Product>;
}): UnifiedSalesAndProfitMetrics {
  const {
    sales = [],
    customerReturns = [],
    vendorReturns = [],
    purchases = [],
    expenses = [],
    products,
  } = params;

  const prodMap = products instanceof Map ? products : buildProductLookupMap(products);

  // 1. Sales & Revenue Aggregations
  let grossRevenue = 0;
  let salesDiscounts = 0;
  let totalCashReceived = 0;
  let totalCreditOutstanding = 0;
  let totalItemsSold = 0;
  let fifoCOGS = 0;

  for (const s of sales) {
    const saleTotal = safeFinancialNumber(s.totalAmount, 0);
    const saleDiscount = safeFinancialNumber(s.discountAmount ?? (s as any).discount, 0);
    const saleReceived = safeFinancialNumber(s.amountReceived, 0);

    // If sale invoice has linked return adjustments, use netBalanceDue if present
    const saleCredit = s.hasReturns && s.netBalanceDue !== undefined
      ? safeFinancialNumber(s.netBalanceDue, 0)
      : safeFinancialNumber(s.balanceDue, 0);

    grossRevenue = addFinancial(grossRevenue, saleTotal);
    salesDiscounts = addFinancial(salesDiscounts, saleDiscount);
    totalCashReceived = addFinancial(totalCashReceived, saleReceived);
    totalCreditOutstanding = addFinancial(totalCreditOutstanding, saleCredit);

    // Sold items count (respecting netQuantity if returned)
    if (s.items && s.items.length > 0) {
      for (const item of s.items) {
        const netQty = item.netQuantity !== undefined ? item.netQuantity : item.quantity;
        totalItemsSold += safeFinancialNumber(netQty, 1);
      }
    } else {
      totalItemsSold += 1;
    }

    // Direct FIFO COGS for invoice items
    const saleCogs = calculateSaleCogs(s, prodMap, true);
    fifoCOGS = addFinancial(fifoCOGS, saleCogs);
  }

  // 2. Customer Returns & Restock Fees
  let salesReturnsAmount = 0;
  let restockFeesCollected = 0;
  let damagedLoss = 0;

  for (const r of customerReturns) {
    const refund = safeFinancialNumber(
      r.totalRefundAmount ?? (r as any).totalReturnAmount ?? r.subtotal,
      0
    );
    const fee = safeFinancialNumber(
      r.deductionOrRestockFee ?? (r as any).restockFee,
      0
    );
    salesReturnsAmount = addFinancial(salesReturnsAmount, refund);
    restockFeesCollected = addFinancial(restockFeesCollected, fee);

    // Damaged / scrap write-off value
    if (r.items && r.items.length > 0) {
      for (const it of r.items) {
        if (it.condition === 'damaged' || it.condition === 'scrap' || (it as any).action === 'scrap') {
          const prod = prodMap.get(it.productId) || (it.internalId ? prodMap.get(it.internalId) : undefined);
          const unitCost = safeFinancialNumber(
            (it as any).costPrice ?? prod?.costPrice ?? (it as any).unitCost ?? it.returnRate,
            0
          );
          const qty = safeFinancialNumber(it.quantity, 1);
          damagedLoss = addFinancial(damagedLoss, unitCost * qty);
        }
      }
    }
  }

  // 3. True Net Sales Revenue
  const netRevenue = Math.max(0, roundCurrency(subtractFinancial(grossRevenue, salesReturnsAmount)));
  const grossSalesBeforeDiscount = roundCurrency(addFinancial(grossRevenue, salesDiscounts));

  // 4. Cost of Goods Sold (COGS)
  const totalCOGS = Math.max(0, roundCurrency(addFinancial(fifoCOGS, damagedLoss)));

  // 5. Gross Profit & Margins
  const grossProfit = roundCurrency(subtractFinancial(netRevenue, totalCOGS));
  const grossMarginPercent = netRevenue > 0
    ? roundCurrency(divideFinancial(grossProfit * 100, netRevenue, 2))
    : 0;

  // 6. Operating Expenses
  const expensesByCategory: Record<string, number> = {};
  for (const cat of UNIFIED_EXPENSE_CATEGORIES) {
    expensesByCategory[cat] = 0;
  }

  let totalOperatingExpenses = 0;
  for (const e of expenses) {
    const amt = safeFinancialNumber(e.amount, 0);
    totalOperatingExpenses = addFinancial(totalOperatingExpenses, amt);
    const cat = e.category || 'Miscellaneous';
    expensesByCategory[cat] = addFinancial(expensesByCategory[cat] || 0, amt);
  }

  // 7. Operating Income (EBIT) & Net Income (Bottom Line)
  const operatingIncome = roundCurrency(subtractFinancial(grossProfit, totalOperatingExpenses));
  const operatingMarginPercent = netRevenue > 0
    ? roundCurrency(divideFinancial(operatingIncome * 100, netRevenue, 2))
    : 0;

  const otherIncome = roundCurrency(restockFeesCollected);
  const netIncome = roundCurrency(addFinancial(operatingIncome, otherIncome));
  const netProfitMarginPercent = netRevenue > 0
    ? roundCurrency(divideFinancial(netIncome * 100, netRevenue, 2))
    : 0;

  // 8. Purchases & Vendor Returns Summary
  let purchasesSpend = 0;
  let purchasesPaid = 0;
  let purchasesBalanceDue = 0;
  let itemsPurchasedUnits = 0;

  for (const p of purchases) {
    purchasesSpend = addFinancial(purchasesSpend, safeFinancialNumber(p.totalAmount, 0));
    purchasesPaid = addFinancial(purchasesPaid, safeFinancialNumber(p.amountPaid, 0));
    const pBalanceDue = p.netBalanceDue !== undefined ? p.netBalanceDue : p.balanceDue;
    purchasesBalanceDue = addFinancial(purchasesBalanceDue, safeFinancialNumber(pBalanceDue, 0));

    if (p.items) {
      for (const it of p.items) {
        itemsPurchasedUnits += safeFinancialNumber(it.quantity, 1);
      }
    }
  }

  let vendorReturnsAmount = 0;
  for (const vr of vendorReturns) {
    vendorReturnsAmount = addFinancial(vendorReturnsAmount, safeFinancialNumber(vr.totalAmount, 0));
  }

  return {
    salesCount: sales.length,
    customerReturnsCount: customerReturns.length,
    totalItemsSold: Math.round(totalItemsSold),
    grossRevenue: roundCurrency(grossRevenue),
    salesDiscounts: roundCurrency(salesDiscounts),
    grossSalesBeforeDiscount,
    salesReturnsAmount: roundCurrency(salesReturnsAmount),
    restockFeesCollected: roundCurrency(restockFeesCollected),
    netRevenue,
    totalCashReceived: roundCurrency(totalCashReceived),
    totalCreditOutstanding: roundCurrency(totalCreditOutstanding),
    fifoCOGS: roundCurrency(fifoCOGS),
    damagedLoss: roundCurrency(damagedLoss),
    totalCOGS,
    grossProfit,
    grossMarginPercent,
    expensesCount: expenses.length,
    expensesByCategory,
    totalOperatingExpenses: roundCurrency(totalOperatingExpenses),
    operatingIncome,
    operatingMarginPercent,
    otherIncome,
    netIncome,
    netProfitMarginPercent,
    purchasesCount: purchases.length,
    purchasesSpend: roundCurrency(purchasesSpend),
    purchasesPaid: roundCurrency(purchasesPaid),
    purchasesBalanceDue: roundCurrency(purchasesBalanceDue),
    itemsPurchasedUnits: Math.round(itemsPurchasedUnits),
    vendorReturnsAmount: roundCurrency(vendorReturnsAmount),
  };
}

/**
 * Calculates current inventory valuation at both FIFO cost and estimated retail price,
 * as well as stock health distributions.
 */
export function calculateInventoryValuation(products: Product[]): InventoryValuationMetrics {
  let inventoryValuationCost = 0;
  let inventoryValuationRetail = 0;
  let totalStockUnits = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let healthyStockCount = 0;

  for (const p of products) {
    const stock = safeFinancialNumber(p.stockQuantity, 0);
    const minAlert = safeFinancialNumber(p.minStockAlert, 5);

    totalStockUnits += stock;

    // Cost valuation using FIFO cost batches
    const costVal = calculateProductStockValue(p);
    inventoryValuationCost = addFinancial(inventoryValuationCost, costVal);

    // Retail valuation
    const retailPrice = p.sellingPrices?.[1]?.price || (safeFinancialNumber(p.costPrice, 0) * 1.25);
    const retailVal = safeFinancialNumber(retailPrice, 0) * stock;
    inventoryValuationRetail = addFinancial(inventoryValuationRetail, retailVal);

    if (stock === 0) {
      outOfStockCount++;
    } else if (stock <= minAlert) {
      lowStockCount++;
    } else {
      healthyStockCount++;
    }
  }

  const potentialProfitInStock = Math.max(
    0,
    roundCurrency(subtractFinancial(inventoryValuationRetail, inventoryValuationCost))
  );

  return {
    totalProductsCount: products.length,
    totalStockUnits: Math.round(totalStockUnits),
    inventoryValuationCost: roundCurrency(inventoryValuationCost),
    inventoryValuationRetail: roundCurrency(inventoryValuationRetail),
    potentialProfitInStock,
    lowStockCount,
    outOfStockCount,
    healthyStockCount,
  };
}

/**
 * Computes an overall balance sheet and working capital snapshot (Inventory, Receivables, Payables).
 */
export function calculateBalanceSheetSnapshot(params: {
  products: Product[];
  customers: Customer[];
  vendors: Vendor[];
  sales?: Sale[];
  purchases?: Purchase[];
  customerLedger?: CustomerLedgerEntry[];
  vendorLedger?: VendorLedgerEntry[];
  expenses?: Expense[];
}): BalanceSheetSnapshotMetrics {
  const {
    products,
    customers,
    vendors,
    sales = [],
    purchases = [],
    customerLedger = [],
    vendorLedger = [],
    expenses = [],
  } = params;

  const inventory = calculateInventoryValuation(products);

  // Customer Receivables (money owed to us) using standard calculateCustomerNetBalance
  let totalReceivables = 0;
  let debtorCustomersCount = 0;

  for (const c of customers) {
    const bal = calculateCustomerNetBalance(
      c.id,
      c.openingBalance || 0,
      sales,
      customerLedger,
      c.name
    );
    if (bal > 0) {
      totalReceivables = addFinancial(totalReceivables, bal);
      debtorCustomersCount++;
    }
  }

  // Supplier Payables (money we owe to vendors) using standard calculateVendorBalance
  let totalPayables = 0;
  let creditorVendorsCount = 0;

  for (const v of vendors) {
    const bal = calculateVendorBalance(
      v.id,
      vendors,
      purchases,
      sales,
      vendorLedger,
      v.businessName
    );
    if (bal > 0) {
      totalPayables = addFinancial(totalPayables, bal);
      creditorVendorsCount++;
    }
  }

  // All time operating expenses total
  let totalExpensesAllTime = 0;
  for (const e of expenses) {
    totalExpensesAllTime = addFinancial(totalExpensesAllTime, safeFinancialNumber(e.amount, 0));
  }

  return {
    inventory,
    totalReceivables: roundCurrency(totalReceivables),
    debtorCustomersCount,
    totalPayables: roundCurrency(totalPayables),
    creditorVendorsCount,
    totalExpensesAllTime: roundCurrency(totalExpensesAllTime),
  };
}
