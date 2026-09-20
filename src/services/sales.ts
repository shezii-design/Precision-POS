import { InvoiceNamingPreference, Product, Sale, SaleFilterOptions, SaleItem } from '../types';
import { roundCurrency, addFinancial, multiplyFinancial, subtractFinancial, safeFinancialNumber } from './financialMath';

/**
 * Formats line item title according to invoice naming preference
 */
export function formatItemInvoiceName(
  item: { productName: string; internalId: string; customName?: string },
  preference: InvoiceNamingPreference = 'product_name'
): string {
  if (preference === 'custom' && item.customName) {
    return item.customName;
  }
  if (preference === 'internal_id') {
    return item.internalId || item.productName;
  }
  if (preference === 'both') {
    if (item.internalId && item.productName && item.internalId !== item.productName) {
      return `${item.productName} [${item.internalId}]`;
    }
    return item.productName || item.internalId;
  }
  // default: product_name
  return item.productName || item.internalId;
}

/**
 * Filters and sorts sales based on query, date range, amount range, payment type and sort options
 */
export function filterAndSortSales(
  sales: Sale[],
  filterOptions: SaleFilterOptions
): Sale[] {
  const {
    searchQuery = '',
    startDate,
    endDate,
    minAmount,
    maxAmount,
    paymentType = 'all',
    sortBy = 'date_desc',
  } = filterOptions;

  const normalizedQuery = searchQuery.trim().toLowerCase();

  return sales.filter(sale => {
    // 1. Text Search: ID, Date, Customer Name, Phone, Item names, Internal IDs
    if (normalizedQuery) {
      const matchId = (sale.id || '').toLowerCase().includes(normalizedQuery);
      const matchCustomer = (sale.customerName || '').toLowerCase().includes(normalizedQuery);
      const matchPhone = (sale.customerPhone || '').toLowerCase().includes(normalizedQuery);
      const matchDate = (sale.date || '').toLowerCase().includes(normalizedQuery);
      
      // Also match if any item name or internal id matches
      const matchItems = sale.items?.some(item => 
        (item.productName || '').toLowerCase().includes(normalizedQuery) ||
        (item.internalId || '').toLowerCase().includes(normalizedQuery) ||
        (item.crossReferences || '').toLowerCase().includes(normalizedQuery) ||
        (item.machineNames || '').toLowerCase().includes(normalizedQuery)
      );

      if (!matchId && !matchCustomer && !matchPhone && !matchDate && !matchItems) {
        return false;
      }
    }

    // 2. Date Range Filter
    if (startDate) {
      const saleDate = new Date(sale.date || sale.createdAt).getTime();
      const start = new Date(`${startDate}T00:00:00`).getTime();
      if (saleDate < start) return false;
    }

    if (endDate) {
      const saleDate = new Date(sale.date || sale.createdAt).getTime();
      const end = new Date(`${endDate}T23:59:59`).getTime();
      if (saleDate > end) return false;
    }

    // 3. Amount Range Filter
    if (minAmount !== undefined && minAmount !== null && !isNaN(minAmount)) {
      if ((sale.totalAmount || 0) < minAmount) return false;
    }

    if (maxAmount !== undefined && maxAmount !== null && !isNaN(maxAmount)) {
      if ((sale.totalAmount || 0) > maxAmount) return false;
    }

    // 4. Payment Type Filter (Cash vs Credit vs Partial)
    if (paymentType && paymentType !== 'all') {
      if (paymentType === 'cash') {
        const isCash = sale.paymentType === 'cash' || (sale.amountReceived >= sale.totalAmount && sale.totalAmount > 0);
        if (!isCash) return false;
      } else if (paymentType === 'partial') {
        const isPartial = sale.paymentType === 'partial' || (sale.amountReceived > 0 && sale.amountReceived < sale.totalAmount);
        if (!isPartial) return false;
      } else if (paymentType === 'credit') {
        const isCredit = sale.paymentType === 'credit' || sale.amountReceived === 0;
        if (!isCredit) return false;
      } else if (sale.paymentType !== paymentType) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt).getTime();
    const dateB = new Date(b.date || b.createdAt).getTime();

    // Extract numeric IDs e.g. "INV-1001" -> 1001
    const extractNum = (idStr: string) => {
      const match = idStr.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    };

    const numA = extractNum(a.id);
    const numB = extractNum(b.id);

    switch (sortBy) {
      case 'date_asc':
        return dateA - dateB;
      case 'id_desc':
        return numB - numA;
      case 'id_asc':
        return numA - numB;
      case 'amount_desc':
        return (b.totalAmount || 0) - (a.totalAmount || 0);
      case 'amount_asc':
        return (a.totalAmount || 0) - (b.totalAmount || 0);
      case 'date_desc':
      default:
        return dateB - dateA;
    }
  });
}

/**
 * Calculates the exact Cost of Goods Sold (COGS) for a single sale line item.
 * Eradicates double-quantity multiplication glitches and correctly respects returns.
 */
