import { InvoiceNamingPreference, Sale, SaleFilterOptions, SaleItem } from '../types';

/**
 * Formats line item title according to invoice naming preference
 */
export function formatItemInvoiceName(
  item: { productName: string; internalId: string },
  preference: InvoiceNamingPreference = 'product_name'
): string {
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
 * Calculates aggregate stats for a list of sales
 */
export function calculateSalesSummary(sales: Sale[]) {
  let totalRevenue = 0;
  let totalCashReceived = 0;
  let totalCreditOutstanding = 0;
  let totalDiscountGiven = 0;
  let totalItemsSold = 0;
  let totalCogs = 0;
  let totalGrossProfit = 0;

  for (const s of sales) {
    totalRevenue += s.totalAmount || 0;
    totalCashReceived += s.amountReceived || 0;
    totalCreditOutstanding += s.balanceDue || 0;
    totalDiscountGiven += s.discountAmount || 0;
    
    let saleCogs = s.totalCost || 0;
    if (s.items) {
      let calcItemsCogs = 0;
      for (const item of s.items) {
        totalItemsSold += item.quantity || 1;
        const itemCost = item.costPrice !== undefined ? item.costPrice : (item.fifoCost || 0);
        calcItemsCogs += itemCost * (item.quantity || 1);
      }
      if (!saleCogs) {
        saleCogs = calcItemsCogs;
      }
    }

    const saleProfit = s.totalProfit !== undefined ? s.totalProfit : ((s.totalAmount || 0) - saleCogs);
    totalCogs += saleCogs;
    totalGrossProfit += saleProfit;
  }

  return {
    totalInvoices: sales.length,
    totalRevenue,
    totalCashReceived,
    totalCreditOutstanding,
    totalDiscountGiven,
    totalItemsSold,
    totalCogs,
    totalGrossProfit,
  };
}
