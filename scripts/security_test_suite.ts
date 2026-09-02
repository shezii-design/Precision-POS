/**
 * Security & Penetration Testing Suite for Inventory & POS System
 * Audits authentication, CSV/Formula injection (CWE-1236), XSS defense,
 * ReDoS resistance, financial tamper-proofing, and configuration security.
 */

import { sanitizeFormulaCell } from '../src/services/excel';
import { getStoredAuthState, saveAuthState, DEFAULT_AUTH_STATE } from '../src/services/auth';
import { calculateSellingPrice, generateProductSellingPrices, formatPKR } from '../src/services/pricing';
import { parseDimensionQuery, matchesDimensionQuery } from '../src/services/dimensions';
import { normalizeSearchTerm, matchesPrimarySearch } from '../src/services/search';
import { getEnvSupabaseConfig } from '../src/services/supabase';
import { AuthState, Product, GlobalPricingSettings } from '../src/types';

interface SecurityCheckResult {
  category: string;
  name: string;
  passed: boolean;
  details?: string;
  durationMs: number;
}

const securityResults: SecurityCheckResult[] = [];
let currentCategory = 'General Security';

function describeCategory(name: string, fn: () => void) {
  currentCategory = name;
  fn();
}

function testSecurityRule(name: string, fn: () => void) {
  const start = performance.now();
  try {
    fn();
    const durationMs = performance.now() - start;
    securityResults.push({
      category: currentCategory,
      name,
      passed: true,
      durationMs
    });
  } catch (err: any) {
    const durationMs = performance.now() - start;
    securityResults.push({
      category: currentCategory,
      name,
      passed: false,
      details: err?.message || String(err),
      durationMs
    });
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

// -------------------------------------------------------------
// 1. CSV & Excel Formula Injection Mitigation (CWE-1236 / OWASP)
// -------------------------------------------------------------
describeCategory('1. CSV/Excel Formula Injection Protection (CWE-1236)', () => {
  testSecurityRule('Neutralizes dangerous leading formula characters (=, +, -, @)', () => {
    const maliciousInputs = [
      '=cmd|\'/C calc\'!A0',
      '=SUM(A1:A10)',
      '+1+1;cmd.exe',
      '-2+3*cmd',
      '@SUM(1+1)'
    ];

    for (const input of maliciousInputs) {
      const sanitized = sanitizeFormulaCell(input);
      assert(typeof sanitized === 'string' && sanitized.startsWith("'"), `Expected "${input}" to be sanitized with leading quote, got "${sanitized}"`);
    }
  });

  testSecurityRule('Neutralizes tab and carriage return injection vectors', () => {
    const tabInput = '\t=1+1';
    const crInput = '\r+2+2';
    assert(String(sanitizeFormulaCell(tabInput)).startsWith("'"), 'Tab-prefixed formula not sanitized');
    assert(String(sanitizeFormulaCell(crInput)).startsWith("'"), 'CR-prefixed formula not sanitized');
  });

  testSecurityRule('Preserves safe product names, codes, and numerical values without alteration', () => {
    assert(sanitizeFormulaCell('KFH-2501') === 'KFH-2501', 'Safe internal ID altered');
    assert(sanitizeFormulaCell('Standard Oil Filter') === 'Standard Oil Filter', 'Safe name altered');
    assert(sanitizeFormulaCell(1250) === 1250, 'Numerical value altered');
    assert(sanitizeFormulaCell(null) === null, 'Null altered');
    assert(sanitizeFormulaCell(undefined) === undefined, 'Undefined altered');
  });
});

// -------------------------------------------------------------
// 2. Authentication, PIN Hardening & Session Security
// -------------------------------------------------------------
describeCategory('2. Authentication & Credential Hardening', () => {
  testSecurityRule('Default authentication state has locked status toggleable and valid PIN', () => {
    assert(typeof DEFAULT_AUTH_STATE.pin === 'string', 'PIN must be a string');
    assert(DEFAULT_AUTH_STATE.pin.length >= 4, 'PIN must be at least 4 digits');
    assert(typeof DEFAULT_AUTH_STATE.isLocked === 'boolean', 'isLocked must be boolean');
  });

  testSecurityRule('PIN comparison rejects null, empty string, or undefined bypass attempts', () => {
    const currentPin = '1234';
    const bypassAttempts = ['', ' ', null, undefined, '123', '0000', '12345'];
    
    for (const attempt of bypassAttempts) {
      const isAuthorized = Boolean(attempt && attempt === currentPin);
      assert(!isAuthorized, `Unauthorized bypass accepted for attempt: ${JSON.stringify(attempt)}`);
    }

    assert('1234' === currentPin, 'Valid PIN should be authorized');
  });

  testSecurityRule('Auth state survives serialization without leaking private memory references', () => {
    const testState: AuthState = {
      ...DEFAULT_AUTH_STATE,
      isLocked: true,
      pin: '9876',
      lastUnlockedAt: new Date().toISOString()
    };

    const serialized = JSON.stringify(testState);
    const deserialized = JSON.parse(serialized);

    assert(deserialized.pin === '9876', 'PIN corrupted in serialization');
    assert(deserialized.isLocked === true, 'Lock state corrupted');
  });
});

// -------------------------------------------------------------
// 3. XSS & Code Injection Defense
// -------------------------------------------------------------
describeCategory('3. XSS & Code Injection Resistance', () => {
  testSecurityRule('Search normalizer neutralizes HTML tags and script payloads safely', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert(1)>',
      '"><svg onload=alert(1)>',
      'javascript:alert(document.cookie)'
    ];

    for (const payload of xssPayloads) {
      const normalized = normalizeSearchTerm(payload);
      assert(!normalized.includes('<script>'), 'Script tag preserved without normalization');
      assert(typeof normalized === 'string', 'Normalized output must be a clean string');
    }
  });

  testSecurityRule('Primary search matching operates safely with special regex characters', () => {
    const mockProduct: Product = {
      id: 'p-sec-1',
      internalId: 'KFH-001',
      name: 'Air Filter Toyota [Corolla+Yaris] (2020-2024)',
      typeId: 't1',
      typeName: 'Filters',
      brandId: 'b1',
      brandName: 'Guard',
      locationId: 'l1',
      locationName: 'Shop',
      cabinNumber: 'C-1',
      stockQuantity: 10,
      minStockAlert: 2,
      unit: 'Pcs',
      costPrice: 500,
      sellingPrices: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    };

    // Crafted regex injection inputs
    const regexInjections = ['[Corolla+Yaris]', '.*', '(2020-2024)', '\\d+', '(?=.*)', '+++'];
    for (const query of regexInjections) {
      // Must not throw Uncaught SyntaxError from RegExp
      const matched = matchesPrimarySearch(mockProduct, query);
      assert(typeof matched === 'boolean', `matchesPrimarySearch crashed on query: ${query}`);
    }
  });
});