export function calculateSaleItemCogs(
  item: SaleItem,
  productsMap?: Map<string, Product>,
  respectReturns: boolean = true
): { unitCost: number; lineCogs: number; quantity: number } {
  const origQty = Math.max(0, safeFinancialNumber(item.quantity, 1));
  const returnedQty = Math.max(0, safeFinancialNumber(item.returnedQuantity, 0));
  const netQty = item.netQuantity !== undefined
    ? Math.max(0, safeFinancialNumber(item.netQuantity, origQty))
    : Math.max(0, origQty - returnedQty);

  const effectiveQty = respectReturns ? netQty : origQty;

  // 1. Resolve unit cost accurately without double-multiplying
  let unitCost = 0;
  if (item.fifoCost !== undefined && item.fifoCost > 0) {
    unitCost = safeFinancialNumber(item.fifoCost, 0);
  } else if (item.costPrice !== undefined && item.costPrice > 0) {
    unitCost = safeFinancialNumber(item.costPrice, 0);
  } else if (item.cogs !== undefined && item.cogs > 0 && origQty > 0) {
    // item.cogs is the total FIFO COGS for the line item (origQty * unitFifoCost)
    unitCost = item.cogs / origQty;
  } else if (productsMap) {
    const prod = productsMap.get(item.productId) || (item.internalId ? productsMap.get(item.internalId) : undefined);
    if (prod?.costPrice && prod.costPrice > 0) {
      unitCost = safeFinancialNumber(prod.costPrice, 0);
    }
  }

  // 2. Compute exact line COGS
  let lineCogs = 0;
  if (unitCost > 0) {
    lineCogs = roundCurrency(unitCost * effectiveQty);
  } else if (item.cogs !== undefined && item.cogs > 0) {
    const ratio = origQty > 0 ? (effectiveQty / origQty) : 1;
    lineCogs = roundCurrency(item.cogs * ratio);
  }

  return { unitCost, lineCogs, quantity: effectiveQty };
}

/**
 * Calculates the total Cost of Goods Sold (COGS) for an entire sale invoice.
 * Accurately aggregates item-level COGS with FIFO / unit cost valuation.
 */
export function calculateSaleCogs(
  sale: Sale,
  productsMap?: Map<string, Product>,
  respectReturns: boolean = true
): number {
  if (sale.items && sale.items.length > 0) {
    let sumCogs = 0;
    for (const item of sale.items) {
      const { lineCogs } = calculateSaleItemCogs(item, productsMap, respectReturns);
      sumCogs = addFinancial(sumCogs, lineCogs);
    }
    return roundCurrency(sumCogs);
  }

  // Fallback to sale.totalCost if line items array is not populated
  const rawCost = safeFinancialNumber(sale.totalCost, 0);
  if (respectReturns && sale.hasReturns && sale.totalAmount > 0) {
    const netAmount = safeFinancialNumber(sale.netAmount, sale.totalAmount);
    const ratio = Math.max(0, Math.min(1, netAmount / sale.totalAmount));
    return roundCurrency(rawCost * ratio);
  }
  return roundCurrency(rawCost);
}

/**
 * Calculates aggregate stats for a list of sales
 */
export function calculateSalesSummary(sales: Sale[], productsMap?: Map<string, Product>) {
  let totalRevenue = 0;
  let totalCashReceived = 0;
  let totalCreditOutstanding = 0;
  let totalDiscountGiven = 0;
  let totalItemsSold = 0;
  let totalCogs = 0;
  let totalGrossProfit = 0;

  for (const s of sales) {
    totalRevenue = addFinancial(totalRevenue, s.totalAmount || 0);
    totalCashReceived = addFinancial(totalCashReceived, s.amountReceived || 0);
    totalCreditOutstanding = addFinancial(totalCreditOutstanding, s.balanceDue || 0);
    totalDiscountGiven = addFinancial(totalDiscountGiven, s.discountAmount || (s as any).discount || 0);

    const saleCogs = calculateSaleCogs(s, productsMap, true);
    if (s.items) {
      for (const item of s.items) {
        const netQty = item.netQuantity !== undefined ? item.netQuantity : item.quantity;
        totalItemsSold += safeFinancialNumber(netQty, 1);
      }
    } else {
      totalItemsSold += 1;
    }

    const saleProfit = subtractFinancial(s.totalAmount || 0, saleCogs);
    totalCogs = addFinancial(totalCogs, saleCogs);
    totalGrossProfit = addFinancial(totalGrossProfit, saleProfit);
  }

  return {
    totalInvoices: sales.length,
    totalRevenue: roundCurrency(totalRevenue),
    totalCashReceived: roundCurrency(totalCashReceived),
    totalCreditOutstanding: roundCurrency(totalCreditOutstanding),
    totalDiscountGiven: roundCurrency(totalDiscountGiven),
    totalItemsSold: Math.round(totalItemsSold),
    totalCogs: roundCurrency(totalCogs),
    totalGrossProfit: roundCurrency(totalGrossProfit),
  };
}
