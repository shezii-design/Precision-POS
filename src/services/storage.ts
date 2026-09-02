import { 
  BatchUsage,
  Brand, 
  CompanyMachine,
  ComputedCustomerLedgerRow,
  CostBatch,
  Customer,
  CustomerLedgerEntry,
  CustomerType,
  GlobalPricingSettings, 
  LocationItem, 
  MachineDemandItem,
  Product, 
  ProductPurchaseHistoryItem,
  ProductType, 
  Purchase,
  PurchaseItem,
  Sale,
  SaleItem,
  StockLog, 
  SupabaseConfig,
  Vendor,
  VendorLedgerEntry,
  CustomerReturn,
  CustomerReturnItem,
  VendorReturn,
  VendorReturnItem,
  SaleReturnSummary,
  PurchaseReturnSummary,
  Quotation,
  QuotationItem,
  QuotationStatus,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  PurchaseOrderFilterOptions,
  Demand,
  DemandStatus,
  DemandFilterOptions,
  Expense,
  ExpenseCategory,
  ExpenseFilterOptions
} from '../types';
import { DEFAULT_PRICING_SETTINGS, generateProductSellingPrices } from './pricing';
import { getEnvSupabaseConfig } from './supabase';

const PRODUCTS_KEY = 'kfh_inventory_products_v1';
const BRANDS_KEY = 'kfh_inventory_brands_v1';
const TYPES_KEY = 'kfh_inventory_types_v1';
const LOCATIONS_KEY = 'kfh_inventory_locations_v1';
const PRICING_SETTINGS_KEY = 'kfh_inventory_pricing_settings_v1';
const SUPABASE_CONFIG_KEY = 'kfh_inventory_supabase_config_v1';
const STOCK_LOGS_KEY = 'kfh_inventory_stock_logs_v1';
const CUSTOMERS_KEY = 'kfh_inventory_customers_v1';
const CUSTOMER_LEDGER_KEY = 'kfh_inventory_customer_ledger_v1';
const SALES_KEY = 'kfh_inventory_sales_v1';
const VENDORS_KEY = 'kfh_inventory_vendors_v1';
const PURCHASES_KEY = 'kfh_inventory_purchases_v1';
const VENDOR_LEDGER_KEY = 'kfh_inventory_vendor_ledger_v1';
const CUSTOMER_RETURNS_KEY = 'kfh_inventory_customer_returns_v1';
const VENDOR_RETURNS_KEY = 'kfh_inventory_vendor_returns_v1';
const QUOTATIONS_KEY = 'kfh_inventory_quotations_v1';
const PURCHASE_ORDERS_KEY = 'kfh_inventory_purchase_orders_v1';
const DEMANDS_KEY = 'kfh_inventory_demands_v1';
const EXPENSES_KEY = 'kfh_inventory_expenses_v1';

const CLEAN_STORAGE_VERSION_KEY = 'kfh_inventory_clean_state_v1';

export function ensureCleanStorage(): void {
  try {
    const isCleaned = localStorage.getItem(CLEAN_STORAGE_VERSION_KEY);
    if (!isCleaned) {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify([]));
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify([]));
      localStorage.setItem(CUSTOMER_LEDGER_KEY, JSON.stringify([]));
      localStorage.setItem(SALES_KEY, JSON.stringify([]));
      localStorage.setItem(VENDORS_KEY, JSON.stringify([]));
      localStorage.setItem(PURCHASES_KEY, JSON.stringify([]));
      localStorage.setItem(VENDOR_LEDGER_KEY, JSON.stringify([]));
      localStorage.setItem(CUSTOMER_RETURNS_KEY, JSON.stringify([]));
      localStorage.setItem(VENDOR_RETURNS_KEY, JSON.stringify([]));
      localStorage.setItem(QUOTATIONS_KEY, JSON.stringify([]));
      localStorage.setItem(PURCHASE_ORDERS_KEY, JSON.stringify([]));
      localStorage.setItem(DEMANDS_KEY, JSON.stringify([]));
      localStorage.setItem(EXPENSES_KEY, JSON.stringify([]));
      localStorage.setItem(STOCK_LOGS_KEY, JSON.stringify([]));
      localStorage.setItem(BRANDS_KEY, JSON.stringify([]));
      localStorage.setItem(TYPES_KEY, JSON.stringify([]));
      localStorage.setItem(LOCATIONS_KEY, JSON.stringify([]));
      localStorage.setItem(CLEAN_STORAGE_VERSION_KEY, 'true');
    }
  } catch (err) {
    console.error('Failed to initialize clean storage', err);
  }
}

// Automatically ensure clean storage on load
ensureCleanStorage();

export const INITIAL_BRANDS: Brand[] = [];

export const INITIAL_TYPES: ProductType[] = [];

export const INITIAL_LOCATIONS: LocationItem[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

/**
 * Calculates the active inventory unit cost according to First-In, First-Out (FIFO).
 * Finds the oldest batch with remainingQuantity > 0.
 * If all batches have 0 remaining, falls back to the most recent batch's unitCost, or the product's costPrice.
 */
export function getActiveFifoCost(prod: { costBatches?: CostBatch[]; costPrice?: number } | undefined | null): number {
  if (!prod) return 0;
  const batches = prod.costBatches || [];
  if (batches.length === 0) {
    return Number(prod.costPrice) || 0;
  }

  // Sort batches chronologically (oldest first)
  const sortedBatches = [...batches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Find the first/oldest batch that still has stock remaining
  const activeBatch = sortedBatches.find(b => (b.remainingQuantity || 0) > 0);
  if (activeBatch && activeBatch.unitCost !== undefined && activeBatch.unitCost > 0) {
    return Number(activeBatch.unitCost);
  }

  // If no remaining batches, fall back to the most recent batch's unit cost
  const latestBatch = sortedBatches[sortedBatches.length - 1];
  if (latestBatch && latestBatch.unitCost !== undefined && latestBatch.unitCost > 0) {
    return Number(latestBatch.unitCost);
  }

  return Number(prod.costPrice) || 0;
}

/**
 * Ensures a product has a valid costBatches array initialized for FIFO cost tracking
 * without inappropriately reverting manually set or newly purchased costPrices.
 */
export function ensureProductBatches(prod: Product): Product {
  if (prod.costBatches && prod.costBatches.length > 0) {
    if (prod.costPrice === undefined || prod.costPrice === null || isNaN(prod.costPrice) || prod.costPrice === 0) {
      const activeCost = getActiveFifoCost(prod);
      if (activeCost > 0) {
        return {
          ...prod,
          costPrice: activeCost,
        };
      }
    }
    return prod;
  }
  const stock = prod.stockQuantity || 0;
  const initialBatches: CostBatch[] = stock > 0 ? [
    {
      id: `batch-init-${prod.id}`,
      purchaseId: 'initial',
      billNumber: 'Opening Stock',
      vendorId: prod.vendorId,
      vendorName: prod.vendorName || 'Opening Stock',
      date: prod.createdAt || new Date().toISOString(),
      quantity: stock,
      remainingQuantity: stock,
      unitCost: Number(prod.costPrice) || 0,
      notes: 'Initial inventory stock batch',
    }
  ] : [];

  return {
    ...prod,
    costPrice: Number(prod.costPrice) || (initialBatches[0]?.unitCost || 0),
    costBatches: initialBatches,
  };
}

export function getStoredProducts(): Product[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (!raw) {
      const initialized = INITIAL_PRODUCTS.map(ensureProductBatches);
      saveStoredProducts(initialized);
      return initialized;
    }
    const parsed: Product[] = JSON.parse(raw);
    return parsed.map(ensureProductBatches);
  } catch (err) {
    console.error('Failed to load products', err);
    return INITIAL_PRODUCTS.map(ensureProductBatches);
  }
}

export function saveStoredProducts(products: Product[]): void {
  try {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  } catch (err) {
    console.error('Failed to save products', err);
  }
}

export function getStoredBrands(): Brand[] {
  try {
    const raw = localStorage.getItem(BRANDS_KEY);
    if (!raw) {
      saveStoredBrands(INITIAL_BRANDS);
      return INITIAL_BRANDS;
    }
    return JSON.parse(raw);
  } catch (err) {
    return INITIAL_BRANDS;
  }
}

export function saveStoredBrands(brands: Brand[]): void {
  try {
    localStorage.setItem(BRANDS_KEY, JSON.stringify(brands));
  } catch (err) {
    console.error('Failed to save brands', err);
  }
}

export function getStoredTypes(): ProductType[] {
  try {
    const raw = localStorage.getItem(TYPES_KEY);
    if (!raw) {
      saveStoredTypes(INITIAL_TYPES);
      return INITIAL_TYPES;
    }
    return JSON.parse(raw);
  } catch (err) {
    return INITIAL_TYPES;
  }
}

export function saveStoredTypes(types: ProductType[]): void {
  try {
    localStorage.setItem(TYPES_KEY, JSON.stringify(types));
  } catch (err) {
    console.error('Failed to save types', err);
  }
}

export function getStoredLocations(): LocationItem[] {
  try {
    const raw = localStorage.getItem(LOCATIONS_KEY);
    if (!raw) {
      saveStoredLocations(INITIAL_LOCATIONS);
      return INITIAL_LOCATIONS;
    }
    return JSON.parse(raw);
  } catch (err) {
    return INITIAL_LOCATIONS;
  }
}

export function saveStoredLocations(locations: LocationItem[]): void {
  try {
    localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
  } catch (err) {
    console.error('Failed to save locations', err);
  }
}

export function getStoredPricingSettings(): GlobalPricingSettings {
  try {
    const raw = localStorage.getItem(PRICING_SETTINGS_KEY);
    if (!raw) {
      saveStoredPricingSettings(DEFAULT_PRICING_SETTINGS);
      return DEFAULT_PRICING_SETTINGS;
    }
    return JSON.parse(raw);
  } catch (err) {
    return DEFAULT_PRICING_SETTINGS;
  }
}

export function saveStoredPricingSettings(settings: GlobalPricingSettings): void {
  try {
    localStorage.setItem(PRICING_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save pricing settings', err);
  }
}

export function getStoredSupabaseConfig(): SupabaseConfig {
  const env = getEnvSupabaseConfig();
  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    
    return {
      url: env.url || parsed?.url || '',
      anonKey: env.anonKey || parsed?.anonKey || '',
      enabled: env.isConfigured ? (parsed?.enabled !== false) : false,
      syncStatus: env.isConfigured ? (parsed?.syncStatus || 'connected') : 'disconnected',
      lastSyncedAt: parsed?.lastSyncedAt,
      errorMessage: parsed?.errorMessage,
    };
  } catch (err) {
    return {
      url: env.url || '',
      anonKey: env.anonKey || '',
      enabled: env.isConfigured,
      syncStatus: env.isConfigured ? 'connected' : 'disconnected',
    };
  }
}

export function saveStoredSupabaseConfig(config: SupabaseConfig): void {
  try {
    const env = getEnvSupabaseConfig();
    const toSave: SupabaseConfig = {
      ...config,
      url: env.url || config.url || '',
      anonKey: env.anonKey || config.anonKey || '',
    };
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.error('Failed to save supabase config', err);
  }
}

export const INITIAL_STOCK_LOGS: StockLog[] = [];

export function getStoredStockLogs(): StockLog[] {
  try {
    ensureCleanStorage();
    const raw = localStorage.getItem(STOCK_LOGS_KEY);
    if (!raw) {
      saveStoredStockLogs([]);
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

export function saveStoredStockLogs(logs: StockLog[]): void {
  try {
    const trimmed = logs.slice(0, 1000);
    localStorage.setItem(STOCK_LOGS_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save stock logs', err);
  }
}

export function saveStockLog(log: StockLog): void {
  try {
    const logs = getStoredStockLogs();
    logs.unshift(log); // newest first
    // keep maximum 1000 logs locally
    const trimmed = logs.slice(0, 1000);
    localStorage.setItem(STOCK_LOGS_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save stock log', err);
  }
}

/**
 * Calculates next internal ID starting from KFH-2501
 */
export function getNextInternalId(existingProducts: Product[]): string {
  let highestNum = 2500;
  const regex = /KFH-(\d+)/i;

  for (const p of existingProducts) {
    if (p.internalId) {
      const match = p.internalId.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > highestNum) {
          highestNum = num;
        }
      }
    }
  }

  const nextNum = highestNum + 1;
  return `KFH-${nextNum}`;
}

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_CUSTOMER_LEDGER: CustomerLedgerEntry[] = [];

export const INITIAL_SALES: Sale[] = [];

export function getStoredCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    if (!raw) {
      saveStoredCustomers(INITIAL_CUSTOMERS);
      return INITIAL_CUSTOMERS;
    }
    return JSON.parse(raw);
  } catch (err) {
    return INITIAL_CUSTOMERS;
  }
}

export function saveStoredCustomers(customers: Customer[]): void {
  try {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
  } catch (err) {
    console.error('Failed to save customers', err);
  }
}

export function getStoredSales(): Sale[] {
  try {
    const raw = localStorage.getItem(SALES_KEY);
    const returnsRaw = localStorage.getItem(CUSTOMER_RETURNS_KEY);
    const returns: CustomerReturn[] = returnsRaw ? JSON.parse(returnsRaw) : INITIAL_CUSTOMER_RETURNS;

    if (!raw) {
      const synced = syncSalesWithReturns(INITIAL_SALES, returns);
      saveStoredSales(synced);
      return synced;
    }
    const parsed: Sale[] = JSON.parse(raw);
    return syncSalesWithReturns(parsed, returns);
  } catch (err) {
    return INITIAL_SALES;
  }
}

export function saveStoredSales(sales: Sale[]): void {
  try {
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
  } catch (err) {
    console.error('Failed to save sales', err);
  }
}

/**
 * Calculates next sequential invoice/sale ID starting from INV-1001
 */
export function getNextSaleId(existingSales: Sale[]): string {
  let highestNum = 1000;
  const regex = /INV-(\d+)/i;

  for (const s of existingSales) {
    if (s.id) {
      const match = s.id.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > highestNum) {
          highestNum = num;
        }
      }
    }
  }

  const nextNum = highestNum + 1;
  return `INV-${nextNum}`;
}

/**
 * Finds the latest/last selling price for a specific customer and product.
 * Returns null if no previous purchase history exists for this combo or if customer is Walk-in.
 */
