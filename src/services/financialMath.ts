/**
 * Precision Financial Mathematics & Decimal Handling Engine
 * 
 * Eradicates IEEE 754 floating-point rounding errors (e.g., 0.1 + 0.2 = 0.30000000000000004)
 * across all currency, discount, tax, quantity, and ledger balance calculations.
 */

// Number of decimal places for standard financial currency (PKR/USD/EUR/etc.)
export const FINANCIAL_DECIMALS = 2;

// Number of decimal places for intermediate unit costs, dimensions, and weights
export const UNIT_COST_DECIMALS = 4;
export const QUANTITY_DECIMALS = 3;

/**
 * Safely parses any value to a finite number.
 * Returns fallback (default 0) if invalid, null, undefined, or NaN.
 */
export function safeFinancialNumber(val: unknown, fallback: number = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  const num = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Robust decimal rounding using exponential notation or EPSILON to prevent float rounding bugs.
 * Example: roundFinancial(1.005, 2) -> 1.01 (whereas Math.round(1.005 * 100) / 100 gives 1.00 in plain JS)
 */
export function roundFinancial(value: unknown, decimals: number = FINANCIAL_DECIMALS): number {
  const num = safeFinancialNumber(value, 0);
  if (!Number.isFinite(num) || num === 0) return 0;
  
  const factor = Math.pow(10, decimals);
  // Using EPSILON offset to handle floating point jitter at half-way boundaries
  const sign = num < 0 ? -1 : 1;
  const absVal = Math.abs(num);
  return sign * (Math.round((absVal + Number.EPSILON) * factor) / factor);
}

/**
 * Rounds a currency value to standard financial precision (2 decimal places).
 */
export function roundCurrency(value: unknown): number {
  return roundFinancial(value, FINANCIAL_DECIMALS);
}

/**
 * Rounds inventory quantity to safe precision (default 3 decimals for fractional units, 0 for integers).
 */
export function roundQuantity(qty: unknown, decimals: number = 2): number {
  return roundFinancial(qty, decimals);
}

/**
 * Exact decimal addition for arbitrary arguments.
 * Avoids 0.1 + 0.2 = 0.30000000000000004
 */
export function addFinancial(...values: unknown[]): number {
  const factor = 100; // Work in integer cents/paisa
  let totalCents = 0;
  for (const v of values) {
    const num = safeFinancialNumber(v, 0);
    totalCents += Math.round((num + Number.EPSILON) * factor);
  }
  return totalCents / factor;
}

/**
 * Exact decimal subtraction: a - b
 */
export function subtractFinancial(a: unknown, b: unknown): number {
  const factor = 100;
  const aCents = Math.round((safeFinancialNumber(a, 0) + Number.EPSILON) * factor);
  const bCents = Math.round((safeFinancialNumber(b, 0) + Number.EPSILON) * factor);
  return (aCents - bCents) / factor;
}

/**
 * Exact decimal multiplication for quantity and price with precise decimal rounding.
 */
export function multiplyFinancial(
  quantity: unknown,
  unitPrice: unknown,
  decimals: number = FINANCIAL_DECIMALS
): number {
  const q = safeFinancialNumber(quantity, 0);
  const p = safeFinancialNumber(unitPrice, 0);
  if (q === 0 || p === 0) return 0;
  return roundFinancial(q * p, decimals);
}

/**
 * Exact decimal division with safe guard against zero/infinity.
 */
export function divideFinancial(
  numerator: unknown,
  denominator: unknown,
  decimals: number = UNIT_COST_DECIMALS
): number {
  const num = safeFinancialNumber(numerator, 0);
  const den = safeFinancialNumber(denominator, 0);
  if (den === 0) return 0;
  return roundFinancial(num / den, decimals);
}

/**
 * Precise Line Item Calculation:
 * Gross = Quantity * UnitPrice
 * Discount = Gross * (DiscountPercent / 100) OR fixed amount
 * Net = Gross - Discount
 */
export function calculateLineItemFinancials(
  quantity: unknown,
  unitPrice: unknown,
  discountPercent?: unknown,
  itemDiscountAmount?: unknown
): {
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
} {
  const qty = Math.max(0, safeFinancialNumber(quantity, 0));
  const price = Math.max(0, safeFinancialNumber(unitPrice, 0));
  const gross = multiplyFinancial(qty, price);

  let discount = 0;
  const pct = safeFinancialNumber(discountPercent, 0);
  const fixed = safeFinancialNumber(itemDiscountAmount, 0);

  if (pct > 0) {
    const clampedPct = Math.min(100, pct);
    discount = roundCurrency((gross * clampedPct) / 100);
  } else if (fixed > 0) {
    discount = Math.min(gross, roundCurrency(fixed));
  }

  const net = Math.max(0, subtractFinancial(gross, discount));

  return {
    grossAmount: gross,
    discountAmount: discount,
    netAmount: net,
  };
}

/**
 * Calculates discount amount and final total from a subtotal.
 */
export function calculateOrderDiscount(
  subtotal: unknown,
  discountType: 'percentage' | 'amount' | string,
  discountValue: unknown
): {
  discountAmount: number;
  totalAfterDiscount: number;
} {
  const sub = Math.max(0, roundCurrency(subtotal));
  const val = Math.max(0, safeFinancialNumber(discountValue, 0));

  if (sub === 0 || val === 0) {
    return { discountAmount: 0, totalAfterDiscount: sub };
  }

  let discount = 0;
  if (discountType === 'percentage') {
    const pct = Math.min(100, val);
    discount = roundCurrency((sub * pct) / 100);
  } else {
    discount = Math.min(sub, roundCurrency(val));
  }

  const total = Math.max(0, subtractFinancial(sub, discount));

  return {
    discountAmount: discount,
    totalAfterDiscount: total,
  };
}

/**
 * Calculates payment split: amount received vs total due.
 * Yields clean non-negative balanceDue, changeGiven, and paymentStatus.
 */
export function calculatePaymentBreakdown(
  totalDue: unknown,
  amountReceived: unknown
): {
  numericReceived: number;
  balanceDue: number;
  changeGiven: number;
  paymentType: 'cash' | 'partial' | 'credit';
  paymentStatus: 'paid' | 'partial' | 'credit';
} {
  const total = Math.max(0, roundCurrency(totalDue));
  const received = Math.max(0, roundCurrency(amountReceived));

  if (received >= total) {
    return {
      numericReceived: received,
      balanceDue: 0,
      changeGiven: subtractFinancial(received, total),
      paymentType: 'cash',
      paymentStatus: 'paid',
    };
  }

  if (received > 0) {
    return {
      numericReceived: received,
      balanceDue: subtractFinancial(total, received),
      changeGiven: 0,
      paymentType: 'partial',
      paymentStatus: 'partial',
    };
  }

  return {
    numericReceived: 0,
    balanceDue: total,
    changeGiven: 0,
    paymentType: 'credit',
    paymentStatus: 'credit',
  };
}

/**
 * Safe running balance update for ledger entries:
 * Balance = PreviousBalance + Debit - Credit (or opposite depending on perspective)
 */
export function updateRunningBalance(
  previousBalance: unknown,
  debit: unknown,
  credit: unknown
): number {
  const prev = roundCurrency(previousBalance);
  const d = roundCurrency(debit);
  const c = roundCurrency(credit);
  return roundCurrency(prev + d - c);
}