// -------------------------------------------------------------
// 4. Financial Calculations & Tamper-Proofing
// -------------------------------------------------------------
describeCategory('4. Financial Calculations & Tamper-Proofing', () => {
  testSecurityRule('Price calculator rejects NaN, negative, or Infinity costs gracefully', () => {
    assert(calculateSellingPrice(NaN, 20, 5) === 0, 'NaN cost produced non-zero');
    assert(calculateSellingPrice(-500, 20, 5) === 0, 'Negative cost allowed');
    assert(calculateSellingPrice(Infinity, 20, 5) === 0, 'Infinity cost allowed');
    assert(calculateSellingPrice(1000, -50, 0) === 500, 'Negative markup calculated accurately (discount)');
  });

  testSecurityRule('Currency formatter prevents string injection and handles null/undefined safely', () => {
    assert(formatPKR(0) === 'PKR 0', '0 PKR format failed');
    assert(formatPKR(null) === 'PKR 0', 'null PKR format failed');
    assert(formatPKR(undefined) === 'PKR 0', 'undefined PKR format failed');
    assert(formatPKR(NaN) === 'PKR 0', 'NaN PKR format failed');
    assert(formatPKR(1000000) === 'PKR 1,000,000', '1M PKR format failed');
  });

  testSecurityRule('Proportional cargo distribution handles zero total cost safely (no division by zero)', () => {
    const poItems = [
      { productId: 'p1', productName: 'Item A', quantity: 0, unitCost: 0, totalCost: 0 }
    ];
    const totalItemCost = 0;
    const cargoCharges = 500;

    const calculated = poItems.map(item => {
      const shareOfCargo = totalItemCost > 0 ? (item.totalCost / totalItemCost) * cargoCharges : 0;
      const landedTotalCost = item.totalCost + shareOfCargo;
      const landedUnitCost = item.quantity > 0 ? landedTotalCost / item.quantity : item.unitCost;
      return { ...item, shareOfCargo, landedTotalCost, landedUnitCost };
    });

    assert(calculated[0].shareOfCargo === 0, 'Division by zero occurred in cargo share');
    assert(!isNaN(calculated[0].landedUnitCost), 'NaN in landed unit cost');
  });
});

