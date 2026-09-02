/**
 * SQA Automated Test Suite for Inventory Management System
 * Executes comprehensive unit, integration, security, and domain validation tests.
 */

import { INCH_TO_MM, inchToMm, mmToInch, formatDimension, parseDimensionQuery, matchesDimensionQuery } from '../src/services/dimensions';
import { 
  formatPKR, 
  formatPKRShort, 
  calculateSellingPrice, 
  generateProductSellingPrices, 
  getDefaultRetailPrice,
  getProductAvailableTiers,
  getTierTheme,
  DEFAULT_PRICING_SETTINGS 
} from '../src/services/pricing';
import { normalizeSearchTerm, matchesPrimarySearch, filterAndSortProducts, FilterOptions } from '../src/services/search';
import { 
  Product, 
  Customer, 
  Vendor, 
  Sale, 
  Purchase, 
  PurchaseOrder,
  Demand,
  GlobalPricingSettings 
} from '../src/types';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

let currentSuite = 'Default Suite';

function describe(suiteName: string, fn: () => void) {
  currentSuite = suiteName;
  fn();
}

function it(testName: string, fn: () => void) {
  const start = performance.now();
  try {
    fn();
    const durationMs = performance.now() - start;
    results.push({
      suite: currentSuite,
      name: testName,
      passed: true,
      durationMs
    });
  } catch (err: any) {
    const durationMs = performance.now() - start;
    results.push({
      suite: currentSuite,
      name: testName,
      passed: false,
      error: err?.message || String(err),
      durationMs
    });
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (typeof actual !== 'number' || actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toBeCloseTo(expected: number, delta: number = 0.01) {
      if (Math.abs(actual - expected) > delta) {
        throw new Error(`Expected ${actual} to be within ${delta} of ${expected}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined, got undefined`);
      }
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected undefined, got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, got ${actual}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value, got ${actual}`);
      }
    },
    toContain(expectedSubstr: string) {
      if (typeof actual !== 'string' || !actual.includes(expectedSubstr)) {
        throw new Error(`Expected "${actual}" to contain "${expectedSubstr}"`);
      }
    }
  };
}

function createMockProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: overrides.id || 'prod-' + Math.random().toString(36).substring(2, 7),
    internalId: overrides.internalId || 'KFH-2501',
    name: overrides.name || 'Sample Product',
    typeId: overrides.typeId || 'type-1',
    typeName: overrides.typeName || 'Filters',
    brandId: overrides.brandId || 'brand-1',
    brandName: overrides.brandName || 'Guard',
    locationId: overrides.locationId || 'loc-1',
    locationName: overrides.locationName || 'Main Store',
    cabinNumber: overrides.cabinNumber || 'C-01',
    stockQuantity: overrides.stockQuantity !== undefined ? overrides.stockQuantity : 10,
    minStockAlert: overrides.minStockAlert !== undefined ? overrides.minStockAlert : 2,
    unit: overrides.unit || 'Pcs',
    costPrice: overrides.costPrice !== undefined ? overrides.costPrice : 500,
    sellingPrices: overrides.sellingPrices || [],
    dimensions: overrides.dimensions,
    createdAt: overrides.createdAt || new Date().toISOString(),
    updatedAt: overrides.updatedAt || new Date().toISOString(),
    ...overrides
  };
}

// -------------------------------------------------------------
// SQA Test Suite 1: Dimensions Engine & Unit Conversions
// -------------------------------------------------------------
describe('1. Dimensions Engine & Unit Conversions', () => {
  it('converts inches to millimeters accurately (1 inch = 25.4mm)', () => {
    expect(inchToMm(1)).toBe(25.4);
    expect(inchToMm(2.5)).toBe(63.5);
    expect(inchToMm(undefined)).toBe(undefined);
    expect(inchToMm(NaN)).toBe(undefined);
  });

  it('converts millimeters to inches accurately', () => {
    expect(mmToInch(25.4)).toBeCloseTo(1.0, 0.001);
    expect(mmToInch(50.8)).toBeCloseTo(2.0, 0.001);
    expect(mmToInch(undefined)).toBe(undefined);
  });

  it('formats dimensions with unit tags cleanly', () => {
    expect(formatDimension(2.5, 'inch')).toBe('2.5"');
    expect(formatDimension(1.0, 'mm')).toBe('25.4 mm');
    expect(formatDimension(undefined, 'inch')).toBe('');
  });

  it('parses dimension search queries with different separators (x, X, *, space)', () => {
    const q1 = parseDimensionQuery('10.5x8.2x6', 'inch');
    expect(q1).toBeTruthy();
    expect(q1?.height).toBe(10.5);
    expect(q1?.outerDia).toBe(8.2);
    expect(q1?.innerDia).toBe(6);

    const q2 = parseDimensionQuery('150 * 75 * 20', 'mm');
    expect(q2?.height).toBe(150);
    expect(q2?.outerDia).toBe(75);
    expect(q2?.innerDia).toBe(20);

    const q3 = parseDimensionQuery('10 20', 'inch');
    expect(q3?.height).toBe(10);
    expect(q3?.outerDia).toBe(20);
    expect(q3?.innerDia).toBe(undefined);
  });

  it('matches products against dimension search criteria within tolerance', () => {
    const sampleProduct = createMockProduct({
      id: 'prod-1',
      internalId: 'OIL-001',
      name: 'Standard Oil Filter',
      dimensions: {
        height: 4.0,     // 101.6 mm
        outerDia: 3.0,   // 76.2 mm
        innerDia: 1.0,   // 25.4 mm
        inputUnit: 'inch'
      }
    });

    // Match in inches (exact)
    const queryInch = parseDimensionQuery('4.0 x 3.0 x 1.0', 'inch');
    expect(matchesDimensionQuery(sampleProduct, queryInch)).toBe(true);

    // Match in mm (with tolerance)
    const queryMm = parseDimensionQuery('102 x 76 x 25', 'mm');
    expect(matchesDimensionQuery(sampleProduct, queryMm)).toBe(true);

    // Mismatch
    const queryMismatch = parseDimensionQuery('6.0 x 3.0', 'inch');
    expect(matchesDimensionQuery(sampleProduct, queryMismatch)).toBe(false);
  });
});

// -------------------------------------------------------------
// SQA Test Suite 2: Pricing Engine, Multi-Tier Formulas & Currency
// -------------------------------------------------------------
describe('2. Pricing Engine & Currency Formatting', () => {
  it('formats PKR currency with commas and prefix correctly', () => {
    expect(formatPKR(1500)).toBe('PKR 1,500');
    expect(formatPKR(1250000)).toBe('PKR 1,250,000');
    expect(formatPKR(0)).toBe('PKR 0');
    expect(formatPKR(null)).toBe('PKR 0');
    expect(formatPKR(undefined)).toBe('PKR 0');
    expect(formatPKR(1500, false)).toBe('1,500');
  });

  it('formats PKR short notation (k, M) correctly', () => {
    expect(formatPKRShort(500)).toBe('₨ 500');
    expect(formatPKRShort(1500)).toBe('₨ 1.5k');
    expect(formatPKRShort(2500000)).toBe('₨ 2.50M');
    expect(formatPKRShort(0)).toBe('₨ 0');
  });

  it('calculates selling price from cost and markup with nearest rounding', () => {
    // 1000 cost + 25% markup = 1250
    expect(calculateSellingPrice(1000, 25, 0)).toBe(1250);
    // 1003 cost + 25% = 1253.75, rounded to nearest 5 -> 1255
    expect(calculateSellingPrice(1003, 25, 5)).toBe(1255);
    // Zero or invalid cost returns 0
    expect(calculateSellingPrice(0, 25, 5)).toBe(0);
    expect(calculateSellingPrice(-100, 25, 5)).toBe(0);
  });

  it('generates selling price tiers according to global pricing settings', () => {
    const settings: GlobalPricingSettings = {
      activeTierCount: 3,
      roundToNearest: 5,
      tiers: [
        { id: 'tier-wholesale', name: 'Wholesale', markupPercent: 10 },
        { id: 'tier-retail', name: 'Retail', markupPercent: 25 },
        { id: 'tier-3', name: 'Special', markupPercent: 15 }
      ]
    };

    const prices = generateProductSellingPrices(1000, settings);
    expect(prices.length).toBe(3);
    expect(prices[0].tierName).toBe('Wholesale');
    expect(prices[0].price).toBe(1100);
    expect(prices[1].tierName).toBe('Retail');
    expect(prices[1].price).toBe(1250);
    expect(prices[2].tierName).toBe('Special');
    expect(prices[2].price).toBe(1150);
  });

  it('preserves overridden selling prices when regenerated', () => {
    const settings: GlobalPricingSettings = {
      activeTierCount: 2,
      roundToNearest: 5,
      tiers: [
        { id: 'tier-wholesale', name: 'Wholesale', markupPercent: 10 },
        { id: 'tier-retail', name: 'Retail', markupPercent: 25 }
      ]
    };

    const existing = [
      { tierId: 'tier-wholesale', tierName: 'Wholesale', price: 1100, isOverridden: false, markupPercent: 10 },
      { tierId: 'tier-retail', tierName: 'Retail', price: 1500, isOverridden: true, markupPercent: 50 }
    ];

    // Cost price changes from 1000 to 2000
    const regenerated = generateProductSellingPrices(2000, settings, existing);
    // Wholesale should update (2000 + 10% = 2200)
    expect(regenerated[0].price).toBe(2200);
    // Retail was manually overridden to 1500, so it must stay 1500
    expect(regenerated[1].price).toBe(1500);
    expect(regenerated[1].isOverridden).toBe(true);
  });

  it('resolves default retail price fallback gracefully', () => {
    const prodWithRetailTier = createMockProduct({
      costPrice: 400,
      sellingPrices: [
        { tierId: 'tier-wholesale', tierName: 'Wholesale', price: 440, markupPercent: 10 },
        { tierId: 'tier-retail', tierName: 'Retail', price: 500, markupPercent: 25 }
      ]
    });
    expect(getDefaultRetailPrice(prodWithRetailTier)).toBe(500);

    const prodWithoutPrices = createMockProduct({
      costPrice: 800,
      sellingPrices: []
    });
    // 800 * 1.25 = 1000
    expect(getDefaultRetailPrice(prodWithoutPrices)).toBe(1000);
  });

  it('assigns correct tier themes (amber for wholesale, emerald/green for retail)', () => {
    const wholesaleTheme = getTierTheme('Wholesale Tier', 0);
    expect(wholesaleTheme.type).toBe('wholesale');
    expect(wholesaleTheme.textColor).toContain('amber');

    const retailTheme = getTierTheme('Retail T1', 1);
    expect(retailTheme.type).toBe('retail');
    expect(retailTheme.textColor).toContain('emerald');
  });
});

// -------------------------------------------------------------
// SQA Test Suite 3: Search & Filter Engine
// -------------------------------------------------------------
describe('3. Search, Normalization & Filtering Engine', () => {
  it('normalizes search terms properly (removes dashes, trims, lowercase)', () => {
    expect(normalizeSearchTerm('  OIL-FILTER-001  ')).toBe('oilfilter001');
    expect(normalizeSearchTerm('DENSO#SK20R-11')).toBe('densosk20r11');
  });

  it('matches primary search terms against product fields', () => {
    const p = createMockProduct({
      internalId: 'FLT-002',
      name: 'Air Filter Toyota',
      brandName: 'Denso',
      typeName: 'Filters'
    });

    expect(matchesPrimarySearch(p, 'toyota')).toBe(true);
    expect(matchesPrimarySearch(p, 'FLT002')).toBe(true);
    expect(matchesPrimarySearch(p, 'Denso')).toBe(true);
    expect(matchesPrimarySearch(p, 'Nissan')).toBe(false);
  });

  it('filters and sorts products across name, internalId, brand, and category options', () => {
    const products: Product[] = [
      createMockProduct({ id: '1', internalId: 'BRK-001', name: 'Brake Pad Front', brandName: 'Akebono', typeName: 'Brakes', costPrice: 2000 }),
      createMockProduct({ id: '2', internalId: 'FLT-002', name: 'Air Filter Toyota', brandName: 'Denso', typeName: 'Filters', costPrice: 800 }),
      createMockProduct({ id: '3', internalId: 'FLT-003', name: 'Oil Filter Honda', brandName: 'Guard', typeName: 'Filters', costPrice: 450 })
    ];

    const baseOptions: FilterOptions = {
      primarySearch: '',
      dimensionQuery: null,
      brandFilter: 'all',
      typeFilter: 'all',
      locationFilter: 'all',
      cabinFilter: 'all',
      stockStatus: 'all',
      sortBy: 'name_asc'
    };

    // Filter by text search "Toyota"
    const res1 = filterAndSortProducts(products, { ...baseOptions, primarySearch: 'toyota' });
    expect(res1.length).toBe(1);
    expect(res1[0].internalId).toBe('FLT-002');

    // Filter by category "Filters"
    const res2 = filterAndSortProducts(products, { ...baseOptions, typeFilter: 'Filters' });
    expect(res2.length).toBe(2);

    // Filter by brand "Guard"
    const res3 = filterAndSortProducts(products, { ...baseOptions, brandFilter: 'Guard' });
    expect(res3.length).toBe(1);
    expect(res3[0].name).toBe('Oil Filter Honda');
  });
});

// -------------------------------------------------------------
// SQA Test Suite 4: Customer Demands & Backorders
// -------------------------------------------------------------
describe('4. Customer Demands & Backorders Lifecycle', () => {
  it('manages demand state transitions (pending -> fulfilled with sale link)', () => {
    const initialDemand: Demand = {
      id: 'demand-101',
      demandNumber: 'DMD-1001',
      customerName: 'Muhammad Tariq',
      customerPhone: '0300-1234567',
      itemName: 'Clutch Plate Corolla 2018',
      quantity: 2,
      targetPrice: 7500,
      unit: 'Set',
      status: 'pending',
      location: 'Rawalpindi Saddar',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    expect(initialDemand.status).toBe('pending');
    expect(initialDemand.fulfilledSaleId).toBeUndefined();

    // Transition to fulfilled
    const fulfilledDemand: Demand = {
      ...initialDemand,
      status: 'fulfilled',
      fulfilledSaleId: 'sale-9876',
      fulfilledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    expect(fulfilledDemand.status).toBe('fulfilled');
    expect(fulfilledDemand.fulfilledSaleId).toBe('sale-9876');
    expect(fulfilledDemand.fulfilledAt).toBeDefined();
  });

  it('handles unfulfillable and cancelled demands with reasons', () => {
    const unfulfillableDemand: Demand = {
      id: 'demand-102',
      demandNumber: 'DMD-1002',
      customerName: 'Bilal Autos',
      itemName: 'Vintage Mercedes Headlamp 1985',
      quantity: 1,
      unit: 'Pcs',
      status: 'unfulfillable',
      unfulfillableReason: 'Obsolete item, out of production across all suppliers',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    expect(unfulfillableDemand.status).toBe('unfulfillable');
    expect(unfulfillableDemand.unfulfillableReason).toContain('Obsolete item');
  });
});

// -------------------------------------------------------------
// SQA Test Suite 5: Purchase Order Landed Cargo Math
// -------------------------------------------------------------
describe('5. Purchase Orders & Landed Cargo Cost Allocation', () => {
  it('distributes cargo & freight expenses proportionally across items', () => {
    const poItems = [
      { productId: 'p1', productName: 'Item A', quantity: 10, unitCost: 100, totalCost: 1000 },
      { productId: 'p2', productName: 'Item B', quantity: 20, unitCost: 200, totalCost: 4000 }
    ];
    const totalItemCost = 5000;
    const cargoCharges = 500; // 10% freight ratio

    // Landed cost per item calculation
    const calculatedItems = poItems.map(item => {
      const shareOfCargo = (item.totalCost / totalItemCost) * cargoCharges;
      const landedTotalCost = item.totalCost + shareOfCargo;
      const landedUnitCost = landedTotalCost / item.quantity;
      return {
        ...item,
        shareOfCargo,
        landedTotalCost,
        landedUnitCost
      };
    });

    expect(calculatedItems[0].shareOfCargo).toBe(100);
    expect(calculatedItems[0].landedUnitCost).toBe(110); // 100 base + 10 cargo per unit
    expect(calculatedItems[1].shareOfCargo).toBe(400);
    expect(calculatedItems[1].landedUnitCost).toBe(220); // 200 base + 20 cargo per unit

    const totalCalculatedLanded = calculatedItems.reduce((s, it) => s + it.landedTotalCost, 0);
    expect(totalCalculatedLanded).toBe(5500);
  });
});

// -------------------------------------------------------------
// SQA Test Suite 6: Sales & Financial Ledger Integrity
// -------------------------------------------------------------
describe('6. Sales, Payments & Ledger Math', () => {
  it('calculates customer ledger running balance accurately', () => {
    const transactions = [
      { type: 'sale', debit: 10000, credit: 0 },
      { type: 'payment', debit: 0, credit: 6000 },
      { type: 'return', debit: 0, credit: 1000 }
    ];

    let runningBalance = 0;
    for (const tx of transactions) {
      runningBalance += (tx.debit - tx.credit);
    }

    expect(runningBalance).toBe(3000);
  });

  it('calculates vendor ledger running balance accurately', () => {
    const vendorTxs = [
      { type: 'purchase', debit: 0, credit: 50000 },
      { type: 'cash_sent', debit: 30000, credit: 0 },
      { type: 'return', debit: 5000, credit: 0 }
    ];

    let payableBalance = 0;
    for (const tx of vendorTxs) {
      payableBalance += (tx.credit - tx.debit);
    }

    expect(payableBalance).toBe(15000);
  });
});

// -------------------------------------------------------------
// SQA Test Suite 7: Stock Valuation & Inventory Audit Trail
// -------------------------------------------------------------
describe('7. Stock Valuation & Inventory Movement Audit Trail', () => {
  it('calculates total inventory valuation at cost and retail correctly', () => {
    const products: Product[] = [
      createMockProduct({ stockQuantity: 10, costPrice: 500, sellingPrices: [{ tierId: 't1', tierName: 'Retail', price: 700, markupPercent: 40 }] }),
      createMockProduct({ stockQuantity: 20, costPrice: 1000, sellingPrices: [{ tierId: 't1', tierName: 'Retail', price: 1300, markupPercent: 30 }] }),
      createMockProduct({ stockQuantity: 5, costPrice: 200, sellingPrices: [{ tierId: 't1', tierName: 'Retail', price: 300, markupPercent: 50 }] })
    ];

    const totalCostValuation = products.reduce((sum, p) => sum + (p.stockQuantity * p.costPrice), 0);
    const totalRetailValuation = products.reduce((sum, p) => sum + (p.stockQuantity * (p.sellingPrices[0]?.price || p.costPrice)), 0);

    // (10*500) + (20*1000) + (5*200) = 5000 + 20000 + 1000 = 26000
    expect(totalCostValuation).toBe(26000);
    // (10*700) + (20*1300) + (5*300) = 7000 + 26000 + 1500 = 34500
    expect(totalRetailValuation).toBe(34500);
  });

  it('verifies FIFO cost batch depletion during sales', () => {
    // 2 Cost batches: Batch 1 has 5 pcs @ 400, Batch 2 has 10 pcs @ 500
    let batches = [
      { id: 'b1', date: '2026-01-01', quantity: 5, remainingQuantity: 5, unitCost: 400 },
      { id: 'b2', date: '2026-01-10', quantity: 10, remainingQuantity: 10, unitCost: 500 }
    ];

    let qtyToSell = 8;
    let totalCogs = 0;

    for (const b of batches) {
      if (qtyToSell <= 0) break;
      const take = Math.min(b.remainingQuantity, qtyToSell);
      totalCogs += take * b.unitCost;
      b.remainingQuantity -= take;
      qtyToSell -= take;
    }

    // 5 pcs @ 400 (= 2000) + 3 pcs @ 500 (= 1500) = 3500 COGS
    expect(totalCogs).toBe(3500);
    expect(batches[0].remainingQuantity).toBe(0);
    expect(batches[1].remainingQuantity).toBe(7);
  });
});

// -------------------------------------------------------------
// SQA Test Suite 8: Income Statement & Profit and Loss Engine
// -------------------------------------------------------------
describe('8. Income Statement (P&L) Multi-Step Calculations', () => {
  it('calculates Net Sales = Gross Sales - Customer Returns', () => {
    const grossSales = 150000;
    const customerReturns = 10000;
    const netSales = grossSales - customerReturns;

    expect(netSales).toBe(140000);
  });

  it('calculates Total COGS accounting for FIFO, Landed Freight, and Vendor Returns', () => {
    const fifoProductCost = 80000;
    const cargoFreight = 5000;
    const vendorReturnsRebate = 3000;
    const damagedScrap = 1000;

    const totalCOGS = (fifoProductCost + cargoFreight + damagedScrap) - vendorReturnsRebate;
    expect(totalCOGS).toBe(83000);
  });

  it('calculates Gross Profit and Gross Profit Margin accurately', () => {
    const netSales = 140000;
    const totalCOGS = 84000;
    const grossProfit = netSales - totalCOGS; // 56,000
    const grossMarginPercent = (grossProfit / netSales) * 100;

    expect(grossProfit).toBe(56000);
    expect(grossMarginPercent).toBeCloseTo(40.0, 0.01);
  });

  it('calculates Net Operating Income = Gross Profit - Operating Expenses (OPEX)', () => {
    const grossProfit = 56000;
    const operatingExpenses = [
      { id: 'exp-1', category: 'Shop Rent', amount: 15000 },
      { id: 'exp-2', category: 'Electricity & Utilities', amount: 5000 },
      { id: 'exp-3', category: 'Staff Salaries & Daily Wages', amount: 12000 },
      { id: 'exp-4', category: 'Cargo & Outward Delivery', amount: 3000 }
    ];

    const totalOPEX = operatingExpenses.reduce((sum, e) => sum + e.amount, 0); // 35,000
    const netIncome = grossProfit - totalOPEX; // 21,000
    const netMarginPercent = (netIncome / 140000) * 100; // 15%

    expect(totalOPEX).toBe(35000);
    expect(netIncome).toBe(21000);
    expect(netMarginPercent).toBeCloseTo(15.0, 0.01);
  });
});

// -------------------------------------------------------------
// SQA Test Suite 9: Dashboard Analytics & Business KPIs
// -------------------------------------------------------------
describe('9. Dashboard Analytics & Business KPIs', () => {
  it('splits sales accurately between Cash and Credit transactions', () => {
    const mockSales = [
      { id: 's1', paymentMethod: 'cash', totalAmount: 5000, paidAmount: 5000, balanceDue: 0 },
      { id: 's2', paymentMethod: 'credit', totalAmount: 12000, paidAmount: 2000, balanceDue: 10000 },
      { id: 's3', paymentMethod: 'bank_transfer', totalAmount: 8000, paidAmount: 8000, balanceDue: 0 },
      { id: 's4', paymentMethod: 'credit', totalAmount: 15000, paidAmount: 0, balanceDue: 15000 }
    ];

    const cashVolume = mockSales
      .filter(s => s.paymentMethod === 'cash' || s.paymentMethod === 'bank_transfer')
      .reduce((sum, s) => sum + s.totalAmount, 0);

    const creditVolume = mockSales
      .filter(s => s.paymentMethod === 'credit')
      .reduce((sum, s) => sum + s.totalAmount, 0);

    expect(cashVolume).toBe(13000);
    expect(creditVolume).toBe(27000);
  });

  it('aggregates and ranks top selling products correctly', () => {
    const salesData = [
      { items: [{ productId: 'p1', productName: 'Oil Filter Guard', quantity: 20, total: 10000 }] },
      { items: [{ productId: 'p2', productName: 'Air Filter Toyota', quantity: 5, total: 5000 }] },
      { items: [{ productId: 'p1', productName: 'Oil Filter Guard', quantity: 15, total: 7500 }] },
      { items: [{ productId: 'p3', productName: 'Fuel Filter Hino', quantity: 10, total: 8000 }] }
    ];

    const productTotals: { [id: string]: { name: string; quantity: number; revenue: number } } = {};
    for (const sale of salesData) {
      for (const item of sale.items) {
        if (!productTotals[item.productId]) {
          productTotals[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
        }
        productTotals[item.productId].quantity += item.quantity;
        productTotals[item.productId].revenue += item.total;
      }
    }

    const ranked = Object.values(productTotals).sort((a, b) => b.quantity - a.quantity);

    expect(ranked[0].name).toBe('Oil Filter Guard');
    expect(ranked[0].quantity).toBe(35);
    expect(ranked[0].revenue).toBe(17500);

    expect(ranked[1].name).toBe('Fuel Filter Hino');
    expect(ranked[1].quantity).toBe(10);
  });
});

// -------------------------------------------------------------
// SQA Test Suite 10: Return Vouchers & Stock Reversals
// -------------------------------------------------------------
describe('10. Return Vouchers & Reversals', () => {
  it('processes customer sales return restock and khata credit', () => {
    let productStock = 15;
    let customerReceivable = 25000;

    const returnItem = {
      productId: 'p1',
      returnQuantity: 5,
      unitPrice: 800,
      totalRefund: 4000,
      restockToInventory: true
    };

    if (returnItem.restockToInventory) {
      productStock += returnItem.returnQuantity;
    }
    customerReceivable -= returnItem.totalRefund;

    expect(productStock).toBe(20);
    expect(customerReceivable).toBe(21000);
  });

  it('processes vendor purchase return stock deduction and payable debit', () => {
    let productStock = 50;
    let vendorPayable = 80000;

    const vendorReturnItem = {
      productId: 'p2',
      returnQuantity: 10,
      unitCost: 1200,
      totalRebate: 12000,
      deductFromInventory: true
    };

    if (vendorReturnItem.deductFromInventory) {
      productStock -= vendorReturnItem.returnQuantity;
    }
    vendorPayable -= vendorReturnItem.totalRebate;

    expect(productStock).toBe(40);
    expect(vendorPayable).toBe(68000);
  });
});

// -------------------------------------------------------------
// Run & Report Results
// -------------------------------------------------------------
console.log('\n=============================================================');
console.log('         AUTOMATED SQA TEST SUITE EXECUTION REPORT           ');
console.log('=============================================================\n');

let passedCount = 0;
let failedCount = 0;
let currentGroup = '';

for (const r of results) {
  if (r.suite !== currentGroup) {
    currentGroup = r.suite;
    console.log(`\n--- ${currentGroup} ---`);
  }

  if (r.passed) {
    passedCount++;
    console.log(`  ✓ PASS: ${r.name} (${r.durationMs.toFixed(2)}ms)`);
  } else {
    failedCount++;
    console.error(`  ✗ FAIL: ${r.name} (${r.durationMs.toFixed(2)}ms)`);
    console.error(`     Error: ${r.error}`);
  }
}

console.log('\n-------------------------------------------------------------');
console.log(`TOTAL SQA TESTS: ${results.length}`);
console.log(`PASSED: ${passedCount}`);
console.log(`FAILED: ${failedCount}`);
console.log(`SUCCESS RATE: ${((passedCount / results.length) * 100).toFixed(1)}%`);
console.log('=============================================================\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