export function getCustomerLastPrice(
  customerName: string,
  productId: string,
  sales: Sale[]
): { price: number; saleId: string; date: string } | null {
  if (!customerName || customerName.trim() === '' || customerName.toLowerCase() === 'walk-in customer') {
    return null;
  }

  const normalizedCustomer = customerName.trim().toLowerCase();

  // Sort sales from newest to oldest
  const sortedSales = [...sales].sort(
    (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
  );

  for (const sale of sortedSales) {
    if (sale.customerName && sale.customerName.trim().toLowerCase() === normalizedCustomer) {
      const matchedItem = sale.items.find(item => item.productId === productId);
      if (matchedItem && matchedItem.unitPrice > 0) {
        return {
          price: matchedItem.unitPrice,
          saleId: sale.id,
          date: sale.date,
        };
      }
    }
  }

  return null;
}

export interface FifoDeductionResult {
  batchesUsed: BatchUsage[];
  totalCogs: number;
  unitAverageFifoCost: number;
  updatedBatches: CostBatch[];
}

/**
 * Deducts sold quantity from stock batches according to First-In, First-Out (FIFO)
 */
export function deductFifoStockBatches(
  batches: CostBatch[] = [],
  quantityToSell: number,
  fallbackCostPrice: number = 0,
  productInfo?: { name?: string; internalId?: string; vendorName?: string }
): FifoDeductionResult {
  let remainingNeeded = Math.max(0, quantityToSell);
  const updatedBatches: CostBatch[] = [];
  const batchesUsed: BatchUsage[] = [];
  let totalCogs = 0;

  // Sort batches chronologically (oldest first)
  const sortedBatches = [...batches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const batch of sortedBatches) {
    const currentRemaining = Math.max(0, batch.remainingQuantity || 0);

    if (remainingNeeded > 0 && currentRemaining > 0) {
      const takeQty = Math.min(remainingNeeded, currentRemaining);
      const batchCost = Number(batch.unitCost) || 0;

      batchesUsed.push({
        batchId: batch.id,
        quantity: takeQty,
        unitCost: batchCost,
        billNumber: batch.billNumber,
        vendorName: batch.vendorName,
        date: batch.date,
      });

      totalCogs += takeQty * batchCost;
      remainingNeeded -= takeQty;

      updatedBatches.push({
        ...batch,
        remainingQuantity: currentRemaining - takeQty,
      });
    } else {
      updatedBatches.push({ ...batch });
    }
  }

  // If there wasn't enough quantity in tracked batches, use fallbackCostPrice
  if (remainingNeeded > 0) {
    const fallbackCost = Number(fallbackCostPrice) || 0;
    batchesUsed.push({
      batchId: `batch-untracked-${Date.now()}`,
      quantity: remainingNeeded,
      unitCost: fallbackCost,
      billNumber: 'Direct Stock',
      vendorName: productInfo?.vendorName || 'Inventory',
      date: new Date().toISOString(),
    });
    totalCogs += remainingNeeded * fallbackCost;
  }

  const unitAverageFifoCost = quantityToSell > 0 ? totalCogs / quantityToSell : fallbackCostPrice;

  return {
    batchesUsed,
    totalCogs: Math.round(totalCogs),
    unitAverageFifoCost: Math.round(unitAverageFifoCost * 100) / 100,
    updatedBatches,
  };
}

/**
 * Records a new sale, automatically updates inventory stock via FIFO, updates product cross-references
 * and machine names in inventory if provided, and adds new customer if not existing.
 */
export function recordSaleAndUpdateInventory(
  sale: Sale,
  currentProducts: Product[],
  currentSales: Sale[],
  currentCustomers: Customer[]
): {
  updatedProducts: Product[];
  updatedSales: Sale[];
  updatedCustomers: Customer[];
} {
  const processedItems: SaleItem[] = [];
  let saleTotalCogs = 0;

  // 1. Update product stock and deduct batches via FIFO
  const updatedProducts = currentProducts.map(rawProd => {
    const prod = ensureProductBatches(rawProd);
    const saleItem = sale.items.find(item => item.productId === prod.id);
    if (!saleItem) return prod;

    const previousStock = prod.stockQuantity || 0;
    const qtySold = saleItem.quantity || 1;
    const newStock = Math.max(0, previousStock - qtySold);

    // Run FIFO deduction on product's batches
    const fifoResult = deductFifoStockBatches(
      prod.costBatches || [],
      qtySold,
      prod.costPrice,
      { name: prod.name, internalId: prod.internalId, vendorName: prod.vendorName }
    );

    const nextActiveCost = getActiveFifoCost({
      costBatches: fifoResult.updatedBatches,
      costPrice: prod.costPrice,
    });

    const pricingSettings = getStoredPricingSettings();
    const nextSellingPrices = nextActiveCost > 0
      ? generateProductSellingPrices(nextActiveCost, pricingSettings, prod.sellingPrices)
      : prod.sellingPrices;

    const enrichedSaleItem: SaleItem = {
      ...saleItem,
      costPrice: fifoResult.unitAverageFifoCost,
      fifoCost: fifoResult.unitAverageFifoCost,
      cogs: fifoResult.totalCogs,
      batchesUsed: fifoResult.batchesUsed,
    };
    processedItems.push(enrichedSaleItem);
    saleTotalCogs += fifoResult.totalCogs;

    // Merge cross references if user added new ones in sale
    let mergedCrossrefs = prod.crossReferences || '';
    if (saleItem.crossReferences && saleItem.crossReferences.trim() !== '') {
      const existingRefs = (prod.crossReferences || '')
        .split('\n')
        .map(r => r.trim())
        .filter(Boolean);
      const newRefs = saleItem.crossReferences
        .split('\n')
        .map(r => r.trim())
        .filter(Boolean);

      const combined = Array.from(new Set([...existingRefs, ...newRefs]));
      mergedCrossrefs = combined.join('\n');
    }

    // Merge machine names if user added new ones in sale
    let mergedMachines = prod.machineNames || '';
    if (saleItem.machineNames && saleItem.machineNames.trim() !== '') {
      const existingMachines = (prod.machineNames || '')
        .split('\n')
        .map(m => m.trim())
        .filter(Boolean);
      const newMachines = saleItem.machineNames
        .split('\n')
        .map(m => m.trim())
        .filter(Boolean);

      const combined = Array.from(new Set([...existingMachines, ...newMachines]));
      mergedMachines = combined.join('\n');
    }

    // Log stock change with dispatch location details
    const dispatchLoc = saleItem.locationName || prod.locationName || 'Main Shop';
    const dispatchCabin = saleItem.cabinNumber ? ` (${saleItem.cabinNumber})` : (prod.cabinNumber ? ` (${prod.cabinNumber})` : '');
    saveStockLog({
      id: `log-${Date.now()}-${prod.id}`,
      productId: prod.id,
      productName: prod.name,
      internalId: prod.internalId,
      brandName: prod.brandName,
      typeName: prod.typeName,
      unit: prod.unit,
      change: -qtySold,
      previousStock,
      newStock,
      reason: 'Sale',
      movementType: 'sale',
      referenceId: sale.id,
      referenceNumber: sale.id,
      entityName: sale.customerName || 'Walk-in Customer',
      unitRate: Number(saleItem.unitPrice) || 0,
      totalMovementValue: Math.round(qtySold * (Number(saleItem.unitPrice) || 0)),
      locationName: saleItem.locationName || prod.locationName,
      cabinNumber: saleItem.cabinNumber || prod.cabinNumber,
      timestamp: sale.date || new Date().toISOString(),
      notes: `Sale ${sale.id} to ${sale.customerName || 'Walk-in'} (Qty: ${qtySold} @ FIFO Cost ₨ ${fifoResult.unitAverageFifoCost.toLocaleString()}) • Dispatched: ${dispatchLoc}${dispatchCabin}`,
    });

    return {
      ...prod,
      stockQuantity: newStock,
      costPrice: nextActiveCost > 0 ? nextActiveCost : prod.costPrice,
      sellingPrices: nextSellingPrices,
      costBatches: fifoResult.updatedBatches,
      crossReferences: mergedCrossrefs,
      machineNames: mergedMachines,
      updatedAt: new Date().toISOString(),
    };
  });

  // 2. Finalize sale object with calculated FIFO COGS and Profit
  const finalizedSale: Sale = {
    ...sale,
    items: processedItems.length > 0 ? processedItems : sale.items,
    totalCost: saleTotalCogs,
    totalProfit: Math.round((sale.totalAmount || 0) - saleTotalCogs),
  };

  // 3. Add or update customer in customer list
  const updatedCustomers = [...currentCustomers];
  if (sale.customerName && sale.customerName.trim().toLowerCase() !== 'walk-in customer') {
    const existingIndex = updatedCustomers.findIndex(
      c => (sale.customerId && c.id === sale.customerId) || c.name.trim().toLowerCase() === sale.customerName.trim().toLowerCase()
    );

    if (existingIndex >= 0) {
      const current = updatedCustomers[existingIndex];
      updatedCustomers[existingIndex] = {
        ...current,
        phone: sale.customerPhone || current.phone,
        totalPurchases: (current.totalPurchases || 0) + sale.totalAmount,
        updatedAt: new Date().toISOString(),
      };
    } else {
      updatedCustomers.push({
        id: sale.customerId || `cust-${Date.now()}`,
        type: 'customer',
        name: sale.customerName.trim(),
        phone: sale.customerPhone?.trim(),
        totalPurchases: sale.totalAmount,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 4. Prepend the new sale to sales list (newest first)
  const updatedSales = [finalizedSale, ...currentSales];

  // Save to localStorage
  saveStoredProducts(updatedProducts);
  saveStoredSales(updatedSales);
  saveStoredCustomers(updatedCustomers);

  return {
    updatedProducts,
    updatedSales,
    updatedCustomers,
  };
}

// ----------------------------------------------------
// CUSTOMER LEDGER & COMPANY DEMAND SYNC HELPERS
// ----------------------------------------------------

export function getStoredCustomerLedger(): CustomerLedgerEntry[] {
  try {
    const raw = localStorage.getItem(CUSTOMER_LEDGER_KEY);
    if (!raw) {
      saveStoredCustomerLedger(INITIAL_CUSTOMER_LEDGER);
      return INITIAL_CUSTOMER_LEDGER;
    }
    return JSON.parse(raw);
  } catch (err) {
    return INITIAL_CUSTOMER_LEDGER;
  }
}

export const getStoredCustomerLedgerEntries = getStoredCustomerLedger;

export function saveStoredCustomerLedger(entries: CustomerLedgerEntry[]): void {
  try {
    localStorage.setItem(CUSTOMER_LEDGER_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error('Failed to save customer ledger', err);
  }
}

export const saveStoredCustomerLedgerEntries = saveStoredCustomerLedger;

/**
 * Extracts standard calendar day string YYYY-MM-DD from any date string or ISO timestamp.
 */
export function extractCalendarDate(dateStr?: string): string {
  if (!dateStr) return '1970-01-01';
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '1970-01-01';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Safely parses any date string into a timestamp in milliseconds.
 */
export function parseDateTimestamp(dateStr?: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

/**
 * Calculates current net balance that a customer owes us in PKR:
 * Balance Customer Owes Us =
 *   Opening Balance (Debit if positive, Credit if negative)
 *   + Total Invoiced Sales (Debit)
 *   - Cash Received on Invoices (Credit)
 *   - Direct Payments Received in Ledger (Credit)
 *   + Cash Refunds Given to Customer (Debit)
 *   + Adjustments (Debit - Credit)
 * 
 * Positive = Customer Owes Us (Receivable / Dr)
 * Negative = Customer has Advance Balance (Credit / Cr)
 * 0 = Settled
 */
export function calculateCustomerNetBalance(
  customerId: string,
  openingBalance: number = 0,
  sales: Sale[] = [],
  ledgerEntries: CustomerLedgerEntry[] = [],
  customerName?: string
): number {
  if (!customerId && !customerName) return 0;
  const cNameLower = customerName?.trim().toLowerCase();

  // 1. Filter sales for this customer by ID or exact Name match
  const customerSales = sales.filter(s => 
    (customerId && s.customerId === customerId) || 
    (cNameLower && s.customerName && s.customerName.trim().toLowerCase() === cNameLower)
  );
  const totalInvoicedSales = customerSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  const totalSalesCashReceived = customerSales.reduce((sum, s) => sum + (Number(s.amountReceived) || 0), 0);

  // 2. Filter direct ledger entries for this customer
  const customerEntries = ledgerEntries.filter(e => 
    (customerId && e.customerId === customerId) || 
    (cNameLower && e.customerName && e.customerName.trim().toLowerCase() === cNameLower)
  );
  
  let ledgerDebits = 0;
  let ledgerCredits = 0;
  let openBalFromLedger: number | null = null;

  for (const entry of customerEntries) {
    if (entry.type === 'opening_balance') {
      const d = Number(entry.debit) || (entry.amount > 0 ? Number(entry.amount) : 0);
      const c = Number(entry.credit) || (entry.amount < 0 ? Math.abs(Number(entry.amount)) : 0);
      openBalFromLedger = d - c;
    } else if (entry.type === 'payment_received') {
      ledgerCredits += Number(entry.amount ?? entry.credit ?? 0);
    } else if (entry.type === 'cash_refund') {
      ledgerDebits += Number(entry.amount ?? entry.debit ?? 0);
    } else if (entry.type === 'adjustment') {
      ledgerDebits += Number(entry.debit ?? (entry.amount > 0 ? entry.amount : 0));
      ledgerCredits += Number(entry.credit ?? (entry.amount < 0 ? Math.abs(entry.amount) : 0));
    }
  }

  const effectiveOpeningBalance = openBalFromLedger !== null ? openBalFromLedger : (Number(openingBalance) || 0);
  const netBalance = effectiveOpeningBalance + totalInvoicedSales - totalSalesCashReceived + ledgerDebits - ledgerCredits;
  return Math.round(netBalance);
}

/**
 * Builds chronological ledger rows for a customer, calculating running balance step by step.
 * Uses robust calendar-date sorting and standard accounting priority (Invoice strictly before Payment on the same date).
 */
export function computeCustomerLedgerRows(
  customer: Customer,
  sales: Sale[] = [],
  ledgerEntries: CustomerLedgerEntry[] = []
): ComputedCustomerLedgerRow[] {
  const rows: ComputedCustomerLedgerRow[] = [];
  const customerId = customer.id;
  const customerNameLower = customer.name?.trim().toLowerCase();

  // 1. Direct Customer Ledger Entries for this customer
  const directEntries = ledgerEntries.filter(e => 
    (customerId && e.customerId === customerId) || 
    (customerNameLower && e.customerName && e.customerName.trim().toLowerCase() === customerNameLower)
  );

  // 2. Opening Balance row
  const openEntry = directEntries.find(e => e.type === 'opening_balance');
  let openDebit = 0;
  let openCredit = 0;
  let openDate = customer.createdAt || new Date(Date.now() - 365 * 86400000).toISOString();

  if (openEntry) {
    openDebit = Number(openEntry.debit) || (Number(openEntry.amount) > 0 ? Number(openEntry.amount) : 0);
    openCredit = Number(openEntry.credit) || (Number(openEntry.amount) < 0 ? Math.abs(Number(openEntry.amount)) : 0);
    openDate = openEntry.date || openEntry.createdAt || openDate;
  } else {
    const rawOpening = Number(customer.openingBalance) || 0;
    if (rawOpening > 0) openDebit = rawOpening;
    else if (rawOpening < 0) openCredit = Math.abs(rawOpening);
  }

  if (openDebit > 0 || openCredit > 0 || (customer.openingBalance && customer.openingBalance !== 0)) {
    rows.push({
      id: openEntry?.id || `open-${customer.id}`,
      sourceType: 'opening_balance',
      date: openDate,
      entryCode: openEntry?.entryCode || 'Opening Bal',
      description: openEntry?.description || 'Opening balance brought forward',
      debit: openDebit,
      credit: openCredit,
      runningBalance: 0,
      rawObject: openEntry || customer,
    });
  }

  // 3. Sales made to this customer
  const customerSales = sales.filter(s => 
    (customerId && s.customerId === customerId) || 
    (customerNameLower && s.customerName && s.customerName.trim().toLowerCase() === customerNameLower)
  );

  for (const sale of customerSales) {
    const saleDate = sale.date || sale.createdAt || new Date().toISOString();
    
    // Invoice Row (Debit) - Recorded FIRST
    rows.push({
      id: `sale-inv-${sale.id}`,
      sourceType: 'sale',
      date: saleDate,
      entryCode: sale.id,
      billNumber: sale.id,
      referenceId: sale.id,
      description: `Sales Invoice ${sale.id} (${sale.items.length} item${sale.items.length === 1 ? '' : 's'})${sale.notes ? ` - ${sale.notes}` : ''}`,
      debit: Number(sale.totalAmount) || 0,
      credit: 0,
      runningBalance: 0,
      rawObject: sale,
    });

    // Payment on Invoice Row (Credit) - Recorded AFTER the invoice entry
    const amountReceived = Number(sale.amountReceived) || 0;
    if (amountReceived > 0) {
      const isFull = amountReceived >= (Number(sale.totalAmount) || 0);
      const isHalf = !isFull && Math.abs(amountReceived - Math.round((Number(sale.totalAmount) || 0) / 2)) <= 1;
      const isPartial = !isFull;
      
      // Sequenced with slightly forward sub-second timestamp so strict chronological ordering is maintained
      const baseMs = parseDateTimestamp(saleDate);
      const payDate = baseMs > 0 ? new Date(baseMs + 1000).toISOString() : saleDate;

      let payCode = 'Cash Paid';
      let payDesc = `Payment received for ${sale.id} (Full Cash Paid: ₨ ${amountReceived.toLocaleString()})`;
      
      if (isHalf) {
        payCode = 'Half Paid';
        payDesc = `Half / 50% payment received for ${sale.id} (Paid: ₨ ${amountReceived.toLocaleString()}, Balance Due: ₨ ${(sale.balanceDue || 0).toLocaleString()})`;
      } else if (isPartial) {
        payCode = 'Semi-Paid';
        payDesc = `Partial payment received for ${sale.id} (Paid: ₨ ${amountReceived.toLocaleString()}, Balance Due: ₨ ${(sale.balanceDue || 0).toLocaleString()})`;
      }

      rows.push({
        id: `sale-pay-${sale.id}`,
        sourceType: 'payment_received',
        date: payDate,
        entryCode: payCode,
        billNumber: sale.id,
        referenceId: sale.id,
        description: payDesc,
        debit: 0,
        credit: amountReceived,
        runningBalance: 0,
        paymentMethod: 'Cash',
        rawObject: sale,
      });
    }
  }

  // 4. Other Direct Customer Ledger Entries
  for (const entry of directEntries) {
    if (entry.type === 'opening_balance') continue; // Handled as opening balance row above

    let debit = 0;
    let credit = 0;

    if (entry.type === 'payment_received') {
      credit = Number(entry.amount ?? entry.credit ?? 0);
    } else if (entry.type === 'cash_refund') {
      debit = Number(entry.amount ?? entry.debit ?? 0);
    } else if (entry.type === 'adjustment') {
      debit = Number(entry.debit ?? (entry.amount > 0 ? entry.amount : 0));
      credit = Number(entry.credit ?? (entry.amount < 0 ? Math.abs(entry.amount) : 0));
    } else {
      debit = Number(entry.debit || 0);
      credit = Number(entry.credit || 0);
    }

    rows.push({
      id: entry.id,
      sourceType: entry.type,
      date: entry.date || entry.createdAt || new Date().toISOString(),
      entryCode: entry.entryCode || (entry.type === 'payment_received' ? 'Payment' : (entry.type === 'cash_refund' ? 'Refund' : 'Adjustment')),
      billNumber: entry.billNumber || entry.receiptNumber,
      referenceId: entry.referenceId,
      description: entry.description || (entry.type === 'payment_received' ? 'Payment received' : (entry.type === 'cash_refund' ? 'Cash refund paid' : 'Adjustment entry')),
      debit,
      credit,
      runningBalance: 0,
      paymentMethod: entry.paymentMethod,
      rawObject: entry,
    });
  }

  // 5. Sort chronologically by calendar date with deterministic accounting priority
  rows.sort((a, b) => {
    const dayA = extractCalendarDate(a.date);
    const dayB = extractCalendarDate(b.date);
    if (dayA !== dayB) {
      return dayA.localeCompare(dayB);
    }

    // Standard accounting priority on the same day:
    // 1) Opening Balance (Opening balance brought forward)
    // 2) Sales Invoice (Debit - customer is billed for goods)
    // 3) Payment Received (Credit - payment received against bills / on account)
    // 4) Cash Refund (Debit - money refunded back to customer)
    // 5) Adjustments
    const priorityOrder: Record<string, number> = {
      opening_balance: 1,
      sale: 2,
      payment_received: 3,
      cash_refund: 4,
      adjustment: 5,
    };
    const pA = priorityOrder[a.sourceType] || 10;
    const pB = priorityOrder[b.sourceType] || 10;
    if (pA !== pB) return pA - pB;

    // Sub-second timestamp tiebreaker
    const timeA = parseDateTimestamp(a.date);
    const timeB = parseDateTimestamp(b.date);
    if (timeA !== timeB) return timeA - timeB;

    if (a.id.startsWith('sale-inv') && b.id.startsWith('sale-pay')) return -1;
    if (a.id.startsWith('sale-pay') && b.id.startsWith('sale-inv')) return 1;

    return a.id.localeCompare(b.id);
  });

  // 6. Calculate cumulative running balance (Receivable = Debit - Credit)
  let running = 0;
  for (const row of rows) {
    running = running + (row.debit || 0) - (row.credit || 0);
    row.runningBalance = Math.round(running);
  }

  return rows;
}

/**
 * Records a new direct customer payment or cash refund
 */
export function recordCustomerPayment(
  entryData: Omit<CustomerLedgerEntry, 'id' | 'createdAt'>,
  currentLedger: CustomerLedgerEntry[]
): CustomerLedgerEntry[] {
  const newEntry: CustomerLedgerEntry = {
    ...entryData,
    id: `CLE-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  const updatedLedger = [newEntry, ...currentLedger];
  saveStoredCustomerLedger(updatedLedger);
  return updatedLedger;
}

export function updateCustomerPayment(
  updatedEntry: CustomerLedgerEntry,
  currentLedger: CustomerLedgerEntry[]
): CustomerLedgerEntry[] {
  const updatedLedger = currentLedger.map(e => e.id === updatedEntry.id ? { ...updatedEntry, updatedAt: new Date().toISOString() } : e);
  saveStoredCustomerLedger(updatedLedger);
  return updatedLedger;
}

export function deleteCustomerPayment(
  entryId: string,
  currentLedger: CustomerLedgerEntry[]
): CustomerLedgerEntry[] {
  const updatedLedger = currentLedger.filter(e => e.id !== entryId);
  saveStoredCustomerLedger(updatedLedger);
  return updatedLedger;
}

export function recordCustomerPaymentAndUpdateAll(
  entryData: Omit<CustomerLedgerEntry, 'id' | 'createdAt'>,
  currentLedger: CustomerLedgerEntry[],
  currentCustomers: Customer[]
): {
  updatedLedgerEntries: CustomerLedgerEntry[];
  updatedCustomers: Customer[];
} {
  const updatedLedger = recordCustomerPayment(entryData, currentLedger);
  return {
    updatedLedgerEntries: updatedLedger,
    updatedCustomers: currentCustomers,
  };
}

export function updateCustomerPaymentAndUpdateAll(
  entryId: string,
  entryData: Partial<CustomerLedgerEntry>,
  currentLedger: CustomerLedgerEntry[],
  currentCustomers: Customer[]
): {
  updatedLedgerEntries: CustomerLedgerEntry[];
  updatedCustomers: Customer[];
} {
  const existing = currentLedger.find(e => e.id === entryId);
  if (!existing) {
    return {
      updatedLedgerEntries: currentLedger,
      updatedCustomers: currentCustomers,
    };
  }
  const isPayment = (entryData.type || existing.type) === 'payment_received';
  const updatedEntry: CustomerLedgerEntry = {
    ...existing,
    ...entryData,
    id: entryId,
    entryCode: entryData.entryCode || existing.entryCode || (isPayment ? 'Payment' : 'Refund'),
    credit: isPayment ? Number(entryData.amount ?? existing.amount) : 0,
    debit: !isPayment ? Number(entryData.amount ?? existing.amount) : 0,
    updatedAt: new Date().toISOString(),
  };
  const updatedLedger = updateCustomerPayment(updatedEntry, currentLedger);
  return {
    updatedLedgerEntries: updatedLedger,
    updatedCustomers: currentCustomers,
  };
}

export function deleteCustomerPaymentAndUpdateAll(
  entryId: string,
  currentLedger: CustomerLedgerEntry[],
  currentCustomers: Customer[]
): {
  updatedLedgerEntries: CustomerLedgerEntry[];
  updatedCustomers: Customer[];
} {
  const updatedLedger = deleteCustomerPayment(entryId, currentLedger);
  return {
    updatedLedgerEntries: updatedLedger,
    updatedCustomers: currentCustomers,
  };
}

/**
 * Saves or updates a machine for a company, AND automatically synchronizes:
 * 1. Customer's Item Number into inventory product's `crossReferences` field.
 * 2. Machine Name into inventory product's `machineNames` field.
 */
export function saveCompanyMachineAndSyncInventory(
  customerId: string,
  machine: CompanyMachine,
  currentCustomers: Customer[],
  currentProducts: Product[]
): {
  updatedCustomers: Customer[];
  updatedProducts: Product[];
} {
  // 1. Update machine inside customer
  const updatedCustomers = currentCustomers.map(cust => {
    if (cust.id !== customerId) return cust;

    const existingMachines = cust.machines || [];
    const machineIndex = existingMachines.findIndex(m => m.id === machine.id);

    let newMachines: CompanyMachine[];
    if (machineIndex >= 0) {
      newMachines = existingMachines.map(m => m.id === machine.id ? { ...machine, updatedAt: new Date().toISOString() } : m);
    } else {
      newMachines = [...existingMachines, { ...machine, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    }

    return {
      ...cust,
      machines: newMachines,
      updatedAt: new Date().toISOString(),
    };
  });

  // 2. Synchronize inventory product crossReferences & machineNames
  const updatedProducts = currentProducts.map(prod => {
    // Find all demand items in this machine matching this product
    const matchingDemandItems = machine.items.filter(item => item.productId === prod.id);
    if (matchingDemandItems.length === 0) return prod;

    let modified = false;
    let currentCrossrefs = (prod.crossReferences || '')
      .split('\n')
      .map(r => r.trim())
      .filter(Boolean);

    let currentMachines = (prod.machineNames || '')
      .split('\n')
      .map(m => m.trim())
      .filter(Boolean);

    // Sync Machine Name if present
    if (machine.machineName && machine.machineName.trim() !== '') {
      const normalizedMachineName = machine.machineName.trim();
      const alreadyHasMachine = currentMachines.some(m => m.toLowerCase() === normalizedMachineName.toLowerCase());
      if (!alreadyHasMachine) {
        currentMachines.push(normalizedMachineName);
        modified = true;
      }
    }

    // Sync Customer Item Numbers
    for (const dItem of matchingDemandItems) {
      if (dItem.customerItemNumber && dItem.customerItemNumber.trim() !== '') {
        const itemCode = dItem.customerItemNumber.trim();
        const alreadyHasCode = currentCrossrefs.some(c => c.toLowerCase() === itemCode.toLowerCase());
        if (!alreadyHasCode) {
          currentCrossrefs.push(itemCode);
          modified = true;
        }
      }
    }

    if (!modified) return prod;

    return {
      ...prod,
      crossReferences: currentCrossrefs.join('\n'),
      machineNames: currentMachines.join('\n'),
      updatedAt: new Date().toISOString(),
    };
  });

  saveStoredCustomers(updatedCustomers);
  saveStoredProducts(updatedProducts);

  return {
    updatedCustomers,
    updatedProducts,
  };
}

/**
 * Deletes a machine from a company
 */
export function deleteCompanyMachine(
  customerId: string,
  machineId: string,
  currentCustomers: Customer[]
): Customer[] {
  const updatedCustomers = currentCustomers.map(cust => {
    if (cust.id !== customerId) return cust;
    return {
      ...cust,
      machines: (cust.machines || []).filter(m => m.id !== machineId),
      updatedAt: new Date().toISOString(),
    };
  });

  saveStoredCustomers(updatedCustomers);
  return updatedCustomers;
}

/**
 * Saves a new or updated Customer / Company
 */
export function saveCustomer(
  customerData: Partial<Customer>,
  currentCustomers: Customer[]
): Customer[] {
  let updatedCustomers: Customer[];

  if (customerData.id) {
    updatedCustomers = currentCustomers.map(c => 
      c.id === customerData.id 
        ? { ...c, ...customerData, updatedAt: new Date().toISOString() } as Customer
        : c
    );
  } else {
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      type: customerData.type || 'customer',
      name: customerData.name?.trim() || 'New Customer',
      contactPerson: customerData.contactPerson?.trim(),
      phone: customerData.phone?.trim(),
      secondaryPhone: customerData.secondaryPhone?.trim(),
      email: customerData.email?.trim(),
      city: customerData.city?.trim(),
      address: customerData.address?.trim(),
      ntn: customerData.ntn?.trim(),
      strn: customerData.strn?.trim(),
      openingBalance: Number(customerData.openingBalance) || 0,
      notes: customerData.notes?.trim(),
      totalPurchases: 0,
      machines: customerData.machines || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updatedCustomers = [newCustomer, ...currentCustomers];
  }

  saveStoredCustomers(updatedCustomers);
  return updatedCustomers;
}

/**
 * Deletes a customer
 */
export function deleteCustomer(
  customerId: string,
  currentCustomers: Customer[],
  currentSales: Sale[],
  currentLedger: CustomerLedgerEntry[]
): {
  updatedCustomers: Customer[];
  updatedLedger: CustomerLedgerEntry[];
} {
  const updatedCustomers = currentCustomers.filter(c => c.id !== customerId);
  const updatedLedger = currentLedger.filter(e => e.customerId !== customerId);

  saveStoredCustomers(updatedCustomers);
  saveStoredCustomerLedger(updatedLedger);

  return {
    updatedCustomers,
    updatedLedger,
  };
}


export const INITIAL_VENDORS: Vendor[] = [];

export const INITIAL_PURCHASES: Purchase[] = [];

export const INITIAL_LEDGER_ENTRIES: VendorLedgerEntry[] = [];

// ----------------------------------------------------
// VENDOR GETTERS & SETTERS
// ----------------------------------------------------

export function getStoredVendors(): Vendor[] {
  try {
    const raw = localStorage.getItem(VENDORS_KEY);
    if (!raw) {
      saveStoredVendors(INITIAL_VENDORS);
      return INITIAL_VENDORS;
    }
    return JSON.parse(raw);
  } catch (err) {
    return INITIAL_VENDORS;
  }
}

export function saveStoredVendors(vendors: Vendor[]): void {
  try {
    localStorage.setItem(VENDORS_KEY, JSON.stringify(vendors));
  } catch (err) {
    console.error('Failed to save vendors', err);
  }
}

export function getStoredPurchases(): Purchase[] {
  try {
    const raw = localStorage.getItem(PURCHASES_KEY);
    const returnsRaw = localStorage.getItem(VENDOR_RETURNS_KEY);
    const returns: VendorReturn[] = returnsRaw ? JSON.parse(returnsRaw) : INITIAL_VENDOR_RETURNS;
    const poRaw = localStorage.getItem(PURCHASE_ORDERS_KEY);
    const purchaseOrders: PurchaseOrder[] = poRaw ? JSON.parse(poRaw) : getInitialPurchaseOrdersSeed();

    let purchases: Purchase[] = raw ? JSON.parse(raw) : INITIAL_PURCHASES;
    purchases = syncPurchasesWithReturns(purchases, returns);
    purchases = syncPurchasesWithCompletedPOs(purchases, purchaseOrders);
    
    saveStoredPurchases(purchases);
    return purchases;
  } catch (err) {
    return INITIAL_PURCHASES;
  }
}

export function saveStoredPurchases(purchases: Purchase[]): void {
  try {
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
  } catch (err) {
    console.error('Failed to save purchases', err);
  }
}

export function getStoredVendorLedger(): VendorLedgerEntry[] {
  try {
    const raw = localStorage.getItem(VENDOR_LEDGER_KEY);
    if (!raw) {
      saveStoredVendorLedger(INITIAL_LEDGER_ENTRIES);
      return INITIAL_LEDGER_ENTRIES;
    }
    return JSON.parse(raw);
  } catch (err) {
    return INITIAL_LEDGER_ENTRIES;
  }
}

export const getStoredVendorLedgerEntries = getStoredVendorLedger;

export function saveStoredVendorLedger(entries: VendorLedgerEntry[]): void {
  try {
    localStorage.setItem(VENDOR_LEDGER_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error('Failed to save vendor ledger', err);
  }
}

export const saveStoredVendorLedgerEntries = saveStoredVendorLedger;

/**
 * Calculates current net balance that we owe to a vendor in PKR:
 * Balance We Owe =
 *   Opening Balance (Credit if positive, Debit if negative)
 * + Total Purchases (Credit - increases what we owe)
 * - Payments Made / Cash Sent to Vendor (Debit - decreases what we owe)
 * + Cash Received / Refunds from Vendor (Credit - increases what we owe or reduces overpayment)
 * - Sales made to Vendor from us (Debit - decreases what we owe / offsets purchases)
 */
export function calculateVendorBalance(
  vendorId: string,
  vendors: Vendor[],
  purchases: Purchase[],
  sales: Sale[],
  ledgerEntries: VendorLedgerEntry[],
  vendorName?: string
): number {
  const vendor = vendors.find(v => 
    v.id === vendorId || 
    (vendorName && v.businessName && v.businessName.trim().toLowerCase() === vendorName.trim().toLowerCase())
  );
  const vNameLower = (vendor?.businessName || vendorName)?.trim().toLowerCase();
  const vId = vendor?.id || vendorId;

  if (!vId && !vNameLower) return 0;

  // Check if an explicit opening balance entry exists in ledgerEntries
  const vendorEntries = ledgerEntries.filter(e => 
    (vId && e.vendorId === vId) || 
    (vNameLower && e.vendorName && e.vendorName.trim().toLowerCase() === vNameLower)
  );

  let openBalFromLedger: number | null = null;
  let ledgerDebits = 0;
  let ledgerCredits = 0;

  for (const entry of vendorEntries) {
    if (entry.type === 'opening_balance') {
      const c = Number(entry.credit) || (Number(entry.amount) > 0 ? Number(entry.amount) : 0);
      const d = Number(entry.debit) || (Number(entry.amount) < 0 ? Math.abs(Number(entry.amount)) : 0);
      openBalFromLedger = c - d;
    } else if (entry.type === 'cash_sent') {
      ledgerDebits += Number(entry.amount ?? entry.debit ?? 0);
    } else if (entry.type === 'cash_received') {
      ledgerCredits += Number(entry.amount ?? entry.credit ?? 0);
    } else if (entry.type === 'adjustment') {
      ledgerDebits += Number(entry.debit ?? (entry.amount < 0 ? Math.abs(entry.amount) : 0));
      ledgerCredits += Number(entry.credit ?? (entry.amount > 0 ? entry.amount : 0));
    } else if (entry.type === 'purchase') {
      // If purchase is already in purchases array, skip to avoid double counting
      const alreadyInPurchases = purchases.some(p => 
        p.id === entry.id || 
        p.id === entry.referenceId || 
        (entry.referenceId && (p.poId === entry.referenceId || p.id === `PUR-${entry.referenceId.replace(/^PO-/, '')}`)) ||
        (entry.billNumber && p.billNumber && p.billNumber.trim().toLowerCase() === entry.billNumber.trim().toLowerCase())
      );
      if (!alreadyInPurchases) {
        ledgerCredits += Number(entry.credit ?? entry.amount ?? 0);
        ledgerDebits += Number(entry.debit ?? 0);
      }
    }
  }

  const effectiveOpeningBalance = openBalFromLedger !== null ? openBalFromLedger : (Number(vendor?.openingBalance) || 0);
  let balance = effectiveOpeningBalance;

  // 1. Add purchases from vendor (Credit - increases what we owe)
  const vendorPurchases = purchases.filter(p => 
    (vId && p.vendorId === vId) || 
    (vNameLower && p.vendorName && p.vendorName.trim().toLowerCase() === vNameLower)
  );
  for (const pur of vendorPurchases) {
    balance += (Number(pur.totalAmount) || 0);
  }

  // 2. Add net ledger credits - debits
  balance += (ledgerCredits - ledgerDebits);

  // 3. Subtract sales made to this vendor from us (sales offset what we owe)
  const vendorSales = sales.filter(s => 
    (vId && (s.vendorId === vId || (s.isVendorSale && s.customerId === vId))) || 
    (vNameLower && s.vendorName && s.vendorName.trim().toLowerCase() === vNameLower)
  );
  for (const sale of vendorSales) {
    balance -= (Number(sale.totalAmount) || 0);
  }

  return Math.round(balance);
}

/**
 * Unified Chronological Ledger Entry Item with Computed Running Balance
 */
export interface ComputedLedgerRow {
  id: string;
  sourceType: 'opening_balance' | 'cash_sent' | 'cash_received' | 'purchase' | 'sale' | 'adjustment';
  date: string;
  entryCode: string; // e.g. "Cash", "SF-9842", "INV-1001"
  billNumber?: string;
  referenceId?: string;
  description: string;
  debit: number; // Reduces balance we owe (Cash Sent, Sale to Vendor)
  credit: number; // Increases balance we owe (Purchases, Cash Received)
  runningBalance: number; // Balance we owe after this transaction
  paymentMethod?: string;
  rawObject?: VendorLedgerEntry | Purchase | Sale;
}

/**
 * Generates the complete, sorted statement ledger for a vendor with running balances.
 * Uses calendar-date sorting and strict accounting priority (Purchase bill before Cash Payment on the same date).
 */
export function getVendorFullLedger(
  vendorId: string,
  vendors: Vendor[],
  purchases: Purchase[],
  sales: Sale[],
  ledgerEntries: VendorLedgerEntry[]
): ComputedLedgerRow[] {
  const vendor = vendors.find(v => v.id === vendorId || (v.businessName && v.businessName.toLowerCase() === vendorId.toLowerCase()));
  if (!vendor) return [];
  const vNameLower = vendor.businessName?.trim().toLowerCase();

  const rawRows: {
    id: string;
    sourceType: 'opening_balance' | 'cash_sent' | 'cash_received' | 'purchase' | 'sale' | 'adjustment';
    date: string;
    entryCode: string;
    billNumber?: string;
    referenceId?: string;
    description: string;
    debit: number;
    credit: number;
    paymentMethod?: string;
    rawObject?: any;
  }[] = [];

  const vEntries = ledgerEntries.filter(e => 
    e.vendorId === vendor.id || 
    (vNameLower && e.vendorName && e.vendorName.trim().toLowerCase() === vNameLower)
  );

  // 1. Opening Balance row
  const openEntry = vEntries.find(e => e.type === 'opening_balance');
  let openDebit = 0;
  let openCredit = 0;
  let openDate = vendor.createdAt || new Date(Date.now() - 365 * 86400000).toISOString();

  if (openEntry) {
    openDebit = Number(openEntry.debit) || (Number(openEntry.amount) < 0 ? Math.abs(Number(openEntry.amount)) : 0);
    openCredit = Number(openEntry.credit) || (Number(openEntry.amount) > 0 ? Number(openEntry.amount) : 0);
    openDate = openEntry.date || openEntry.createdAt || openDate;
  } else {
    const rawOpening = Number(vendor.openingBalance) || 0;
    if (rawOpening > 0) openCredit = rawOpening;
    else if (rawOpening < 0) openDebit = Math.abs(rawOpening);
  }

  if (openDebit > 0 || openCredit > 0 || (vendor.openingBalance && vendor.openingBalance !== 0)) {
    rawRows.push({
      id: openEntry?.id || `open-${vendor.id}`,
      sourceType: 'opening_balance',
      date: openDate,
      entryCode: openEntry?.entryCode || 'Opening',
      description: openEntry?.description || 'Opening Balance (Initial Amount We Owe)',
      debit: openDebit,
      credit: openCredit,
      rawObject: openEntry || vendor,
    });
  }

  // 2. Purchases from Vendor (Increase what we owe -> Credit)
  const vPurchases = purchases.filter(p => 
    p.vendorId === vendor.id || 
    (vNameLower && p.vendorName && p.vendorName.trim().toLowerCase() === vNameLower)
  );
  for (const pur of vPurchases) {
    const itemsSummary = pur.items?.map(it => `${it.productName} (${it.quantity})`).join(', ') || '';
    rawRows.push({
      id: pur.id,
      sourceType: 'purchase',
      date: pur.date || pur.createdAt || new Date().toISOString(),
      entryCode: pur.billNumber ? `Bill #${pur.billNumber}` : pur.id,
      billNumber: pur.billNumber || pur.id,
      referenceId: pur.id,
      description: `Purchase Bill #${pur.billNumber || pur.id} • ${pur.items?.length || 0} items (${itemsSummary})${pur.notes ? ` • ${pur.notes}` : ''}`,
      debit: 0,
      credit: Number(pur.totalAmount) || 0,
      rawObject: pur,
    });
  }

  // 3. Cash Entries, Adjustments & Purchase Entries (including pending 0-balance PO entries)
  const vEntriesWithoutOpen = vEntries.filter(e => e.type !== 'opening_balance');
  for (const entry of vEntriesWithoutOpen) {
    if (entry.type === 'purchase') {
      // Check if this purchase was already added from the purchases array in step 2
      const alreadyInRawRows = rawRows.some(r => 
        r.id === entry.id || 
        r.referenceId === entry.referenceId || 
        r.referenceId === entry.id ||
        r.id === entry.referenceId ||
        (entry.referenceId && r.rawObject && ((r.rawObject as any).poId === entry.referenceId || r.rawObject.id === entry.referenceId)) ||
        (entry.billNumber && r.billNumber && r.billNumber.trim().toLowerCase() === entry.billNumber.trim().toLowerCase())
      );
      if (alreadyInRawRows) {
        continue;
      }
    }

    let debit = 0;
    let credit = 0;
    if (entry.type === 'cash_sent') {
      debit = Number(entry.amount ?? entry.debit ?? 0);
    } else if (entry.type === 'cash_received') {
      credit = Number(entry.amount ?? entry.credit ?? 0);
    } else if (entry.type === 'adjustment') {
      debit = Number(entry.debit ?? (entry.amount < 0 ? Math.abs(entry.amount) : 0));
      credit = Number(entry.credit ?? (entry.amount > 0 ? entry.amount : 0));
    } else if (entry.type === 'purchase') {
      debit = Number(entry.debit || 0);
      credit = Number(entry.credit ?? entry.amount ?? 0);
    } else {
      debit = Number(entry.debit || 0);
      credit = Number(entry.credit || 0);
    }

    rawRows.push({
      id: entry.id,
      sourceType: entry.type,
      date: entry.date || entry.createdAt || new Date().toISOString(),
      entryCode: entry.entryCode || (entry.type === 'cash_sent' ? 'Cash Sent' : (entry.type === 'cash_received' ? 'Cash Recv' : (entry.type === 'purchase' ? (credit === 0 ? 'PO (Pending)' : 'Purchase') : 'Adjustment'))),
      billNumber: entry.billNumber,
      referenceId: entry.referenceId || entry.id,
      description: entry.description || (entry.type === 'cash_sent' ? 'Cash payment sent' : (entry.type === 'cash_received' ? 'Cash payment received' : (entry.type === 'purchase' ? 'Purchase Order Cargo Received' : 'Balance adjustment'))),
      debit,
      credit,
      paymentMethod: entry.paymentMethod,
      rawObject: entry,
    });
  }

  // 4. Sales to this Vendor from Us (Reduces what we owe -> Debit)
  const vSales = sales.filter(s => 
    s.vendorId === vendor.id || 
    (s.isVendorSale && s.customerId === vendor.id) || 
    (vNameLower && s.vendorName && s.vendorName.trim().toLowerCase() === vNameLower)
  );
  for (const sale of vSales) {
    const itemsSummary = sale.items?.map(it => `${it.productName} (${it.quantity})`).join(', ') || '';
    rawRows.push({
      id: sale.id,
      sourceType: 'sale',
      date: sale.date || sale.createdAt || new Date().toISOString(),
      entryCode: sale.id,
      billNumber: sale.id,
      referenceId: sale.id,
      description: `Sale / Invoice ${sale.id} to vendor • ${sale.items?.length || 0} items (${itemsSummary})${sale.notes ? ` • ${sale.notes}` : ''}`,
      debit: Number(sale.totalAmount) || 0,
      credit: 0,
      rawObject: sale,
    });
  }

  // Sort chronologically (oldest to newest) with deterministic accounting priority
  rawRows.sort((a, b) => {
    const dayA = extractCalendarDate(a.date);
    const dayB = extractCalendarDate(b.date);
    if (dayA !== dayB) {
      return dayA.localeCompare(dayB);
    }

    // Same calendar day priority for Vendor Ledger:
    // 1. Opening Balance (Initial opening amount we owe)
    // 2. Purchase Bill (Credit - increases amount we owe)
    // 3. Cash Sent (Debit - payments sent settling bills)
    // 4. Sale to Vendor (Debit - sales offsetting purchases)
    // 5. Cash Received (Credit - volume rebates / refunds from vendor)
    // 6. Adjustments
    const priority: Record<string, number> = {
      opening_balance: 1,
      purchase: 2,
      cash_sent: 3,
      sale: 4,
      cash_received: 5,
      adjustment: 6,
    };
    const pA = priority[a.sourceType] || 10;
    const pB = priority[b.sourceType] || 10;
    if (pA !== pB) return pA - pB;

    const timeA = parseDateTimestamp(a.date);
    const timeB = parseDateTimestamp(b.date);
    if (timeA !== timeB) return timeA - timeB;

    return a.id.localeCompare(b.id);
  });

  let running = 0;
  const result: ComputedLedgerRow[] = rawRows.map(row => {
    running = running + (row.credit || 0) - (row.debit || 0);
    return {
      ...row,
      runningBalance: Math.round(running),
    };
  });

  return result;
}

/**
 * Updates an edited sale across ALL tabs in the app:
 * 1. Adjusts Inventory Stock quantities (reverts old quantities and subtracts new ones)
 * 2. Creates stock adjustment logs
 * 3. Updates customer totalPurchases
 * 4. Updates sales list
 * 5. Synchronizes vendor ledger if sale is linked to a vendor
 */
export function updateSaleAndUpdateAll(
  editedSale: Sale,
  originalSale: Sale,
  currentProducts: Product[],
  currentSales: Sale[],
  currentCustomers: Customer[],
  currentVendors: Vendor[],
  currentLedger: VendorLedgerEntry[]
): {
  updatedProducts: Product[];
  updatedSales: Sale[];
  updatedCustomers: Customer[];
  updatedVendors: Vendor[];
  updatedLedger: VendorLedgerEntry[];
  updatedLedgerEntries: VendorLedgerEntry[];
} {
  // 1. Calculate stock difference for each affected product
  const updatedProducts = currentProducts.map(prod => {
    const oldItem = originalSale.items.find(it => it.productId === prod.id);
    const newItem = editedSale.items.find(it => it.productId === prod.id);

    const oldQty = oldItem ? (oldItem.quantity || 1) : 0;
    const newQty = newItem ? (newItem.quantity || 1) : 0;
    const stockDelta = oldQty - newQty; // Positive means stock returned, negative means more stock sold

    if (stockDelta === 0 && !newItem) return prod;

    const currentStock = prod.stockQuantity || 0;
    const newStock = Math.max(0, currentStock + stockDelta);

    if (stockDelta !== 0) {
      saveStockLog({
        id: `log-${Date.now()}-${prod.id}`,
        productId: prod.id,
        productName: prod.name,
        internalId: prod.internalId,
        brandName: prod.brandName,
        typeName: prod.typeName,
        unit: prod.unit,
        change: stockDelta,
        previousStock: currentStock,
        newStock,
        reason: 'Sale',
        movementType: 'sale',
        referenceId: editedSale.id,
        referenceNumber: editedSale.id,
        entityName: editedSale.customerName || 'Walk-in Customer',
        unitRate: Number(newItem?.unitPrice || oldItem?.unitPrice || 0),
        totalMovementValue: Math.abs(stockDelta) * Number(newItem?.unitPrice || oldItem?.unitPrice || 0),
        locationName: prod.locationName,
        cabinNumber: prod.cabinNumber,
        timestamp: new Date().toISOString(),
        notes: `Edited Sale ${editedSale.id} (Old Qty: ${oldQty} -> New Qty: ${newQty})`,
      });
    }

    return {
      ...prod,
      stockQuantity: newStock,
      updatedAt: new Date().toISOString(),
    };
  });

  // 2. Update Sales List
  const updatedSales = currentSales.map(s => (s.id === editedSale.id ? { ...editedSale, updatedAt: new Date().toISOString() } : s));

  // 3. Update Customer records
  const amountDelta = (editedSale.totalAmount || 0) - (originalSale.totalAmount || 0);
  const updatedCustomers = currentCustomers.map(cust => {
    const isTarget = (editedSale.customerId && cust.id === editedSale.customerId) ||
      (editedSale.customerName && cust.name.toLowerCase() === editedSale.customerName.toLowerCase());
    if (isTarget) {
      return {
        ...cust,
        phone: editedSale.customerPhone || cust.phone,
        totalPurchases: Math.max(0, (cust.totalPurchases || 0) + amountDelta),
        updatedAt: new Date().toISOString(),
      };
    }
    return cust;
  });

  // 4. Update or sync Vendor Ledger if linked
  let updatedLedger = [...currentLedger];
  if (editedSale.vendorId || originalSale.vendorId) {
    const targetVendorId = editedSale.vendorId || originalSale.vendorId;
    // Find existing ledger entry for this sale if any
    const existingEntryIndex = updatedLedger.findIndex(e => e.referenceId === editedSale.id || (e.billNumber === editedSale.id && e.vendorId === targetVendorId));
    if (existingEntryIndex >= 0) {
      if (editedSale.vendorId) {
        updatedLedger[existingEntryIndex] = {
          ...updatedLedger[existingEntryIndex],
          vendorId: editedSale.vendorId,
          date: editedSale.date || editedSale.createdAt,
          amount: editedSale.totalAmount,
          debit: editedSale.totalAmount,
          description: `Sale / Invoice ${editedSale.id} to vendor (Updated)`,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // Vendor unlinked from sale
        updatedLedger = updatedLedger.filter((_, idx) => idx !== existingEntryIndex);
      }
    }
  }

  // Persist all changes
  saveStoredProducts(updatedProducts);
  saveStoredSales(updatedSales);
  saveStoredCustomers(updatedCustomers);
  saveStoredVendors(currentVendors);
  saveStoredVendorLedger(updatedLedger);

  return {
    updatedProducts,
    updatedSales,
    updatedCustomers,
    updatedVendors: currentVendors,
    updatedLedger,
    updatedLedgerEntries: updatedLedger,
  };
}

/**
 * Deletes a sale and cleanly restores all inventory stock levels & ledger records
 */
export function deleteSaleAndUpdateAll(
  saleId: string,
  currentProducts: Product[],
  currentSales: Sale[],
  currentCustomers: Customer[],
  currentVendors: Vendor[],
  currentLedger: VendorLedgerEntry[]
): {
  updatedProducts: Product[];
  updatedSales: Sale[];
  updatedCustomers: Customer[];
  updatedVendors: Vendor[];
  updatedLedger: VendorLedgerEntry[];
  updatedLedgerEntries: VendorLedgerEntry[];
} {
  const saleToDelete = currentSales.find(s => s.id === saleId);
  if (!saleToDelete) {
    return {
      updatedProducts: currentProducts,
      updatedSales: currentSales,
      updatedCustomers: currentCustomers,
      updatedVendors: currentVendors,
      updatedLedger: currentLedger,
      updatedLedgerEntries: currentLedger,
    };
  }

  // 1. Restore product stock
  const updatedProducts = currentProducts.map(prod => {
    const saleItem = saleToDelete.items.find(it => it.productId === prod.id);
    if (!saleItem) return prod;

    const returnQty = saleItem.quantity || 1;
    const currentStock = prod.stockQuantity || 0;
    const newStock = currentStock + returnQty;

    saveStockLog({
      id: `log-${Date.now()}-${prod.id}`,
      productId: prod.id,
      productName: prod.name,
      internalId: prod.internalId,
      brandName: prod.brandName,
      typeName: prod.typeName,
      unit: prod.unit,
      change: returnQty,
      previousStock: currentStock,
      newStock,
      reason: 'Adjustment',
      movementType: 'delete_rollback',
      referenceId: saleToDelete.id,
      referenceNumber: saleToDelete.id,
      entityName: saleToDelete.customerName || 'Customer',
      unitRate: Number(saleItem.unitPrice) || 0,
      totalMovementValue: Math.round(returnQty * (Number(saleItem.unitPrice) || 0)),
      locationName: prod.locationName,
      cabinNumber: prod.cabinNumber,
      timestamp: new Date().toISOString(),
      notes: `Restored stock from deleted sale ${saleToDelete.id} (Qty: +${returnQty})`,
    });

    let updatedBatches = [...(prod.costBatches || [])];
    if (saleItem.batchesUsed && saleItem.batchesUsed.length > 0) {
      for (const used of saleItem.batchesUsed) {
        updatedBatches = updatedBatches.map(b => {
          if (b.id === used.batchId) {
            return {
              ...b,
              remainingQuantity: (b.remainingQuantity || 0) + used.quantity,
            };
          }
          return b;
        });
      }
    } else if (updatedBatches.length > 0) {
      updatedBatches = updatedBatches.map((b, idx) => {
        if (idx === 0) {
          return {
            ...b,
            remainingQuantity: (b.remainingQuantity || 0) + returnQty,
          };
        }
        return b;
      });
    }

    const activeFifoCost = getActiveFifoCost({
      costBatches: updatedBatches,
      costPrice: prod.costPrice,
    });

    const pricingSettings = getStoredPricingSettings();
    const nextSellingPrices = activeFifoCost > 0
      ? generateProductSellingPrices(activeFifoCost, pricingSettings, prod.sellingPrices)
      : prod.sellingPrices;

    return {
      ...prod,
      stockQuantity: newStock,
      costPrice: activeFifoCost > 0 ? activeFifoCost : prod.costPrice,
      sellingPrices: nextSellingPrices,
      costBatches: updatedBatches,
      updatedAt: new Date().toISOString(),
    };
  });

  // 2. Remove sale from sales list
  const updatedSales = currentSales.filter(s => s.id !== saleId);

  // 3. Update customer total purchases
  const updatedCustomers = currentCustomers.map(cust => {
    const isTarget = (saleToDelete.customerId && cust.id === saleToDelete.customerId) ||
      (saleToDelete.customerName && cust.name.toLowerCase() === saleToDelete.customerName.toLowerCase());
    if (isTarget) {
      return {
        ...cust,
        totalPurchases: Math.max(0, (cust.totalPurchases || 0) - saleToDelete.totalAmount),
        updatedAt: new Date().toISOString(),
      };
    }
    return cust;
  });

  // 4. Remove any ledger entries linked to this sale
  const updatedLedger = currentLedger.filter(e => e.referenceId !== saleId && e.billNumber !== saleId);

  // Persist all
  saveStoredProducts(updatedProducts);
  saveStoredSales(updatedSales);
  saveStoredCustomers(updatedCustomers);
  saveStoredVendors(currentVendors);
  saveStoredVendorLedger(updatedLedger);

  return {
    updatedProducts,
    updatedSales,
    updatedCustomers,
    updatedVendors: currentVendors,
    updatedLedger,
    updatedLedgerEntries: updatedLedger,
  };
}

/**
 * Records a new Cash Entry (Cash Sent / Cash Received) into Vendor Ledger
 */
export function recordCashEntry(
  entry: Omit<VendorLedgerEntry, 'id' | 'createdAt'>,
  currentLedger: VendorLedgerEntry[]
): VendorLedgerEntry[] {
  const isSent = entry.type === 'cash_sent';
  const prefix = isSent ? 'CSH' : 'RCV';
  const nextNum = 1000 + currentLedger.length + 1;
  const newId = `${prefix}-${nextNum}`;

  const newEntry: VendorLedgerEntry = {
    ...entry,
    id: newId,
    entryCode: entry.entryCode || (isSent ? 'Cash' : 'Cash Recv'),
    debit: isSent ? entry.amount : 0,
    credit: !isSent ? entry.amount : 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updatedLedger = [newEntry, ...currentLedger];
  saveStoredVendorLedger(updatedLedger);
  return updatedLedger;
}

/**
 * Updates an existing Cash Entry in Vendor Ledger
 */
export function updateCashEntry(
  editedEntry: VendorLedgerEntry,
  currentLedger: VendorLedgerEntry[]
): VendorLedgerEntry[] {
  const isSent = editedEntry.type === 'cash_sent';
  const updated = {
    ...editedEntry,
    entryCode: editedEntry.entryCode || (isSent ? 'Cash' : 'Cash Recv'),
    debit: isSent ? editedEntry.amount : (editedEntry.debit || 0),
    credit: !isSent ? editedEntry.amount : (editedEntry.credit || 0),
    updatedAt: new Date().toISOString(),
  };

  const updatedLedger = currentLedger.map(e => (e.id === editedEntry.id ? updated : e));
  saveStoredVendorLedger(updatedLedger);
  return updatedLedger;
}

/**
 * Deletes a Cash Entry from Vendor Ledger
 */
export function deleteCashEntry(
  entryId: string,
  currentLedger: VendorLedgerEntry[]
): VendorLedgerEntry[] {
  const updatedLedger = currentLedger.filter(e => e.id !== entryId);
  saveStoredVendorLedger(updatedLedger);
  return updatedLedger;
}

export function recordCashEntryAndUpdateAll(
  entryData: Omit<VendorLedgerEntry, 'id' | 'createdAt'>,
  currentLedger: VendorLedgerEntry[],
  currentVendors: Vendor[]
): {
  updatedLedgerEntries: VendorLedgerEntry[];
  updatedVendors: Vendor[];
} {
  const updatedLedger = recordCashEntry(entryData, currentLedger);
  return {
    updatedLedgerEntries: updatedLedger,
    updatedVendors: currentVendors,
  };
}

export function updateCashEntryAndUpdateAll(
  entryId: string,
  entryData: Partial<VendorLedgerEntry>,
  currentLedger: VendorLedgerEntry[],
  currentVendors: Vendor[]
): {
  updatedLedgerEntries: VendorLedgerEntry[];
  updatedVendors: Vendor[];
} {
  const existing = currentLedger.find(e => e.id === entryId);
  if (!existing) {
    return {
      updatedLedgerEntries: currentLedger,
      updatedVendors: currentVendors,
    };
  }
  const isSent = (entryData.type || existing.type) === 'cash_sent';
  const updatedEntry: VendorLedgerEntry = {
    ...existing,
    ...entryData,
    id: entryId,
    entryCode: entryData.entryCode || existing.entryCode || (isSent ? 'Cash' : 'Cash Recv'),
    debit: isSent ? Number(entryData.amount ?? existing.amount) : 0,
    credit: !isSent ? Number(entryData.amount ?? existing.amount) : 0,
    updatedAt: new Date().toISOString(),
  };
  const updatedLedger = updateCashEntry(updatedEntry, currentLedger);
  return {
    updatedLedgerEntries: updatedLedger,
    updatedVendors: currentVendors,
  };
}

export function deleteCashEntryAndUpdateAll(
  entryId: string,
  currentLedger: VendorLedgerEntry[],
  currentVendors: Vendor[]
): {
  updatedLedgerEntries: VendorLedgerEntry[];
  updatedVendors: Vendor[];
} {
  const updatedLedger = deleteCashEntry(entryId, currentLedger);
  return {
    updatedLedgerEntries: updatedLedger,
    updatedVendors: currentVendors,
  };
}

/**
 * Saves a new or updated vendor
 */
export function saveOrUpdateVendor(
  vendor: Vendor,
  currentVendors: Vendor[]
): Vendor[] {
  const exists = currentVendors.some(v => v.id === vendor.id);
  let updated: Vendor[];
  if (exists) {
    updated = currentVendors.map(v => (v.id === vendor.id ? { ...vendor, updatedAt: new Date().toISOString() } : v));
  } else {
    updated = [vendor, ...currentVendors];
  }
  saveStoredVendors(updated);
  return updated;
}

/**
 * Deletes a vendor
 */
export function deleteVendor(
  vendorId: string,
  currentVendors: Vendor[]
): Vendor[] {
  const updated = currentVendors.filter(v => v.id !== vendorId);
  saveStoredVendors(updated);
  return updated;
}

/**
 * Links / Unlinks products to a vendor (Bi-directional update)
 */
export function linkProductsToVendor(
  vendorId: string,
  productIds: string[],
  currentVendors: Vendor[],
  currentProducts: Product[]
): {
  updatedVendors: Vendor[];
  updatedProducts: Product[];
} {
  const vendor = currentVendors.find(v => v.id === vendorId);
  const vendorName = vendor ? vendor.businessName : '';

  // 1. Update Vendor
  const updatedVendors = currentVendors.map(v => {
    if (v.id === vendorId) {
      return {
        ...v,
        linkedProductIds: productIds,
        updatedAt: new Date().toISOString(),
      };
    }
    return v;
  });

  // 2. Update Products
  const updatedProducts = currentProducts.map(p => {
    const shouldLink = productIds.includes(p.id);
    if (shouldLink) {
      return {
        ...p,
        vendorId,
        vendorName,
        updatedAt: new Date().toISOString(),
      };
    } else if (p.vendorId === vendorId) {
      // Unlink if was previously linked to this vendor
      return {
        ...p,
        vendorId: undefined,
        vendorName: undefined,
        updatedAt: new Date().toISOString(),
      };
    }
    return p;
  });

  saveStoredVendors(updatedVendors);
  saveStoredProducts(updatedProducts);

  return {
    updatedVendors,
    updatedProducts,
  };
}

/**
 * Records a new purchase bill from a vendor and increases inventory stock
 */
export function recordPurchaseAndUpdateInventory(
  purchase: Purchase,
  currentProducts: Product[],
  currentPurchases: Purchase[],
  currentVendors: Vendor[],
  currentLedger: VendorLedgerEntry[]
): {
  updatedProducts: Product[];
  updatedPurchases: Purchase[];
  updatedVendors: Vendor[];
  updatedLedger: VendorLedgerEntry[];
  updatedLedgerEntries: VendorLedgerEntry[];
} {
  const pricingSettings = getStoredPricingSettings();

  // 1. Update product stock and cost batches for purchased items
  const updatedProducts = currentProducts.map(originalProd => {
    const pItem = purchase.items.find(it => 
      it.productId === originalProd.id ||
      (it.internalId && originalProd.internalId && it.internalId.trim().toLowerCase() === originalProd.internalId.trim().toLowerCase()) ||
      (it.productName && originalProd.name && it.productName.trim().toLowerCase() === originalProd.name.trim().toLowerCase())
    );
    if (!pItem) return originalProd;

    // Ensure product batches are initialized
    const prod = ensureProductBatches(originalProd);

    const previousStock = prod.stockQuantity || 0;
    const qtyAdded = pItem.quantity || 1;
    const newStock = previousStock + qtyAdded;
    const purchaseUnitPrice = Number(pItem.unitPrice) || 0;

    // Build the new CostBatch for this purchase
    const newBatch: CostBatch = {
      id: `batch-pur-${purchase.id}-${pItem.productId}-${Date.now()}`,
      purchaseId: purchase.id,
      billNumber: purchase.billNumber,
      vendorId: purchase.vendorId,
      vendorName: purchase.vendorName,
      date: purchase.date || new Date().toISOString(),
      quantity: qtyAdded,
      remainingQuantity: qtyAdded,
      unitCost: purchaseUnitPrice,
      notes: purchase.notes || `Purchase Bill #${purchase.billNumber} from ${purchase.vendorName}`,
    };

    const updatedCostBatches = [...(prod.costBatches || []), newBatch];

    // Determine if inventory catalog prices should be updated
    const shouldUpdatePrices = purchase.updatePricesInInventory !== false;
    let newCostPrice = prod.costPrice;
    let newSellingPrices = prod.sellingPrices;

    if (shouldUpdatePrices && purchaseUnitPrice > 0) {
      newCostPrice = purchaseUnitPrice;
      newSellingPrices = generateProductSellingPrices(purchaseUnitPrice, pricingSettings, prod.sellingPrices);
    } else if ((prod.costPrice === undefined || prod.costPrice === 0) && purchaseUnitPrice > 0) {
      newCostPrice = purchaseUnitPrice;
      newSellingPrices = generateProductSellingPrices(purchaseUnitPrice, pricingSettings, prod.sellingPrices);
    }

    saveStockLog({
      id: `log-${Date.now()}-${prod.id}`,
      productId: prod.id,
      productName: prod.name,
      internalId: prod.internalId,
      brandName: prod.brandName,
      typeName: prod.typeName,
      unit: prod.unit,
      change: qtyAdded,
      previousStock,
      newStock,
      reason: 'Purchase',
      movementType: 'purchase',
      referenceId: purchase.id,
      referenceNumber: purchase.billNumber || purchase.id,
      entityName: purchase.vendorName,
      unitRate: purchaseUnitPrice,
      totalMovementValue: Math.round(qtyAdded * purchaseUnitPrice),
      locationName: prod.locationName,
      cabinNumber: prod.cabinNumber,
      timestamp: purchase.date || new Date().toISOString(),
      notes: `Purchase bill #${purchase.billNumber || purchase.id} from ${purchase.vendorName} (+${qtyAdded} ${prod.unit} @ ₨ ${purchaseUnitPrice.toLocaleString()})`,
    });

    return {
      ...prod,
      stockQuantity: newStock,
      costPrice: newCostPrice,
      sellingPrices: newSellingPrices,
      lastPurchasePrice: purchaseUnitPrice > 0 ? purchaseUnitPrice : prod.lastPurchasePrice,
      lastPurchaseDate: purchase.date || new Date().toISOString(),
      costBatches: updatedCostBatches,
      vendorId: purchase.vendorId || prod.vendorId,
      vendorName: purchase.vendorName || prod.vendorName,
      updatedAt: new Date().toISOString(),
    };
  });

  // 2. Add purchase to list
  const updatedPurchases = [purchase, ...currentPurchases];

  // 3. If amount paid on spot > 0, record Cash Sent entry
  let updatedLedger = [...currentLedger];
  if (purchase.amountPaid > 0) {
    const cashEntry: VendorLedgerEntry = {
      id: `CSH-${Date.now()}`,
      vendorId: purchase.vendorId,
      date: purchase.date || new Date().toISOString(),
      type: 'cash_sent',
      entryCode: 'Cash',
      billNumber: purchase.billNumber,
      referenceId: purchase.id,
      description: `Cash payment made against bill #${purchase.billNumber || purchase.id}`,
      debit: purchase.amountPaid,
      credit: 0,
      amount: purchase.amountPaid,
      paymentMethod: 'Cash',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updatedLedger = [cashEntry, ...updatedLedger];
  }

  // 4. Update vendor's linkedProductIds
  const purchasedProdIds = purchase.items.map(it => it.productId);
  const updatedVendors = currentVendors.map(v => {
    if (v.id === purchase.vendorId) {
      const merged = Array.from(new Set([...(v.linkedProductIds || []), ...purchasedProdIds]));
      return {
        ...v,
        linkedProductIds: merged,
        updatedAt: new Date().toISOString(),
      };
    }
    return v;
  });

  // Persist all
  saveStoredProducts(updatedProducts);
  saveStoredPurchases(updatedPurchases);
  saveStoredVendors(updatedVendors);
  saveStoredVendorLedger(updatedLedger);

  return {
    updatedProducts,
    updatedPurchases,
    updatedVendors,
    updatedLedger,
    updatedLedgerEntries: updatedLedger,
  };
}

/**
 * Updates an edited purchase bill and adjusts inventory stock differences
 */
export function updatePurchaseAndUpdateAll(
  editedPurchase: Purchase,
  originalPurchase: Purchase,
  currentProducts: Product[],
  currentPurchases: Purchase[],
  currentVendors: Vendor[],
  currentLedger: VendorLedgerEntry[]
): {
  updatedProducts: Product[];
  updatedPurchases: Purchase[];
  updatedVendors: Vendor[];
  updatedLedger: VendorLedgerEntry[];
  updatedLedgerEntries: VendorLedgerEntry[];
} {
  const pricingSettings = getStoredPricingSettings();

  // 1. Adjust stock delta & batches
  const updatedProducts = currentProducts.map(originalProd => {
    const oldItem = originalPurchase.items.find(it => 
      it.productId === originalProd.id ||
      (it.internalId && originalProd.internalId && it.internalId.trim().toLowerCase() === originalProd.internalId.trim().toLowerCase()) ||
      (it.productName && originalProd.name && it.productName.trim().toLowerCase() === originalProd.name.trim().toLowerCase())
    );
    const newItem = editedPurchase.items.find(it => 
      it.productId === originalProd.id ||
      (it.internalId && originalProd.internalId && it.internalId.trim().toLowerCase() === originalProd.internalId.trim().toLowerCase()) ||
      (it.productName && originalProd.name && it.productName.trim().toLowerCase() === originalProd.name.trim().toLowerCase())
    );

    if (!oldItem && !newItem) return originalProd;

    const prod = ensureProductBatches(originalProd);

    const oldQty = oldItem ? (oldItem.quantity || 1) : 0;
    const newQty = newItem ? (newItem.quantity || 1) : 0;
    const stockDelta = newQty - oldQty;

    const currentStock = prod.stockQuantity || 0;
    const newStock = Math.max(0, currentStock + stockDelta);

    let updatedBatches = (prod.costBatches || []).map(batch => {
      if (batch.purchaseId === editedPurchase.id) {
        if (!newItem) {
          return null; // removed from bill
        }
        const deltaBatchQty = newQty - oldQty;
        const newRemaining = Math.max(0, (batch.remainingQuantity || 0) + deltaBatchQty);
        return {
          ...batch,
          billNumber: editedPurchase.billNumber,
          vendorId: editedPurchase.vendorId,
          vendorName: editedPurchase.vendorName,
          date: editedPurchase.date || batch.date,
          quantity: newQty,
          remainingQuantity: newRemaining,
          unitCost: newItem.unitPrice,
        };
      }
      return batch;
    }).filter(Boolean) as CostBatch[];

    if (newItem && !oldItem) {
      const newBatch: CostBatch = {
        id: `batch-pur-${editedPurchase.id}-${newItem.productId}-${Date.now()}`,
        purchaseId: editedPurchase.id,
        billNumber: editedPurchase.billNumber,
        vendorId: editedPurchase.vendorId,
        vendorName: editedPurchase.vendorName,
        date: editedPurchase.date || new Date().toISOString(),
        quantity: newQty,
        remainingQuantity: newQty,
        unitCost: newItem.unitPrice,
        notes: `Purchase Bill #${editedPurchase.billNumber}`,
      };
      updatedBatches.push(newBatch);
    }

    if (stockDelta !== 0) {
      saveStockLog({
        id: `log-${Date.now()}-${prod.id}`,
        productId: prod.id,
        productName: prod.name,
        internalId: prod.internalId,
        brandName: prod.brandName,
        typeName: prod.typeName,
        unit: prod.unit,
        change: stockDelta,
        previousStock: currentStock,
        newStock,
        reason: 'Adjustment',
        movementType: 'purchase',
        referenceId: editedPurchase.id,
        referenceNumber: editedPurchase.billNumber || editedPurchase.id,
        entityName: editedPurchase.vendorName,
        unitRate: Number(newItem?.unitPrice || 0),
        totalMovementValue: Math.abs(stockDelta) * Number(newItem?.unitPrice || 0),
        locationName: prod.locationName,
        cabinNumber: prod.cabinNumber,
        timestamp: new Date().toISOString(),
        notes: `Updated Purchase bill #${editedPurchase.billNumber} (Old Qty: ${oldQty} -> New Qty: ${newQty})`,
      });
    }

    const shouldUpdatePrices = editedPurchase.updatePricesInInventory !== false;
    let newCostPrice = prod.costPrice;
    let newSellingPrices = prod.sellingPrices;

    if (shouldUpdatePrices && newItem && Number(newItem.unitPrice) > 0) {
      newCostPrice = Number(newItem.unitPrice);
      newSellingPrices = generateProductSellingPrices(newCostPrice, pricingSettings, prod.sellingPrices);
    } else if (prod.costPrice === undefined || prod.costPrice === 0) {
      const activeFifoCost = getActiveFifoCost({
        costBatches: updatedBatches,
        costPrice: prod.costPrice,
      });
      if (activeFifoCost > 0) {
        newCostPrice = activeFifoCost;
        newSellingPrices = generateProductSellingPrices(activeFifoCost, pricingSettings, prod.sellingPrices);
      }
    }

    return {
      ...prod,
      stockQuantity: newStock,
      costPrice: newCostPrice,
      sellingPrices: newSellingPrices,
      lastPurchasePrice: (newItem && Number(newItem.unitPrice) > 0) ? Number(newItem.unitPrice) : prod.lastPurchasePrice,
      lastPurchaseDate: editedPurchase.date || prod.lastPurchaseDate,
      costBatches: updatedBatches,
      updatedAt: new Date().toISOString(),
    };
  });

  // 2. Update purchases list
  const updatedPurchases = currentPurchases.map(p => (p.id === editedPurchase.id ? { ...editedPurchase, updatedAt: new Date().toISOString() } : p));

  // 3. Update cash entry if amountPaid changed
  const updatedLedger = currentLedger.map(e => {
    if (e.referenceId === editedPurchase.id && e.type === 'cash_sent') {
      return {
        ...e,
        vendorId: editedPurchase.vendorId,
        date: editedPurchase.date || e.date,
        billNumber: editedPurchase.billNumber,
        amount: editedPurchase.amountPaid,
        debit: editedPurchase.amountPaid,
        description: `Cash payment made against bill #${editedPurchase.billNumber || editedPurchase.id}`,
        updatedAt: new Date().toISOString(),
      };
    }
    return e;
  });

  saveStoredProducts(updatedProducts);
  saveStoredPurchases(updatedPurchases);
  saveStoredVendors(currentVendors);
  saveStoredVendorLedger(updatedLedger);

  return {
    updatedProducts,
    updatedPurchases,
    updatedVendors: currentVendors,
    updatedLedger,
    updatedLedgerEntries: updatedLedger,
  };
}

/**
 * Deletes a purchase bill and reverts added inventory stock
 */
export function deletePurchaseAndUpdateAll(
  purchaseId: string,
  currentProducts: Product[],
  currentPurchases: Purchase[],
  currentVendors: Vendor[],
  currentLedger: VendorLedgerEntry[]
): {
  updatedProducts: Product[];
  updatedPurchases: Purchase[];
  updatedVendors: Vendor[];
  updatedLedger: VendorLedgerEntry[];
  updatedLedgerEntries: VendorLedgerEntry[];
} {
  const purchaseToDelete = currentPurchases.find(p => p.id === purchaseId);
  if (!purchaseToDelete) {
    return {
      updatedProducts: currentProducts,
      updatedPurchases: currentPurchases,
      updatedVendors: currentVendors,
      updatedLedger: currentLedger,
      updatedLedgerEntries: currentLedger,
    };
  }

  const pricingSettings = getStoredPricingSettings();

  // 1. Revert product stock & remove batches
  const updatedProducts = currentProducts.map(originalProd => {
    const pItem = purchaseToDelete.items.find(it => it.productId === originalProd.id);
    if (!pItem) return originalProd;

    const prod = ensureProductBatches(originalProd);
    const qtyToRemove = pItem.quantity || 1;
    const currentStock = prod.stockQuantity || 0;
    const newStock = Math.max(0, currentStock - qtyToRemove);

    // Remove this purchase's batches
    const updatedBatches = (prod.costBatches || []).filter(b => b.purchaseId !== purchaseId);

    saveStockLog({
      id: `log-${Date.now()}-${prod.id}`,
      productId: prod.id,
      productName: prod.name,
      internalId: prod.internalId,
      brandName: prod.brandName,
      typeName: prod.typeName,
      unit: prod.unit,
      change: -qtyToRemove,
      previousStock: currentStock,
      newStock,
      reason: 'Adjustment',
      movementType: 'delete_rollback',
      referenceId: purchaseToDelete.id,
      referenceNumber: purchaseToDelete.billNumber || purchaseToDelete.id,
      entityName: purchaseToDelete.vendorName,
      unitRate: Number(pItem.unitPrice || 0),
      totalMovementValue: Math.round(qtyToRemove * Number(pItem.unitPrice || 0)),
      locationName: prod.locationName,
      cabinNumber: prod.cabinNumber,
      timestamp: new Date().toISOString(),
      notes: `Reverted stock from deleted purchase #${purchaseToDelete.billNumber || purchaseToDelete.id} (-${qtyToRemove})`,
    });

    const activeFifoCost = getActiveFifoCost({
      costBatches: updatedBatches,
      costPrice: prod.costPrice,
    });

    let newCostPrice = prod.costPrice;
    // If the costPrice was exactly the unitPrice of the deleted purchase, fallback to latest remaining batch cost or FIFO cost
    if (prod.costPrice === Number(pItem.unitPrice)) {
      const remainingWithStock = updatedBatches.filter(b => (b.remainingQuantity || 0) > 0);
      const latestRemaining = remainingWithStock[remainingWithStock.length - 1] || updatedBatches[updatedBatches.length - 1];
      if (latestRemaining && latestRemaining.unitCost > 0) {
        newCostPrice = latestRemaining.unitCost;
      } else if (activeFifoCost > 0) {
        newCostPrice = activeFifoCost;
      }
    }

    const nextSellingPrices = newCostPrice > 0
      ? generateProductSellingPrices(newCostPrice, pricingSettings, prod.sellingPrices)
      : prod.sellingPrices;

    return {
      ...prod,
      stockQuantity: newStock,
      costPrice: newCostPrice,
      sellingPrices: nextSellingPrices,
      costBatches: updatedBatches,
      updatedAt: new Date().toISOString(),
    };
  });

  // 2. Remove purchase
  const updatedPurchases = currentPurchases.filter(p => p.id !== purchaseId);

  // 3. Remove linked ledger entries
  const updatedLedger = currentLedger.filter(e => e.referenceId !== purchaseId && e.billNumber !== purchaseToDelete.billNumber);

  saveStoredProducts(updatedProducts);
  saveStoredPurchases(updatedPurchases);
  saveStoredVendors(currentVendors);
  saveStoredVendorLedger(updatedLedger);

  return {
    updatedProducts,
    updatedPurchases,
    updatedVendors: currentVendors,
    updatedLedger,
    updatedLedgerEntries: updatedLedger,
  };
}

/**
 * Retrieves the complete purchase order history for a specific product
 */
export function getProductPurchaseHistory(
  productId: string,
  purchases: Purchase[]
): ProductPurchaseHistoryItem[] {
  const history: ProductPurchaseHistoryItem[] = [];

  for (const p of purchases) {
    if (!p.items) continue;
    const item = p.items.find(it => it.productId === productId);
    if (item) {
      history.push({
        purchaseId: p.id,
        billNumber: p.billNumber || p.id,
        vendorId: p.vendorId,
        vendorName: p.vendorName || 'Vendor',
        date: p.date || p.createdAt,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice || (item.quantity * item.unitPrice),
      });
    }
  }

  return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ----------------------------------------------------------------------------
// CUSTOMER & VENDOR RETURNS ENGINE
// ----------------------------------------------------------------------------

export const INITIAL_CUSTOMER_RETURNS: CustomerReturn[] = [];

export const INITIAL_VENDOR_RETURNS: VendorReturn[] = [];

export function getStoredCustomerReturns(): CustomerReturn[] {
  try {
    const raw = localStorage.getItem(CUSTOMER_RETURNS_KEY);
    if (!raw) {
      saveStoredCustomerReturns(INITIAL_CUSTOMER_RETURNS);
      return INITIAL_CUSTOMER_RETURNS;
    }
    return JSON.parse(raw);
  } catch (err) {
    return INITIAL_CUSTOMER_RETURNS;
  }
}

export function saveStoredCustomerReturns(returns: CustomerReturn[]): void {
  try {
    localStorage.setItem(CUSTOMER_RETURNS_KEY, JSON.stringify(returns));
  } catch (err) {
    console.error('Failed to save customer returns', err);
  }
}

export function getStoredVendorReturns(): VendorReturn[] {
  try {
    const raw = localStorage.getItem(VENDOR_RETURNS_KEY);
    if (!raw) {
      saveStoredVendorReturns(INITIAL_VENDOR_RETURNS);
      return INITIAL_VENDOR_RETURNS;
    }
    return JSON.parse(raw);
  } catch (err) {
    return INITIAL_VENDOR_RETURNS;
  }
}

export function saveStoredVendorReturns(returns: VendorReturn[]): void {
  try {
    localStorage.setItem(VENDOR_RETURNS_KEY, JSON.stringify(returns));
  } catch (err) {
    console.error('Failed to save vendor returns', err);
  }
}

export function getNextCustomerReturnId(returns: CustomerReturn[]): { id: string; returnNumber: string; creditNoteNumber: string } {
  let highestNum = 1000;
  for (const r of returns) {
    const match = (r.id || '').match(/CRTN-(\d+)/i) || (r.returnNumber || '').match(/CR-.*-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > highestNum) highestNum = num;
    }
  }
  const nextNum = highestNum + 1;
  const year = new Date().getFullYear();
  return {
    id: `CRTN-${nextNum}`,
    returnNumber: `CR-${year}-${String(nextNum).slice(-3)}`,
    creditNoteNumber: `CN-${nextNum}`,
  };
}

export function getNextVendorReturnId(returns: VendorReturn[]): { id: string; returnNumber: string; debitNoteNumber: string } {
  let highestNum = 2000;
  let highestDebitNote = 100;
  for (const r of returns) {
    const match = (r.id || '').match(/VRTN-(\d+)/i) || (r.returnNumber || '').match(/VR-.*-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > highestNum) highestNum = num;
    }
    const dnMatch = (r.debitNoteNumber || '').match(/DN-(\d+)/i);
    if (dnMatch && dnMatch[1]) {
      const num = parseInt(dnMatch[1], 10);
      if (!isNaN(num) && num > highestDebitNote) highestDebitNote = num;
    }
  }
  const nextNum = highestNum + 1;
  const nextDn = highestDebitNote + 1;
  const year = new Date().getFullYear();
  return {
    id: `VRTN-${nextNum}`,
    returnNumber: `VR-${year}-${String(nextNum).slice(-3)}`,
    debitNoteNumber: `DN-${nextDn}`,
  };
}

export function isMatchingReturnItem(
  sourceItem: { productId?: string; internalId?: string; productName?: string },
  returnItem: { productId?: string; internalId?: string; productName?: string }
): boolean {
  if (sourceItem.productId && returnItem.productId) {
    return sourceItem.productId === returnItem.productId;
  }
  if (sourceItem.internalId && returnItem.internalId) {
    return sourceItem.internalId.trim().toLowerCase() === returnItem.internalId.trim().toLowerCase();
  }
  if (sourceItem.productName && returnItem.productName) {
    return sourceItem.productName.trim().toLowerCase() === returnItem.productName.trim().toLowerCase();
  }
  return false;
}

export function isMatchingSaleId(
  sale: Sale,
  referencedSaleId?: string
): boolean {
  if (!referencedSaleId) return false;
  const ref = referencedSaleId.trim().toLowerCase();
  const sId = (sale.id || '').trim().toLowerCase();
  const sInv = ((sale as any).invoiceNumber || '').trim().toLowerCase();
  return ref === sId || (sInv !== '' && ref === sInv);
}

export function isMatchingPurchaseId(
  purchase: Purchase,
  referencedPurchaseId?: string,
  referencedBillNumber?: string
): boolean {
  const pId = purchase.id.trim().toLowerCase();
  const pBill = purchase.billNumber ? purchase.billNumber.trim().toLowerCase() : '';
  
  if (referencedPurchaseId) {
    const refP = referencedPurchaseId.trim().toLowerCase();
    if (refP === pId || (pBill !== '' && refP === pBill)) return true;
  }
  if (referencedBillNumber) {
    const refB = referencedBillNumber.trim().toLowerCase();
    if (refB === pId || (pBill !== '' && refB === pBill)) return true;
  }
  return false;
}

/**
 * Calculates the exact return eligibility for an item from a specific Sale.
 * It computes original sold quantity, already returned quantity across other credit notes,
 * and the remaining returnable quantity to prevent double-returning.
 */
export function calculateSaleItemReturnableQty(
  sale: Sale,
  item: { productId?: string; internalId?: string; productName?: string },
  customerReturns: CustomerReturn[] = [],
  excludeReturnId?: string
): {
  soldQty: number;
  alreadyReturnedQty: number;
  remainingQty: number;
  isFullyReturned: boolean;
} {
  const saleItem = (sale.items || []).find(sItem => isMatchingReturnItem(sItem, item));

  const soldQty = saleItem ? (Number(saleItem.quantity) || 0) : 0;

  // Find all other returns linked to this exact sale
  const linkedReturns = customerReturns.filter(r => {
    if (excludeReturnId && r.id === excludeReturnId) return false;
    return isMatchingSaleId(sale, r.saleId);
  });

  let alreadyReturnedQty = 0;
  for (const ret of linkedReturns) {
    for (const rItem of ret.items || []) {
      if (isMatchingReturnItem(item, rItem) || (saleItem && isMatchingReturnItem(saleItem, rItem))) {
        alreadyReturnedQty += (Number(rItem.quantity) || 0);
      }
    }
  }

  const remainingQty = Math.max(0, soldQty - alreadyReturnedQty);
  return {
    soldQty,
    alreadyReturnedQty,
    remainingQty,
    isFullyReturned: soldQty > 0 && remainingQty === 0,
  };
}

/**
 * Calculates the exact return eligibility for an item from a specific Purchase.
 */
export function calculatePurchaseItemReturnableQty(
  purchase: Purchase,
  item: { productId?: string; internalId?: string; productName?: string },
  vendorReturns: VendorReturn[] = [],
  excludeReturnId?: string
): {
  purchasedQty: number;
  alreadyReturnedQty: number;
  remainingQty: number;
  isFullyReturned: boolean;
} {
  const purchaseItem = (purchase.items || []).find(pItem => isMatchingReturnItem(pItem, item));

  const purchasedQty = purchaseItem ? (Number(purchaseItem.quantity) || 0) : 0;

  const linkedReturns = vendorReturns.filter(r => {
    if (excludeReturnId && r.id === excludeReturnId) return false;
    return isMatchingPurchaseId(purchase, r.purchaseId, (r as any).billNumber);
  });

  let alreadyReturnedQty = 0;
  for (const ret of linkedReturns) {
    for (const rItem of ret.items || []) {
      if (isMatchingReturnItem(item, rItem) || (purchaseItem && isMatchingReturnItem(purchaseItem, rItem))) {
        alreadyReturnedQty += (Number(rItem.quantity) || 0);
      }
    }
  }

  const remainingQty = Math.max(0, purchasedQty - alreadyReturnedQty);
  return {
    purchasedQty,
    alreadyReturnedQty,
    remainingQty,
    isFullyReturned: purchasedQty > 0 && remainingQty === 0,
  };
}

/**
 * Synchronizes a list of sales with customer returns, dynamically computing
 * net quantities, net invoice totals, and linked return summaries.
 */
export function syncSalesWithReturns(
  sales: Sale[],
  returns: CustomerReturn[]
): Sale[] {
  return sales.map(sale => {
    // Find all returns that reference this sale
    const linkedReturns = returns.filter(r => isMatchingSaleId(sale, r.saleId));

    if (linkedReturns.length === 0) {
      const cleanedItems = (sale.items || []).map(item => ({
        ...item,
        returnedQuantity: 0,
        netQuantity: item.quantity,
        netTotalPrice: item.totalPrice || (item.quantity * item.unitPrice),
      }));

      return {
        ...sale,
        items: cleanedItems,
        hasReturns: false,
        totalReturnedAmount: 0,
        netAmount: sale.totalAmount,
        netBalanceDue: sale.balanceDue,
        returnedItemsCount: 0,
        returnsList: [],
      };
    }

    const updatedItems = (sale.items || []).map(item => {
      let itemReturnedQty = 0;
      for (const ret of linkedReturns) {
        for (const rItem of ret.items || []) {
          if (isMatchingReturnItem(item, rItem)) {
            itemReturnedQty += (Number(rItem.quantity) || 0);
          }
        }
      }

      const boundedRetQty = Math.min(item.quantity, itemReturnedQty);
      const netQty = Math.max(0, item.quantity - boundedRetQty);
      const netTotal = netQty * item.unitPrice;

      return {
        ...item,
        returnedQuantity: boundedRetQty,
        netQuantity: netQty,
        netTotalPrice: netTotal,
      };
    });

    const totalRefunds = linkedReturns.reduce((sum, r) => sum + (Number(r.totalRefundAmount) || 0), 0);
    const totalUnitsReturned = updatedItems.reduce((sum, it) => sum + (it.returnedQuantity || 0), 0);
    const netAmount = Math.max(0, (sale.totalAmount || 0) - totalRefunds);

    const isCreditOrPartial = sale.paymentType === 'credit' || sale.paymentType === 'partial' || (sale.balanceDue > 0);
    const netBalanceDue = isCreditOrPartial 
      ? Math.max(0, netAmount - (Number(sale.amountReceived) || 0))
      : 0;

    const returnSummaries: SaleReturnSummary[] = linkedReturns.map(r => ({
      returnId: r.id,
      returnNumber: r.returnNumber,
      creditNoteNumber: r.creditNoteNumber,
      date: r.date || r.createdAt,
      totalRefundAmount: Number(r.totalRefundAmount) || 0,
      refundMethod: r.refundMethod,
      itemsCount: r.items?.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0) || 0,
    }));

    return {
      ...sale,
      items: updatedItems,
      hasReturns: totalRefunds > 0 || totalUnitsReturned > 0,
      totalReturnedAmount: totalRefunds,
      netAmount,
      netBalanceDue,
      returnedItemsCount: totalUnitsReturned,
      returnsList: returnSummaries,
    };
  });
}

/**
 * Synchronizes a list of purchases with vendor returns, dynamically computing
 * net quantities, net bill totals, and linked return summaries.
 */
export function syncPurchasesWithReturns(
  purchases: Purchase[],
  returns: VendorReturn[]
): Purchase[] {
  return purchases.map(purchase => {
    const linkedReturns = returns.filter(r => isMatchingPurchaseId(purchase, r.purchaseId, (r as any).billNumber));

    if (linkedReturns.length === 0) {
      const cleanedItems = (purchase.items || []).map(item => ({
        ...item,
        returnedQuantity: 0,
        netQuantity: item.quantity,
        netTotalPrice: item.totalPrice || (item.quantity * item.unitPrice),
      }));

      return {
        ...purchase,
        items: cleanedItems,
        hasReturns: false,
        totalReturnedAmount: 0,
        netAmount: purchase.totalAmount,
        netBalanceDue: purchase.balanceDue,
        returnedItemsCount: 0,
        returnsList: [],
      };
    }

    const updatedItems = (purchase.items || []).map(item => {
      let itemReturnedQty = 0;
      for (const ret of linkedReturns) {
        for (const rItem of ret.items || []) {
          if (isMatchingReturnItem(item, rItem)) {
            itemReturnedQty += (Number(rItem.quantity) || 0);
          }
        }
      }

      const boundedRetQty = Math.min(item.quantity, itemReturnedQty);
      const netQty = Math.max(0, item.quantity - boundedRetQty);
      const netTotal = netQty * item.unitPrice;

      return {
        ...item,
        returnedQuantity: boundedRetQty,
        netQuantity: netQty,
        netTotalPrice: netTotal,
      };
    });

    const totalRefunds = linkedReturns.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
    const totalUnitsReturned = updatedItems.reduce((sum, it) => sum + (it.returnedQuantity || 0), 0);
    const netAmount = Math.max(0, (purchase.totalAmount || 0) - totalRefunds);
    const netBalanceDue = Math.max(0, netAmount - (Number(purchase.amountPaid) || 0));

    const returnSummaries: PurchaseReturnSummary[] = linkedReturns.map(r => ({
      returnId: r.id,
      returnNumber: r.returnNumber,
      debitNoteNumber: r.debitNoteNumber,
      date: r.date || r.createdAt,
      totalAmount: Number(r.totalAmount) || 0,
      settlementMethod: r.settlementMethod,
      itemsCount: r.items?.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0) || 0,
    }));

    return {
      ...purchase,
      items: updatedItems,
      hasReturns: totalRefunds > 0 || totalUnitsReturned > 0,
      totalReturnedAmount: totalRefunds,
      netAmount,
      netBalanceDue,
      returnedItemsCount: totalUnitsReturned,
      returnsList: returnSummaries,
    };
  });
}

/**
 * Records a Customer Return (Sales Return / Inward Return):
 * 1. Restocks products if condition === 'restock' (increases inventory count & adds StockLog)
 * 2. If refundMethod === 'khata_credit' and linked to a Customer, creates a CustomerLedgerEntry (Credit Note)
 *    so customer's receivable balance is accurately reduced
 * 3. Updates linked Sale invoice records dynamically
 * 4. Persists everything atomically.
 */
export function recordCustomerReturnAndUpdateInventory(
  returnDoc: CustomerReturn,
  currentProducts: Product[],
  currentReturns: CustomerReturn[],
  currentCustomers: Customer[] = [],
  currentLedger: CustomerLedgerEntry[] = [],
  currentSales: Sale[] = []
): {
  updatedProducts: Product[];
  updatedReturns: CustomerReturn[];
  updatedCustomers: Customer[];
  updatedLedger: CustomerLedgerEntry[];
  updatedSales: Sale[];
} {
  const stockLogs = getStoredStockLogs();
  const now = new Date().toISOString();

  // 1. Process Product Restocking
  const updatedProducts = currentProducts.map(prod => {
    const returnItemsForProd = returnDoc.items.filter(it => it.productId === prod.id && it.condition === 'restock');
    if (returnItemsForProd.length === 0) return prod;

    const restockQty = returnItemsForProd.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    if (restockQty <= 0) return prod;

    const previousStock = Number(prod.stockQuantity) || 0;
    const newStock = previousStock + restockQty;

    stockLogs.unshift({
      id: `log-cr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: prod.id,
      productName: prod.name,
      internalId: prod.internalId,
      brandName: prod.brandName,
      typeName: prod.typeName,
      unit: prod.unit,
      change: restockQty,
      previousStock,
      newStock,
      reason: 'Damage / Return',
      movementType: 'customer_return',
      referenceId: returnDoc.id,
      referenceNumber: returnDoc.returnNumber,
      entityName: returnDoc.customerName,
      unitRate: returnItemsForProd[0]?.returnRate || 0,
      totalMovementValue: Math.round(restockQty * (returnItemsForProd[0]?.returnRate || 0)),
      locationName: prod.locationName,
      cabinNumber: prod.cabinNumber,
      timestamp: returnDoc.date || now,
      notes: `Customer Return #${returnDoc.returnNumber} from ${returnDoc.customerName} (+${restockQty} restocked)`,
    });

    return {
      ...prod,
      stockQuantity: newStock,
      updatedAt: now,
    };
  });

  // 2. Add return to returns list
  const updatedReturns = [returnDoc, ...currentReturns.filter(r => r.id !== returnDoc.id)];

  // 3. Update customer total purchases if applicable
  const updatedCustomers = currentCustomers.map(cust => {
    if (returnDoc.customerId && cust.id === returnDoc.customerId) {
      return {
        ...cust,
        totalPurchases: Math.max(0, (cust.totalPurchases || 0) - (returnDoc.totalRefundAmount || 0)),
        updatedAt: now,
      };
    }
    return cust;
  });

  // 4. Customer Ledger entry for Khata Credit
  let updatedLedger = [...currentLedger];
  if (returnDoc.refundMethod === 'khata_credit' && returnDoc.customerId) {
    const existingEntryIndex = updatedLedger.findIndex(e => e.referenceId === returnDoc.id);
    const ledgerEntry: CustomerLedgerEntry = {
      id: `CLE-CR-${returnDoc.id}`,
      customerId: returnDoc.customerId,
      customerName: returnDoc.customerName,
      date: returnDoc.date || now,
      type: 'payment_received', // In customer Khata, credits reduce what customer owes
      entryCode: returnDoc.creditNoteNumber || 'Credit Note',
      billNumber: returnDoc.returnNumber,
      referenceId: returnDoc.id,
      description: `Sales Return Credit Note #${returnDoc.returnNumber} (${returnDoc.items.map(it => `${it.productName} x${it.quantity}`).join(', ')})${returnDoc.saleId ? ` [Ref: ${returnDoc.saleId}]` : ''}`,
      debit: 0,
      credit: returnDoc.totalRefundAmount,
      amount: returnDoc.totalRefundAmount,
      receiptNumber: returnDoc.creditNoteNumber || returnDoc.returnNumber,
      notes: returnDoc.notes,
      createdAt: returnDoc.createdAt || now,
      updatedAt: now,
    };

    if (existingEntryIndex >= 0) {
      updatedLedger[existingEntryIndex] = ledgerEntry;
    } else {
      updatedLedger.push(ledgerEntry);
    }
  }

  // 5. Synchronize Sales Invoices
  const salesToSync = currentSales.length > 0 ? currentSales : getStoredSales();
  const updatedSales = syncSalesWithReturns(salesToSync, updatedReturns);

  saveStoredProducts(updatedProducts);
  saveStoredStockLogs(stockLogs);
  saveStoredCustomerReturns(updatedReturns);
  saveStoredCustomers(updatedCustomers);
  saveStoredCustomerLedger(updatedLedger);
  saveStoredSales(updatedSales);

  return {
    updatedProducts,
    updatedReturns,
    updatedCustomers,
    updatedLedger,
    updatedSales,
  };
}

/**
 * Deletes a Customer Return, rolling back any inventory restocks and removing linked ledger credit entries.
 */
export function deleteCustomerReturnAndUpdateAll(
  returnId: string,
  currentProducts: Product[],
  currentReturns: CustomerReturn[],
  currentCustomers: Customer[] = [],
  currentLedger: CustomerLedgerEntry[] = [],
  currentSales: Sale[] = []
): {
  updatedProducts: Product[];
  updatedReturns: CustomerReturn[];
  updatedCustomers: Customer[];
  updatedLedger: CustomerLedgerEntry[];
  updatedSales: Sale[];
} {
  const returnToDelete = currentReturns.find(r => r.id === returnId);
  if (!returnToDelete) {
    const salesToSync = currentSales.length > 0 ? currentSales : getStoredSales();
    const updatedSales = syncSalesWithReturns(salesToSync, currentReturns);
    return {
      updatedProducts: currentProducts,
      updatedReturns: currentReturns,
      updatedCustomers: currentCustomers,
      updatedLedger: currentLedger,
      updatedSales,
    };
  }

  const stockLogs = getStoredStockLogs();
  const now = new Date().toISOString();

  // Revert Restocked quantities
  const updatedProducts = currentProducts.map(prod => {
    const returnItemsForProd = returnToDelete.items.filter(it => it.productId === prod.id && it.condition === 'restock');
    if (returnItemsForProd.length === 0) return prod;

    const qtyToRevert = returnItemsForProd.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    if (qtyToRevert <= 0) return prod;

    const previousStock = Number(prod.stockQuantity) || 0;
    const newStock = Math.max(0, previousStock - qtyToRevert);

    stockLogs.unshift({
      id: `log-cr-del-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: prod.id,
      productName: prod.name,
      internalId: prod.internalId,
      brandName: prod.brandName,
      typeName: prod.typeName,
      unit: prod.unit,
      change: -qtyToRevert,
      previousStock,
      newStock,
      reason: 'Damage / Return',
      movementType: 'delete_rollback',
      referenceId: returnToDelete.id,
      referenceNumber: returnToDelete.returnNumber,
      entityName: returnToDelete.customerName,
      unitRate: returnItemsForProd[0]?.returnRate || 0,
      totalMovementValue: Math.round(qtyToRevert * (returnItemsForProd[0]?.returnRate || 0)),
      locationName: prod.locationName,
      cabinNumber: prod.cabinNumber,
      timestamp: now,
      notes: `Reverted restock from deleted Customer Return #${returnToDelete.returnNumber} (-${qtyToRevert})`,
    });

    return {
      ...prod,
      stockQuantity: newStock,
      updatedAt: now,
    };
  });

  const updatedReturns = currentReturns.filter(r => r.id !== returnId);
  const updatedLedger = currentLedger.filter(e => e.referenceId !== returnId && e.billNumber !== returnToDelete.returnNumber);

  // Restore customer total purchases
  const updatedCustomers = currentCustomers.map(cust => {
    if (returnToDelete.customerId && cust.id === returnToDelete.customerId) {
      return {
        ...cust,
        totalPurchases: (cust.totalPurchases || 0) + (returnToDelete.totalRefundAmount || 0),
        updatedAt: now,
      };
    }
    return cust;
  });

  // Synchronize Sales Invoices
  const salesToSync = currentSales.length > 0 ? currentSales : getStoredSales();
  const updatedSales = syncSalesWithReturns(salesToSync, updatedReturns);

  saveStoredProducts(updatedProducts);
  saveStoredStockLogs(stockLogs);
  saveStoredCustomerReturns(updatedReturns);
  saveStoredCustomers(updatedCustomers);
  saveStoredCustomerLedger(updatedLedger);
  saveStoredSales(updatedSales);

  return {
    updatedProducts,
    updatedReturns,
    updatedCustomers,
    updatedLedger,
    updatedSales,
  };
}

/**
 * Records a Vendor Return (Purchase Return / Outward Return / Debit Note):
 * 1. Decreases inventory count for items shipped back to the vendor & adds StockLog
 * 2. If settlementMethod === 'debit_note', creates a VendorLedgerEntry (Debit Note / cash_sent)
 *    so the payable balance we owe the vendor is accurately reduced
 * 3. Updates linked Purchase bill records dynamically
 * 4. Persists everything atomically.
 */
export function recordVendorReturnAndUpdateInventory(
  returnDoc: VendorReturn,
  currentProducts: Product[],
  currentReturns: VendorReturn[],
  currentVendors: Vendor[] = [],
  currentLedger: VendorLedgerEntry[] = [],
  currentPurchases: Purchase[] = []
): {
  updatedProducts: Product[];
  updatedReturns: VendorReturn[];
  updatedVendors: Vendor[];
  updatedLedger: VendorLedgerEntry[];
  updatedPurchases: Purchase[];
} {
  const stockLogs = getStoredStockLogs();
  const now = new Date().toISOString();

  // 1. Process Product Stock Deduction (returned to vendor)
  const updatedProducts = currentProducts.map(prod => {
    const returnItemsForProd = returnDoc.items.filter(it => it.productId === prod.id);
    if (returnItemsForProd.length === 0) return prod;

    const returnQty = returnItemsForProd.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    if (returnQty <= 0) return prod;

    const previousStock = Number(prod.stockQuantity) || 0;
    const newStock = Math.max(0, previousStock - returnQty);

    stockLogs.unshift({
      id: `log-vr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: prod.id,
      productName: prod.name,
      internalId: prod.internalId,
      brandName: prod.brandName,
      typeName: prod.typeName,
      unit: prod.unit,
      change: -returnQty,
      previousStock,
      newStock,
      reason: 'Damage / Return',
      movementType: 'vendor_return',
      referenceId: returnDoc.id,
      referenceNumber: returnDoc.returnNumber,
      entityName: returnDoc.vendorName,
      unitRate: returnItemsForProd[0]?.unitCost || 0,
      totalMovementValue: Math.round(returnQty * (returnItemsForProd[0]?.unitCost || 0)),
      locationName: prod.locationName,
      cabinNumber: prod.cabinNumber,
      timestamp: returnDoc.date || now,
      notes: `Vendor Return #${returnDoc.returnNumber} to ${returnDoc.vendorName} (-${returnQty} returned to supplier)`,
    });

    return {
      ...prod,
      stockQuantity: newStock,
      updatedAt: now,
    };
  });

  // 2. Add return to returns list
  const updatedReturns = [returnDoc, ...currentReturns.filter(r => r.id !== returnDoc.id)];

  // 3. Vendor Ledger Entry for Debit Note
  let updatedLedger = [...currentLedger];
  if (returnDoc.settlementMethod === 'debit_note' && returnDoc.vendorId) {
    const existingEntryIndex = updatedLedger.findIndex(e => e.referenceId === returnDoc.id);
    const ledgerEntry: VendorLedgerEntry = {
      id: `VLE-VR-${returnDoc.id}`,
      vendorId: returnDoc.vendorId,
      vendorName: returnDoc.vendorName,
      date: returnDoc.date || now,
      type: 'cash_sent', // In vendor ledger, debits reduce what we owe the vendor
      entryCode: returnDoc.debitNoteNumber || 'Debit Note',
      billNumber: returnDoc.returnNumber,
      referenceId: returnDoc.id,
      description: `Purchase Return Debit Note #${returnDoc.debitNoteNumber || returnDoc.returnNumber} (${returnDoc.items.map(it => `${it.productName} x${it.quantity}`).join(', ')})${returnDoc.purchaseId ? ` [Ref: ${returnDoc.purchaseId}]` : ''}`,
      debit: returnDoc.totalAmount,
      credit: 0,
      amount: returnDoc.totalAmount,
      paymentMethod: 'Other',
      receiptNumber: returnDoc.debitNoteNumber || returnDoc.returnNumber,
      notes: returnDoc.notes,
      createdAt: returnDoc.createdAt || now,
      updatedAt: now,
    };

    if (existingEntryIndex >= 0) {
      updatedLedger[existingEntryIndex] = ledgerEntry;
    } else {
      updatedLedger.push(ledgerEntry);
    }
  }

  // 4. Synchronize Purchases
  const purchasesToSync = currentPurchases.length > 0 ? currentPurchases : getStoredPurchases();
  const updatedPurchases = syncPurchasesWithReturns(purchasesToSync, updatedReturns);

  saveStoredProducts(updatedProducts);
  saveStoredStockLogs(stockLogs);
  saveStoredVendorReturns(updatedReturns);
  saveStoredVendors(currentVendors);
  saveStoredVendorLedger(updatedLedger);
  saveStoredPurchases(updatedPurchases);

  return {
    updatedProducts,
    updatedReturns,
    updatedVendors: currentVendors,
    updatedLedger,
    updatedPurchases,
  };
}

/**
 * Deletes a Vendor Return, adding back the returned product quantities to stock and removing linked ledger debit notes.
 */
export function deleteVendorReturnAndUpdateAll(
  returnId: string,
  currentProducts: Product[],
  currentReturns: VendorReturn[],
  currentVendors: Vendor[] = [],
  currentLedger: VendorLedgerEntry[] = [],
  currentPurchases: Purchase[] = []
): {
  updatedProducts: Product[];
  updatedReturns: VendorReturn[];
  updatedVendors: Vendor[];
  updatedLedger: VendorLedgerEntry[];
  updatedPurchases: Purchase[];
} {
  const returnToDelete = currentReturns.find(r => r.id === returnId);
  if (!returnToDelete) {
    const purchasesToSync = currentPurchases.length > 0 ? currentPurchases : getStoredPurchases();
    const updatedPurchases = syncPurchasesWithReturns(purchasesToSync, currentReturns);
    return {
      updatedProducts: currentProducts,
      updatedReturns: currentReturns,
      updatedVendors: currentVendors,
      updatedLedger: currentLedger,
      updatedPurchases,
    };
  }

  const stockLogs = getStoredStockLogs();
  const now = new Date().toISOString();

  // Revert deducted quantities
  const updatedProducts = currentProducts.map(prod => {
    const returnItemsForProd = returnToDelete.items.filter(it => it.productId === prod.id);
    if (returnItemsForProd.length === 0) return prod;

    const qtyToRevert = returnItemsForProd.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    if (qtyToRevert <= 0) return prod;

    const previousStock = Number(prod.stockQuantity) || 0;
    const newStock = previousStock + qtyToRevert;

    stockLogs.unshift({
      id: `log-vr-del-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: prod.id,
      productName: prod.name,
      internalId: prod.internalId,
      brandName: prod.brandName,
      typeName: prod.typeName,
      unit: prod.unit,
      change: qtyToRevert,
      previousStock,
      newStock,
      reason: 'Damage / Return',
      movementType: 'delete_rollback',
      referenceId: returnToDelete.id,
      referenceNumber: returnToDelete.returnNumber,
      entityName: returnToDelete.vendorName,
      unitRate: returnItemsForProd[0]?.unitCost || 0,
      totalMovementValue: Math.round(qtyToRevert * (returnItemsForProd[0]?.unitCost || 0)),
      locationName: prod.locationName,
      cabinNumber: prod.cabinNumber,
      timestamp: now,
      notes: `Reverted stock from deleted Vendor Return #${returnToDelete.returnNumber} (+${qtyToRevert})`,
    });

    return {
      ...prod,
      stockQuantity: newStock,
      updatedAt: now,
    };
  });

  const updatedReturns = currentReturns.filter(r => r.id !== returnId);
  const updatedLedger = currentLedger.filter(e => e.referenceId !== returnId && e.billNumber !== returnToDelete.returnNumber);

  // Synchronize Purchases
  const purchasesToSync = currentPurchases.length > 0 ? currentPurchases : getStoredPurchases();
  const updatedPurchases = syncPurchasesWithReturns(purchasesToSync, updatedReturns);

  saveStoredProducts(updatedProducts);
  saveStoredStockLogs(stockLogs);
  saveStoredVendorReturns(updatedReturns);
  saveStoredVendors(currentVendors);
  saveStoredVendorLedger(updatedLedger);
  saveStoredPurchases(updatedPurchases);

  return {
    updatedProducts,
    updatedReturns,
    updatedVendors: currentVendors,
    updatedLedger,
    updatedPurchases,
  };
}

// ----------------------------------------------------------------------------
// QUOTATIONS & ESTIMATES STORAGE & UTILITIES
// ----------------------------------------------------------------------------

export function isQuotationExpired(quotation: Quotation): boolean {
  if (quotation.status === 'converted' || quotation.status === 'rejected') {
    return false;
  }
  const todayStr = new Date().toISOString().split('T')[0];
  const validUntilDate = quotation.validUntil ? quotation.validUntil.split('T')[0] : '';
  if (!validUntilDate) return false;
  return validUntilDate < todayStr;
}

export function getQuotationEffectiveStatus(quotation: Quotation): QuotationStatus {
  if (quotation.status === 'converted') return 'converted';
  if (quotation.status === 'rejected') return 'rejected';
  if (isQuotationExpired(quotation)) return 'expired';
  return 'active';
}

export function getQuotationDaysRemaining(quotation: Quotation): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const validDate = new Date(quotation.validUntil);
  validDate.setHours(0, 0, 0, 0);
  const diffTime = validDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateQuotationValidUntil(dateStr: string, validityDays: number = 7): string {
  const baseDate = new Date(dateStr || new Date().toISOString().split('T')[0]);
  baseDate.setDate(baseDate.getDate() + (Number(validityDays) || 7));
  return baseDate.toISOString().split('T')[0];
}

function getInitialQuotationsSeed(): Quotation[] {
  return [];
}

export function getStoredQuotations(): Quotation[] {
  try {
    const raw = localStorage.getItem(QUOTATIONS_KEY);
    if (!raw) {
      const initial = getInitialQuotationsSeed();
      saveStoredQuotations(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const initial = getInitialQuotationsSeed();
      saveStoredQuotations(initial);
      return initial;
    }
    return parsed;
  } catch (error) {
    console.error('Error reading quotations from localStorage:', error);
    return getInitialQuotationsSeed();
  }
}

export function saveStoredQuotations(quotations: Quotation[]): void {
  try {
    localStorage.setItem(QUOTATIONS_KEY, JSON.stringify(quotations));
  } catch (error) {
    console.error('Error saving quotations to localStorage:', error);
  }
}

export function getNextQuotationId(quotations?: Quotation[]): { id: string; quotationNumber: string } {
  const list = quotations || getStoredQuotations() || [];
  let maxNum = 1000;
  (list || []).forEach(q => {
    const numMatch = q.id?.match(/\d+/) || q.quotationNumber?.match(/\d+/);
    if (numMatch) {
      const parsed = parseInt(numMatch[0], 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  });
  const nextNum = maxNum + 1;
  return {
    id: `QUO-${nextNum}`,
    quotationNumber: `QT-${nextNum}`
  };
}

/**
 * Records a new quotation.
 * CRITICAL RULE: Quotations do NOT deduct inventory product stock!
 */
export function recordQuotation(
  quotation: Quotation,
  currentQuotations: Quotation[]
): Quotation[] {
  const updated = [quotation, ...currentQuotations];
  saveStoredQuotations(updated);
  return updated;
}

/**
 * Updates an existing quotation.
 * CRITICAL RULE: Quotations do NOT modify inventory product stock!
 */
export function updateQuotation(
  quotation: Quotation,
  currentQuotations: Quotation[]
): Quotation[] {
  const updated = currentQuotations.map(q => q.id === quotation.id ? { ...quotation, updatedAt: new Date().toISOString() } : q);
  saveStoredQuotations(updated);
  return updated;
}

/**
 * Renews an expired quotation's validity by adding additional days (default 7 days) from today.
 */
export function renewQuotationValidity(
  quotationId: string,
  additionalDays: number = 7,
  currentQuotations: Quotation[]
): Quotation[] {
  const todayStr = new Date().toISOString().split('T')[0];
  const newValidUntil = calculateQuotationValidUntil(todayStr, additionalDays);
  const now = new Date().toISOString();

  const updated = currentQuotations.map(q => {
    if (q.id !== quotationId) return q;
    return {
      ...q,
      date: todayStr,
      validUntil: newValidUntil,
      validityDays: additionalDays,
      status: 'active' as QuotationStatus,
      updatedAt: now
    };
  });

  saveStoredQuotations(updated);
  return updated;
}

/**
 * Deletes a quotation without touching inventory stock.
 */
export function deleteQuotation(
  quotationId: string,
  currentQuotations: Quotation[]
): Quotation[] {
  const updated = currentQuotations.filter(q => q.id !== quotationId);
  saveStoredQuotations(updated);
  return updated;
}

// ----------------------------------------------------------------------------
// PURCHASE ORDERS & CARGO RECEIVING SERVICE
// ----------------------------------------------------------------------------

export function getInitialPurchaseOrdersSeed(): PurchaseOrder[] {
  return [];
}

export function getStoredPurchaseOrders(): PurchaseOrder[] {
  try {
    const raw = localStorage.getItem(PURCHASE_ORDERS_KEY);
    if (!raw) {
      const initial = getInitialPurchaseOrdersSeed();
      saveStoredPurchaseOrders(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const initial = getInitialPurchaseOrdersSeed();
      saveStoredPurchaseOrders(initial);
      return initial;
    }
    return parsed;
  } catch (error) {
    console.error('Error reading purchase orders from localStorage:', error);
    return getInitialPurchaseOrdersSeed();
  }
}

export function saveStoredPurchaseOrders(pos: PurchaseOrder[]): void {
  try {
    localStorage.setItem(PURCHASE_ORDERS_KEY, JSON.stringify(pos));
  } catch (error) {
    console.error('Error saving purchase orders to localStorage:', error);
  }
}

export function getNextPurchaseOrderId(pos?: PurchaseOrder[]): { id: string; poNumber: string } {
  const list = pos || getStoredPurchaseOrders() || [];
  let maxNum = 1000;
  (list || []).forEach(p => {
    const numMatch = p.id?.match(/\d+/) || p.poNumber?.match(/\d+/);
    if (numMatch) {
      const parsed = parseInt(numMatch[0], 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  });
  const nextNum = maxNum + 1;
  return {
    id: `PO-${nextNum}`,
    poNumber: `PO-${nextNum}`
  };
}

/**
 * Calculates Landed Cost Distribution:
 * Distributes cargo/freight cost proportionally among all received items based on total received quantity.
 * Example: 10 pcs Item A + 10 pcs Item B = 20 pcs total. Cargo = ₨ 1,000.
 * Cargo per piece = ₨ 1,000 / 20 = ₨ 50 / pc.
 * Landed Unit Cost = Base Cost + Cargo per piece.
 */
export function calculatePOCargoDistribution(
  items: PurchaseOrderItem[],
  cargoCost: number
): {
  itemsWithLandedCost: PurchaseOrderItem[];
  cargoCostPerUnit: number;
  totalOrderedQty: number;
  totalReceivedQty: number;
  subtotalBaseCost: number;
  totalLandedCost: number;
} {
  const safeCargo = Math.max(0, Number(cargoCost) || 0);
  
  const totalOrderedQty = items.reduce((sum, it) => sum + (Number(it.orderedQuantity) || 0), 0);
  const totalReceivedQty = items.reduce((sum, it) => sum + (Number(it.receivedQuantity) || 0), 0);

  // If received qty is 0 (order stage), distribute over ordered qty for estimate
  const effectiveQty = totalReceivedQty > 0 ? totalReceivedQty : totalOrderedQty;
  const cargoCostPerUnit = effectiveQty > 0 ? Math.round((safeCargo / effectiveQty) * 100) / 100 : 0;

  let subtotalBaseCost = 0;
  const itemsWithLandedCost: PurchaseOrderItem[] = items.map(it => {
    const qty = totalReceivedQty > 0 ? (Number(it.receivedQuantity) || 0) : (Number(it.orderedQuantity) || 0);
    const unitPrice = (it.actualUnitPrice !== undefined && it.actualUnitPrice !== null && it.actualUnitPrice > 0)
      ? Number(it.actualUnitPrice)
      : (Number(it.estimatedUnitPrice) || 0);
    
    const lineBase = qty * unitPrice;
    subtotalBaseCost += lineBase;

    const allocatedCargo = cargoCostPerUnit;
    const landedUnitCost = unitPrice + allocatedCargo;
    const totalLineCost = Math.round(qty * landedUnitCost);

    return {
      ...it,
      allocatedCargoCost: allocatedCargo,
      landedUnitCost: landedUnitCost > 0 ? landedUnitCost : unitPrice,
      totalLineCost: totalLineCost > 0 ? totalLineCost : lineBase
    };
  });

  const totalLandedCost = Math.round(subtotalBaseCost + safeCargo);

  return {
    itemsWithLandedCost,
    cargoCostPerUnit,
    totalOrderedQty,
    totalReceivedQty,
    subtotalBaseCost,
    totalLandedCost
  };
}

/**
 * Creates / Records a new Purchase Order in Draft or Ordered status.
 * (Does NOT deduct or increment inventory stock until cargo is received).
 */
export function recordPurchaseOrder(
  po: PurchaseOrder,
  currentPOs: PurchaseOrder[]
): PurchaseOrder[] {
  const updated = [po, ...currentPOs];
  saveStoredPurchaseOrders(updated);
  return updated;
}

/**
 * Updates an existing Purchase Order.
 */
export function updatePurchaseOrder(
  po: PurchaseOrder,
  currentPOs: PurchaseOrder[]
): PurchaseOrder[] {
  const updated = currentPOs.map(p => p.id === po.id ? { ...po, updatedAt: new Date().toISOString() } : p);
  saveStoredPurchaseOrders(updated);
  return updated;
}

/**
 * Automatically synchronizes completed Purchase Orders into the Purchases list
 * so that any completed PO appears seamlessly as a purchase bill in the Purchases tab.
 */
export function syncPurchasesWithCompletedPOs(
  purchases: Purchase[],
  purchaseOrders: PurchaseOrder[]
): Purchase[] {
  let updatedPurchases = [...purchases];

  for (const po of purchaseOrders) {
    if (po.status !== 'completed' || po.isPendingBill) continue;

    const purchaseId = `PUR-${po.id.replace(/^PO-/, '')}`;
    const existingIndex = updatedPurchases.findIndex(p =>
      p.poId === po.id ||
      p.id === purchaseId ||
      p.id === po.id ||
      (po.billNumber && p.billNumber === po.billNumber && p.vendorId === po.vendorId) ||
      (!po.billNumber && p.billNumber === po.poNumber && p.vendorId === po.vendorId)
    );

    const receivingDate = po.receivingDate || po.createdAt || new Date().toISOString().split('T')[0];
    const distribution = calculatePOCargoDistribution(po.items, po.cargoCost);

    const purchaseItems: PurchaseItem[] = po.items
      .filter(it => (it.receivedQuantity !== undefined ? Number(it.receivedQuantity) : Number(it.orderedQuantity)) > 0)
      .map((it, idx) => {
        const qty = it.receivedQuantity !== undefined ? Number(it.receivedQuantity) : Number(it.orderedQuantity) || 0;
        const rate = Number(it.landedUnitCost) || Number(it.actualUnitPrice) || Number(it.estimatedUnitPrice) || 0;
        return {
          id: it.id || `pi-${po.id}-${idx}`,
          productId: it.productId,
          internalId: it.internalId || '',
          productName: it.productName,
          brandName: it.brandName,
          typeName: it.typeName,
          unit: it.unit || 'Pcs',
          quantity: qty,
          unitPrice: rate,
          totalPrice: Math.round(qty * rate),
          previousCostPrice: it.previousCostPrice
        };
      });

    const billTotal = po.totalLandedCost || distribution.totalLandedCost || purchaseItems.reduce((s, it) => s + it.totalPrice, 0);
    const amountPaid = Number(po.amountPaid) || 0;
    const balanceDue = Math.max(0, billTotal - amountPaid);
    const paymentStatus: 'paid' | 'partial' | 'unpaid' =
      amountPaid >= billTotal && billTotal > 0 ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid');

    const poPurchase: Purchase = {
      id: existingIndex >= 0 ? updatedPurchases[existingIndex].id : purchaseId,
      billNumber: po.billNumber || po.poNumber,
      vendorId: po.vendorId,
      vendorName: po.vendorName,
      date: receivingDate,
      items: purchaseItems,
      subtotal: distribution.subtotalBaseCost || billTotal,
      totalAmount: billTotal,
      amountPaid: amountPaid,
      balanceDue: balanceDue,
      paymentStatus: paymentStatus,
      updatePricesInInventory: true,
      notes: po.notes 
        ? `Purchase from PO #${po.poNumber}${po.biltyNumber ? ` (Bilty: ${po.biltyNumber})` : ''} - ${po.notes}`
        : `Purchase generated from completed PO #${po.poNumber}${po.biltyNumber ? ` (Bilty: ${po.biltyNumber})` : ''}`,
      poId: po.id,
      poNumber: po.poNumber,
      biltyNumber: po.biltyNumber,
      transporterName: po.transporterName,
      cargoCost: po.cargoCost,
      cargoCostPerUnit: po.cargoCostPerUnit,
      createdAt: existingIndex >= 0 ? (updatedPurchases[existingIndex].createdAt || receivingDate) : receivingDate,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      const existing = updatedPurchases[existingIndex];
      updatedPurchases[existingIndex] = {
        ...existing,
        ...poPurchase,
        hasReturns: existing.hasReturns,
        returnsList: existing.returnsList,
        totalReturnedAmount: existing.totalReturnedAmount,
        netAmount: existing.netAmount,
        netBalanceDue: existing.netBalanceDue,
        returnedItemsCount: existing.returnedItemsCount
      };
    } else {
      updatedPurchases = [poPurchase, ...updatedPurchases];
    }
  }

  return updatedPurchases;
}

/**
 * Processes Cargo Receiving for a Purchase Order:
 * 1. Physical Stock Increment: Increases product stock for received quantities (only once upon receiving).
 * 2. Landed Cost Calculation: Allocates cargo freight across received item quantities.
 * 3. Inventory Cost Update: If costs are known/entered, updates product costPrice & selling prices tiers.
 * 4. Pending Bill Handling: If bill is pending, marks PO as 'pending_bill' (stock adjusted, costs pending).
 * 5. Vendor Ledger Synchronization: When costs are finalized, posts/updates vendor ledger on receiving date!
 * 6. Purchase Record Creation: When PO is completed, records a Purchase in the Purchases tab for full purchase history & invoicing.
 */
export function processPOCargoReceivingAndUpdateAll(
  poData: PurchaseOrder,
  currentPOs: PurchaseOrder[],
  currentProducts: Product[],
  currentVendors: Vendor[],
  currentLedger: VendorLedgerEntry[],
  isPendingBill: boolean = false,
  currentPurchases?: Purchase[]
): {
  updatedProducts: Product[];
  updatedPOs: PurchaseOrder[];
  updatedVendors: Vendor[];
  updatedLedger: VendorLedgerEntry[];
  updatedLedgerEntries: VendorLedgerEntry[];
  updatedPurchases: Purchase[];
} {
  const pricingSettings = getStoredPricingSettings();
  const existingPO = currentPOs.find(p => p.id === poData.id);
  const wasStockAlreadyReceived = Boolean(existingPO?.isStockReceived);
  const now = new Date().toISOString();
  const receivingDate = poData.receivingDate || now.split('T')[0];

  // 1. Calculate cargo distribution and landed costs
  const distribution = calculatePOCargoDistribution(poData.items, poData.cargoCost);
  
  const finalStatus: PurchaseOrderStatus = isPendingBill ? 'pending_bill' : 'completed';
  const finalPO: PurchaseOrder = {
    ...poData,
    items: distribution.itemsWithLandedCost,
    totalOrderedQty: distribution.totalOrderedQty,
    totalReceivedQty: distribution.totalReceivedQty,
    cargoCost: poData.cargoCost,
    cargoCostPerUnit: distribution.cargoCostPerUnit,
    subtotalBaseCost: distribution.subtotalBaseCost,
    totalLandedCost: distribution.totalLandedCost,
    receivingDate,
    costsFinalizedDate: !isPendingBill ? (poData.costsFinalizedDate || now.split('T')[0]) : undefined,
    status: finalStatus,
    isStockReceived: true,
    isBilled: !isPendingBill,
    updatedAt: now
  };

  // 2. Update Products (Stock & Cost Prices)
  const updatedProducts = currentProducts.map(originalProd => {
    const receivedItem = finalPO.items.find(it => 
      it.productId === originalProd.id ||
      (it.internalId && originalProd.internalId && it.internalId.trim().toLowerCase() === originalProd.internalId.trim().toLowerCase()) ||
      (it.productName && originalProd.name && it.productName.trim().toLowerCase() === originalProd.name.trim().toLowerCase())
    );

    if (!receivedItem) return originalProd;

    const prod = ensureProductBatches(originalProd);
    const previousStock = prod.stockQuantity || 0;
    const qtyReceived = Number(receivedItem.receivedQuantity) || 0;

    // Stock Quantity: Increment ONLY if not previously received!
    const newStock = wasStockAlreadyReceived ? previousStock : previousStock + qtyReceived;

    if (!wasStockAlreadyReceived && qtyReceived > 0) {
      saveStockLog({
        id: `log-${Date.now()}-${prod.id}`,
        productId: prod.id,
        productName: prod.name,
        internalId: prod.internalId,
        brandName: prod.brandName,
        typeName: prod.typeName,
        unit: prod.unit,
        change: qtyReceived,
        previousStock,
        newStock,
        reason: 'Received Stock',
        movementType: 'po_receive',
        referenceId: finalPO.id,
        referenceNumber: finalPO.poNumber,
        entityName: finalPO.vendorName,
        unitRate: Number(receivedItem.landedUnitCost) || Number(receivedItem.actualUnitPrice) || 0,
        totalMovementValue: Math.round(qtyReceived * (Number(receivedItem.landedUnitCost) || Number(receivedItem.actualUnitPrice) || 0)),
        locationName: prod.locationName,
        cabinNumber: prod.cabinNumber,
        timestamp: receivingDate,
        notes: `PO Cargo Received (${finalPO.poNumber}) from ${finalPO.vendorName} (+${qtyReceived} ${prod.unit}${isPendingBill ? ' • Bill Pending' : ''})`,
      });
    }

    // Cost Price & Selling Price Updates (Only if bill costs are known/entered)
    let newCostPrice = prod.costPrice;
    let newSellingPrices = prod.sellingPrices;
    let updatedCostBatches = [...(prod.costBatches || [])];
    const landedUnitCost = Number(receivedItem.landedUnitCost) || Number(receivedItem.actualUnitPrice) || 0;

    if (!isPendingBill && landedUnitCost > 0) {
      newCostPrice = landedUnitCost;
      newSellingPrices = generateProductSellingPrices(landedUnitCost, pricingSettings, prod.sellingPrices);

      // Create or update CostBatch for this PO
      const batchId = `batch-po-${finalPO.id}-${receivedItem.productId}`;
      const existingBatchIndex = updatedCostBatches.findIndex(b => b.id === batchId || (b.purchaseId === finalPO.id && b.billNumber === finalPO.billNumber));

      const newBatch: CostBatch = {
        id: batchId,
        purchaseId: finalPO.id,
        billNumber: finalPO.billNumber || finalPO.poNumber,
        vendorId: finalPO.vendorId,
        vendorName: finalPO.vendorName,
        date: receivingDate,
        quantity: qtyReceived,
        remainingQuantity: qtyReceived,
        unitCost: landedUnitCost,
        notes: `PO ${finalPO.poNumber} Landed Cost (Base: ₨ ${(receivedItem.actualUnitPrice || 0).toLocaleString()} + Cargo: ₨ ${distribution.cargoCostPerUnit}/pc)`
      };

      if (existingBatchIndex >= 0) {
        updatedCostBatches[existingBatchIndex] = newBatch;
      } else {
        updatedCostBatches = [...updatedCostBatches, newBatch];
      }

      if (wasStockAlreadyReceived) {
        // Log the cost update when finalized later
        saveStockLog({
          id: `log-cost-${Date.now()}-${prod.id}`,
          productId: prod.id,
          productName: prod.name,
          internalId: prod.internalId,
          change: 0,
          previousStock: newStock,
          newStock,
          reason: 'Adjustment',
          timestamp: now,
          notes: `PO ${finalPO.poNumber} Landed Cost Confirmed: ₨ ${landedUnitCost.toLocaleString()} (Base: ₨ ${(receivedItem.actualUnitPrice || 0).toLocaleString()} + Cargo: ₨ ${distribution.cargoCostPerUnit}/pc)`,
        });
      }
    }

    return {
      ...prod,
      stockQuantity: newStock,
      costPrice: newCostPrice,
      sellingPrices: newSellingPrices,
      lastPurchasePrice: landedUnitCost > 0 ? landedUnitCost : prod.lastPurchasePrice,
      lastPurchaseDate: receivingDate,
      costBatches: updatedCostBatches,
      vendorId: finalPO.vendorId || prod.vendorId,
      vendorName: finalPO.vendorName || prod.vendorName,
      updatedAt: now
    };
  });

  // 3. Update Purchase Orders List
  const updatedPOs = currentPOs.some(p => p.id === finalPO.id)
    ? currentPOs.map(p => p.id === finalPO.id ? finalPO : p)
    : [finalPO, ...currentPOs];

  // 4. Update Vendor Ledger
  let updatedLedger = [...currentLedger];
  const ledgerEntryId = `PUR-${finalPO.id}`;
  const existingLedgerIndex = updatedLedger.findIndex(e => e.referenceId === finalPO.id || e.id === ledgerEntryId);

  if (isPendingBill) {
    // When PO is received without cost, record entry in vendor ledger on receiving date with 0 balance (0 debit, 0 credit) until cost is finalized
    const poPendingLedgerEntry: VendorLedgerEntry = {
      id: ledgerEntryId,
      vendorId: finalPO.vendorId,
      vendorName: finalPO.vendorName,
      date: receivingDate, // Explicitly recorded on receiving date
      type: 'purchase',
      entryCode: finalPO.billNumber ? `Bill #${finalPO.billNumber}` : `PO #${finalPO.poNumber}`,
      billNumber: finalPO.billNumber || finalPO.poNumber,
      referenceId: finalPO.id,
      description: `PO ${finalPO.poNumber} Cargo Received (${finalPO.totalReceivedQty} items received • Cost Pending - ₨ 0 Balance until finalized)${finalPO.biltyNumber ? ` • Bilty: ${finalPO.biltyNumber}` : ''}${finalPO.transporterName ? ` • via ${finalPO.transporterName}` : ''}${finalPO.notes ? ` • ${finalPO.notes}` : ''}`,
      debit: 0,
      credit: 0,
      amount: 0,
      createdAt: existingLedgerIndex >= 0 ? (updatedLedger[existingLedgerIndex].createdAt || receivingDate) : receivingDate,
      updatedAt: now
    };

    if (existingLedgerIndex >= 0) {
      updatedLedger[existingLedgerIndex] = poPendingLedgerEntry;
    } else {
      updatedLedger = [poPendingLedgerEntry, ...updatedLedger];
    }
  } else if (finalPO.totalLandedCost > 0) {
    // When cost is finalized, record / update the entry on receiving date with finalized landed total
    const poFinalLedgerEntry: VendorLedgerEntry = {
      id: ledgerEntryId,
      vendorId: finalPO.vendorId,
      vendorName: finalPO.vendorName,
      date: receivingDate, // Anchored on receiving date
      type: 'purchase',
      entryCode: finalPO.billNumber ? `Bill #${finalPO.billNumber}` : `PO #${finalPO.poNumber}`,
      billNumber: finalPO.billNumber || finalPO.poNumber,
      referenceId: finalPO.id,
      description: `PO ${finalPO.poNumber} Cargo Received (${finalPO.totalReceivedQty} items • Landed Total: ₨ ${finalPO.totalLandedCost.toLocaleString()} incl. Cargo ₨ ${finalPO.cargoCost.toLocaleString()})${finalPO.notes ? ` - ${finalPO.notes}` : ''}`,
      debit: 0,
      credit: finalPO.totalLandedCost,
      amount: finalPO.totalLandedCost,
      createdAt: existingLedgerIndex >= 0 ? (updatedLedger[existingLedgerIndex].createdAt || receivingDate) : receivingDate,
      updatedAt: now
    };

    if (existingLedgerIndex >= 0) {
      updatedLedger[existingLedgerIndex] = poFinalLedgerEntry;
    } else {
      updatedLedger = [poFinalLedgerEntry, ...updatedLedger];
    }
  }

  // Also record cash sent if paid on spot (whether pending bill or finalized)
  if (finalPO.amountPaid && finalPO.amountPaid > 0) {
    const cashEntryId = `CSH-PO-${finalPO.id}`;
    const existingCashIndex = updatedLedger.findIndex(e => e.id === cashEntryId || (e.referenceId === finalPO.id && e.type === 'cash_sent'));
    const cashEntry: VendorLedgerEntry = {
      id: cashEntryId,
      vendorId: finalPO.vendorId,
      vendorName: finalPO.vendorName,
      date: receivingDate,
      type: 'cash_sent',
      entryCode: 'Cash',
      billNumber: finalPO.billNumber || finalPO.poNumber,
      referenceId: finalPO.id,
      description: `Payment made for PO ${finalPO.poNumber}`,
      debit: finalPO.amountPaid,
      credit: 0,
      amount: finalPO.amountPaid,
      paymentMethod: 'Cash',
      createdAt: receivingDate,
      updatedAt: now
    };

    if (existingCashIndex >= 0) {
      updatedLedger[existingCashIndex] = cashEntry;
    } else {
      updatedLedger = [cashEntry, ...updatedLedger];
    }
  }

  // 5. Update Vendor linked products
  const poProdIds = finalPO.items.map(it => it.productId).filter(Boolean);
  const updatedVendors = currentVendors.map(v => {
    if (v.id === finalPO.vendorId) {
      const merged = Array.from(new Set([...(v.linkedProductIds || []), ...poProdIds]));
      return {
        ...v,
        linkedProductIds: merged,
        updatedAt: now
      };
    }
    return v;
  });

  // 6. RECORD / SYNC PURCHASE IN PURCHASES LIST
  const allPurchases = currentPurchases && currentPurchases.length > 0 ? currentPurchases : getStoredPurchases();
  let updatedPurchases = [...allPurchases];

  if (!isPendingBill && (finalStatus === 'completed' || finalPO.status === 'completed')) {
    const purchaseId = `PUR-${finalPO.id.replace(/^PO-/, '')}`;
    const existingPurchaseIndex = updatedPurchases.findIndex(p => 
      p.poId === finalPO.id ||
      p.id === purchaseId ||
      p.id === finalPO.id ||
      (finalPO.billNumber && p.billNumber === finalPO.billNumber && p.vendorId === finalPO.vendorId) ||
      (!finalPO.billNumber && p.billNumber === finalPO.poNumber && p.vendorId === finalPO.vendorId)
    );

    const purchaseItems: PurchaseItem[] = finalPO.items
      .filter(it => (it.receivedQuantity !== undefined ? Number(it.receivedQuantity) : Number(it.orderedQuantity)) > 0)
      .map((it, idx) => {
        const qty = it.receivedQuantity !== undefined ? Number(it.receivedQuantity) : Number(it.orderedQuantity) || 0;
        const rate = Number(it.landedUnitCost) || Number(it.actualUnitPrice) || Number(it.estimatedUnitPrice) || 0;
        return {
          id: it.id || `pi-${finalPO.id}-${idx}`,
          productId: it.productId,
          internalId: it.internalId || '',
          productName: it.productName,
          brandName: it.brandName,
          typeName: it.typeName,
          unit: it.unit || 'Pcs',
          quantity: qty,
          unitPrice: rate,
          totalPrice: Math.round(qty * rate),
          previousCostPrice: it.previousCostPrice
        };
      });

    const billTotal = finalPO.totalLandedCost || distribution.totalLandedCost || purchaseItems.reduce((s, it) => s + it.totalPrice, 0);
    const amountPaid = Number(finalPO.amountPaid) || 0;
    const balanceDue = Math.max(0, billTotal - amountPaid);
    const paymentStatus: 'paid' | 'partial' | 'unpaid' = 
      amountPaid >= billTotal && billTotal > 0 ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid');

    const poPurchase: Purchase = {
      id: existingPurchaseIndex >= 0 ? updatedPurchases[existingPurchaseIndex].id : purchaseId,
      billNumber: finalPO.billNumber || finalPO.poNumber,
      vendorId: finalPO.vendorId,
      vendorName: finalPO.vendorName,
      date: receivingDate,
      items: purchaseItems,
      subtotal: distribution.subtotalBaseCost || billTotal,
      totalAmount: billTotal,
      amountPaid: amountPaid,
      balanceDue: balanceDue,
      paymentStatus: paymentStatus,
      updatePricesInInventory: true,
      notes: finalPO.notes 
        ? `Purchase from PO #${finalPO.poNumber}${finalPO.biltyNumber ? ` (Bilty: ${finalPO.biltyNumber})` : ''} - ${finalPO.notes}`
        : `Purchase generated from completed PO #${finalPO.poNumber}${finalPO.biltyNumber ? ` (Bilty: ${finalPO.biltyNumber})` : ''}`,
      poId: finalPO.id,
      poNumber: finalPO.poNumber,
      biltyNumber: finalPO.biltyNumber,
      transporterName: finalPO.transporterName,
      cargoCost: finalPO.cargoCost,
      cargoCostPerUnit: finalPO.cargoCostPerUnit,
      createdAt: existingPurchaseIndex >= 0 ? (updatedPurchases[existingPurchaseIndex].createdAt || receivingDate) : receivingDate,
      updatedAt: now
    };

    if (existingPurchaseIndex >= 0) {
      const existing = updatedPurchases[existingPurchaseIndex];
      updatedPurchases[existingPurchaseIndex] = {
        ...existing,
        ...poPurchase,
        hasReturns: existing.hasReturns,
        returnsList: existing.returnsList,
        totalReturnedAmount: existing.totalReturnedAmount,
        netAmount: existing.netAmount,
        netBalanceDue: existing.netBalanceDue,
        returnedItemsCount: existing.returnedItemsCount
      };
    } else {
      updatedPurchases = [poPurchase, ...updatedPurchases];
    }
  }

  // Persist all updates
  saveStoredProducts(updatedProducts);
  saveStoredPurchaseOrders(updatedPOs);
  saveStoredVendors(updatedVendors);
  saveStoredVendorLedger(updatedLedger);
  saveStoredPurchases(updatedPurchases);

  return {
    updatedProducts,
    updatedPOs,
    updatedVendors,
    updatedLedger,
    updatedLedgerEntries: updatedLedger,
    updatedPurchases
  };
}

/**
 * Deletes a Purchase Order and optionally rolls back physical stock if received.
 */
export function deletePurchaseOrderAndUpdateAll(
  poId: string,
  currentPOs: PurchaseOrder[],
  currentProducts: Product[],
  currentVendors: Vendor[],
  currentLedger: VendorLedgerEntry[],
  rollbackStock: boolean = true,
  currentPurchases?: Purchase[]
): {
  updatedProducts: Product[];
  updatedPOs: PurchaseOrder[];
  updatedVendors: Vendor[];
  updatedLedger: VendorLedgerEntry[];
  updatedLedgerEntries: VendorLedgerEntry[];
  updatedPurchases: Purchase[];
} {
  const poToDelete = currentPOs.find(p => p.id === poId);
  const allPurchases = currentPurchases && currentPurchases.length > 0 ? currentPurchases : getStoredPurchases();

  if (!poToDelete) {
    return {
      updatedProducts: currentProducts,
      updatedPOs: currentPOs,
      updatedVendors: currentVendors,
      updatedLedger: currentLedger,
      updatedLedgerEntries: currentLedger,
      updatedPurchases: allPurchases
    };
  }

  let updatedProducts = [...currentProducts];

  // Rollback stock if stock was physically received
  if (rollbackStock && poToDelete.isStockReceived) {
    updatedProducts = currentProducts.map(prod => {
      const item = poToDelete.items.find(it => it.productId === prod.id);
      if (!item) return prod;

      const recQty = Number(item.receivedQuantity) || 0;
      if (recQty <= 0) return prod;

      const currentStock = prod.stockQuantity || 0;
      const newStock = Math.max(0, currentStock - recQty);

      saveStockLog({
        id: `log-del-po-${Date.now()}-${prod.id}`,
        productId: prod.id,
        productName: prod.name,
        internalId: prod.internalId,
        brandName: prod.brandName,
        typeName: prod.typeName,
        unit: prod.unit,
        change: -recQty,
        previousStock: currentStock,
        newStock,
        reason: 'Adjustment',
        movementType: 'delete_rollback',
        referenceId: poToDelete.id,
        referenceNumber: poToDelete.poNumber,
        entityName: poToDelete.vendorName,
        unitRate: Number(item.landedUnitCost || item.actualUnitPrice || item.estimatedUnitPrice || 0),
        totalMovementValue: Math.round(recQty * Number(item.landedUnitCost || item.actualUnitPrice || item.estimatedUnitPrice || 0)),
        locationName: prod.locationName,
        cabinNumber: prod.cabinNumber,
        timestamp: new Date().toISOString(),
        notes: `Rollback stock from deleted PO ${poToDelete.poNumber} (-${recQty} ${prod.unit})`,
      });

      return {
        ...prod,
        stockQuantity: newStock,
        updatedAt: new Date().toISOString()
      };
    });
  }

  // Remove PO
  const updatedPOs = currentPOs.filter(p => p.id !== poId);

  // Remove any ledger entries linked to this PO
  const updatedLedger = currentLedger.filter(e => e.referenceId !== poId && e.id !== `PUR-${poId}` && e.id !== `CSH-PO-${poId}`);

  // Remove linked Purchase if any
  const updatedPurchases = allPurchases.filter(p => 
    p.poId !== poId && 
    p.id !== `PUR-${poId}` && 
    p.id !== `PUR-${poId.replace(/^PO-/, '')}` && 
    p.id !== poId
  );

  // Persist
  saveStoredProducts(updatedProducts);
  saveStoredPurchaseOrders(updatedPOs);
  saveStoredVendors(currentVendors);
  saveStoredVendorLedger(updatedLedger);
  saveStoredPurchases(updatedPurchases);

  return {
    updatedProducts,
    updatedPOs,
    updatedVendors: currentVendors,
    updatedLedger,
    updatedLedgerEntries: updatedLedger,
    updatedPurchases
  };
}

// ----------------------------------------------------
// Customer Demands & Backorders
// ----------------------------------------------------

export function getInitialDemandsSeed(): Demand[] {
  return [];
}

export function getStoredDemands(): Demand[] {
  try {
    const raw = localStorage.getItem(DEMANDS_KEY);
    if (!raw) {
      const initial = getInitialDemandsSeed();
      saveStoredDemands(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const initial = getInitialDemandsSeed();
      saveStoredDemands(initial);
      return initial;
    }
    return parsed;
  } catch (error) {
    console.error('Error reading demands from localStorage:', error);
    return getInitialDemandsSeed();
  }
}

export function saveStoredDemands(demands: Demand[]): void {
  try {
    localStorage.setItem(DEMANDS_KEY, JSON.stringify(demands));
  } catch (error) {
    console.error('Error saving demands to localStorage:', error);
  }
}

export function getNextDemandId(demands?: Demand[]): { id: string; demandNumber: string } {
  const list = demands || getStoredDemands() || [];
  let maxNum = 1000;
  (list || []).forEach(d => {
    const numMatch = d.id?.match(/\d+/) || d.demandNumber?.match(/\d+/);
    if (numMatch) {
      const parsed = parseInt(numMatch[0], 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  });
  const nextNum = maxNum + 1;
  const numStr = `DMD-${nextNum}`;
  return { id: numStr, demandNumber: numStr };
}

export function saveDemand(
  demandData: Partial<Demand>,
  existingDemands?: Demand[]
): { updatedDemands: Demand[]; savedDemand: Demand } {
  const currentDemands = existingDemands || getStoredDemands();
  const now = new Date().toISOString();

  let savedDemand: Demand;

  if (demandData.id) {
    // Edit existing demand
    const idx = currentDemands.findIndex(d => d.id === demandData.id);
    if (idx >= 0) {
      savedDemand = {
        ...currentDemands[idx],
        ...demandData,
        updatedAt: now
      } as Demand;
      const updated = [...currentDemands];
      updated[idx] = savedDemand;
      saveStoredDemands(updated);
      return { updatedDemands: updated, savedDemand };
    }
  }

  // Create new demand
  const { id, demandNumber } = getNextDemandId(currentDemands);
  savedDemand = {
    id: demandData.id || id,
    demandNumber: demandData.demandNumber || demandNumber,
    customerName: demandData.customerName?.trim() || 'Valued Customer',
    customerPhone: demandData.customerPhone?.trim() || undefined,
    location: demandData.location?.trim() || undefined,
    customerId: demandData.customerId,
    itemName: demandData.itemName?.trim() || 'Item Demand',
    productId: demandData.productId,
    itemDetails: demandData.itemDetails?.trim() || undefined,
    notes: demandData.notes?.trim() || undefined,
    quantity: Math.max(1, Number(demandData.quantity) || 1),
    unit: demandData.unit || 'Pcs',
    targetPrice: demandData.targetPrice !== undefined && Number(demandData.targetPrice) > 0 ? Number(demandData.targetPrice) : undefined,
    requiredDate: demandData.requiredDate || undefined,
    status: demandData.status || 'pending',
    unfulfillableReason: demandData.unfulfillableReason?.trim() || undefined,
    cancellationReason: demandData.cancellationReason?.trim() || undefined,
    fulfilledSaleId: demandData.fulfilledSaleId,
    fulfilledAt: demandData.fulfilledAt,
    createdAt: demandData.createdAt || now,
    updatedAt: now
  };

  const updatedDemands = [savedDemand, ...currentDemands];
  saveStoredDemands(updatedDemands);
  return { updatedDemands, savedDemand };
}

export function deleteDemand(
  demandId: string,
  existingDemands?: Demand[]
): { updatedDemands: Demand[] } {
  const currentDemands = existingDemands || getStoredDemands();
  const updatedDemands = currentDemands.filter(d => d.id !== demandId);
  saveStoredDemands(updatedDemands);
  return { updatedDemands };
}

export function updateDemandStatus(
  demandId: string,
  status: DemandStatus,
  extra?: {
    unfulfillableReason?: string;
    cancellationReason?: string;
    fulfilledSaleId?: string;
    fulfilledAt?: string;
  },
  existingDemands?: Demand[]
): { updatedDemands: Demand[]; updatedDemand?: Demand } {
  const currentDemands = existingDemands || getStoredDemands();
  const now = new Date().toISOString();

  let targetDemand: Demand | undefined;

  const updatedDemands = currentDemands.map(d => {
    if (d.id !== demandId) return d;
    
    targetDemand = {
      ...d,
      status,
      unfulfillableReason: status === 'unfulfillable' ? (extra?.unfulfillableReason || d.unfulfillableReason || 'Item unavailable / not found in market') : (status === 'pending' ? undefined : d.unfulfillableReason),
      cancellationReason: status === 'cancelled' ? (extra?.cancellationReason || d.cancellationReason || 'Cancelled by customer') : (status === 'pending' ? undefined : d.cancellationReason),
      fulfilledSaleId: status === 'fulfilled' ? (extra?.fulfilledSaleId || d.fulfilledSaleId) : (status === 'pending' ? undefined : d.fulfilledSaleId),
      fulfilledAt: status === 'fulfilled' ? (extra?.fulfilledAt || now) : (status === 'pending' ? undefined : d.fulfilledAt),
      updatedAt: now
    };
    return targetDemand;
  });

  saveStoredDemands(updatedDemands);
  return { updatedDemands, updatedDemand: targetDemand };
}

// ----------------------------------------------------------------------------
// OPERATING EXPENSES STORAGE & LEDGER HELPERS
// ----------------------------------------------------------------------------

export const INITIAL_EXPENSES: Expense[] = [];

export function getStoredExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(EXPENSES_KEY);
    if (!raw) {
      saveStoredExpenses(INITIAL_EXPENSES);
      return INITIAL_EXPENSES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_EXPENSES;
  } catch (error) {
    console.error('Failed to parse stored expenses:', error);
    return INITIAL_EXPENSES;
  }
}

export function saveStoredExpenses(expenses: Expense[]): void {
  try {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
  } catch (error) {
    console.error('Failed to save expenses to localStorage:', error);
  }
}

export function getNextExpenseNumber(existingExpenses?: Expense[]): string {
  const list = existingExpenses || getStoredExpenses();
  if (list.length === 0) return 'EXP-1001';
  
  const numbers = list.map(e => {
    const match = e.expenseNumber?.match(/EXP-(\d+)/i) || e.id?.match(/exp-(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
  }).filter(n => !isNaN(n) && n > 0);
  
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 1000;
  return `EXP-${maxNumber + 1}`;
}

export function saveExpense(
  expenseData: Partial<Expense>,
  existingExpenses?: Expense[]
): { updatedExpenses: Expense[]; savedExpense: Expense } {
  const currentExpenses = existingExpenses || getStoredExpenses();
  const now = new Date().toISOString();

  if (expenseData.id) {
    const index = currentExpenses.findIndex(e => e.id === expenseData.id);
    if (index !== -1) {
      const updatedExpense: Expense = {
        ...currentExpenses[index],
        ...expenseData,
        amount: Math.max(0, Number(expenseData.amount) || 0),
        updatedAt: now
      };
      const updatedExpenses = [...currentExpenses];
      updatedExpenses[index] = updatedExpense;
      saveStoredExpenses(updatedExpenses);
      return { updatedExpenses, savedExpense: updatedExpense };
    }
  }

  const expenseNumber = getNextExpenseNumber(currentExpenses);
  const newId = `exp-${Date.now()}`;
  const savedExpense: Expense = {
    id: newId,
    expenseNumber: expenseData.expenseNumber || expenseNumber,
    title: expenseData.title?.trim() || 'General Expense',
    category: (expenseData.category as ExpenseCategory) || 'Miscellaneous',
    amount: Math.max(0, Number(expenseData.amount) || 0),
    date: expenseData.date || now.split('T')[0],
    paymentMethod: expenseData.paymentMethod || 'Cash',
    paidTo: expenseData.paidTo?.trim() || undefined,
    receiptNumber: expenseData.receiptNumber?.trim() || undefined,
    notes: expenseData.notes?.trim() || undefined,
    createdAt: expenseData.createdAt || now,
    updatedAt: now
  };

  const updatedExpenses = [savedExpense, ...currentExpenses];
  saveStoredExpenses(updatedExpenses);
  return { updatedExpenses, savedExpense };
}

export function deleteExpense(
  expenseId: string,
  existingExpenses?: Expense[]
): { updatedExpenses: Expense[] } {
  const currentExpenses = existingExpenses || getStoredExpenses();
  const updatedExpenses = currentExpenses.filter(e => e.id !== expenseId);
  saveStoredExpenses(updatedExpenses);
  return { updatedExpenses };
}