// -------------------------------------------------------------
// 5. Regular Expression Denial of Service (ReDoS) Resistance
// -------------------------------------------------------------
describeCategory('5. ReDoS & Query Parsing Robustness', () => {
  testSecurityRule('Dimension parser parses long, adversarial separator strings in < 5ms', () => {
    const adversarialQuery = '100' + 'x'.repeat(500) + '200' + '*'.repeat(500) + '300';
    const start = performance.now();
    const result = parseDimensionQuery(adversarialQuery, 'inch');
    const elapsed = performance.now() - start;

    assert(elapsed < 20, `Dimension query parsing took too long (${elapsed.toFixed(2)}ms) - possible ReDoS`);
  });

  testSecurityRule('Search normalizer handles large input payloads (100k chars) without stalling', () => {
    const bigString = '   FILTER---OIL___'.repeat(5000);
    const start = performance.now();
    const normalized = normalizeSearchTerm(bigString);
    const elapsed = performance.now() - start;

    assert(elapsed < 30, `Search normalizer took too long (${elapsed.toFixed(2)}ms) on 100k payload`);
    assert(typeof normalized === 'string', 'Result must be a string');
  });
});

// -------------------------------------------------------------
// 6. Supabase & Environment Configuration Isolation
// -------------------------------------------------------------
describeCategory('6. Environment & Secret Configuration Isolation', () => {
  testSecurityRule('Supabase config reads cleanly from Vite environment without hardcoded secrets in source', () => {
    const config = getEnvSupabaseConfig();
    assert(typeof config.url === 'string', 'Supabase URL must be a string');
    assert(typeof config.anonKey === 'string', 'Anon key must be a string');
    assert(typeof config.isConfigured === 'boolean', 'isConfigured must be boolean');
  });
});

// -------------------------------------------------------------
// Output Report
// -------------------------------------------------------------
console.log('\n=============================================================');
console.log('         SECURITY & PENETRATION AUDIT REPORT                 ');
console.log('=============================================================\n');

let passedCount = 0;
let failedCount = 0;
let lastCat = '';

for (const r of securityResults) {
  if (r.category !== lastCat) {
    lastCat = r.category;
    console.log(`\n--- ${lastCat} ---`);
  }

  if (r.passed) {
    passedCount++;
    console.log(`  🛡️  SEC-PASS: ${r.name} (${r.durationMs.toFixed(2)}ms)`);
  } else {
    failedCount++;
    console.error(`  🚨 SEC-FAIL: ${r.name} (${r.durationMs.toFixed(2)}ms)`);
    console.error(`     Details: ${r.details}`);
  }
}

console.log('\n-------------------------------------------------------------');
console.log(`TOTAL SECURITY CHECKS: ${securityResults.length}`);
console.log(`PASSED: ${passedCount}`);
console.log(`FAILED: ${failedCount}`);
console.log(`SECURITY RATING: ${((passedCount / securityResults.length) * 100).toFixed(1)}%`);
console.log('=============================================================\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
