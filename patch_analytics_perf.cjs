const fs = require('fs');

const analyticsCode = `import { Product, Sale } from '../types';
import { subDays, getTime } from 'date-fns';

export interface SmartROPInsight {
  product: Product;
  forecastedAds: number;
  suggestedROP: number;
  currentMin: number;
  eoq: number;
  reorderCycle: number;
  seasonIndicator: string | null;
  seasonColor: string;
}

// Pre-compute sales per product to make analytics O(N) instead of O(N*M)
export function buildProductSalesMap(sales: Sale[]): Map<string, { time: number, qty: number }[]> {
  const map = new Map<string, { time: number, qty: number }[]>();
  for (const s of sales) {
    if (!s.date) continue;
    const time = new Date(s.date).getTime();
    for (const item of s.items) {
      if (!map.has(item.productId)) {
        map.set(item.productId, []);
      }
      map.get(item.productId)!.push({ time, qty: item.quantity || 0 });
    }
  }
  return map;
}

// Updated calculateSmartROP to take the pre-computed map
export function calculateSmartROP(p: Product, salesMap: Map<string, { time: number, qty: number }[]>, now = new Date()): SmartROPInsight | null {
  const nowTime = now.getTime();
  const ninetyDaysAgo = subDays(now, 90).getTime();
  const sixtyDaysAgo = subDays(now, 60).getTime();
  const thirtyDaysAgo = subDays(now, 30).getTime();

  const productSales = salesMap.get(p.id) || [];
  
  if (productSales.length === 0) return null;

  // Step 1: Base ADS
  let baseUnitsSold = 0;
  let unitsLast30 = 0;
  let unitsPrev30 = 0;

  for (const s of productSales) {
    if (s.time >= ninetyDaysAgo) {
      baseUnitsSold += s.qty;
    }
    if (s.time >= thirtyDaysAgo) {
      unitsLast30 += s.qty;
    } else if (s.time >= sixtyDaysAgo && s.time < thirtyDaysAgo) {
      unitsPrev30 += s.qty;
    }
  }
  
  const baseAds = baseUnitsSold / 90;
  if (baseAds <= 0.05) return null; 

  // Step 2: Seasonal Momentum Detection
  let seasonalMultiplier = 1.0;
  let seasonIndicator = null;
  let seasonColor = "text-slate-500 bg-slate-100 border-slate-200";

  if (unitsPrev30 > 3 || unitsLast30 > 3) {
     if (unitsLast30 > unitsPrev30 * 1.5) {
        seasonalMultiplier = 1.30; 
        seasonIndicator = "Season Ramping Up 📈";
        seasonColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
     } else if (unitsPrev30 > 0 && unitsLast30 < unitsPrev30 * 0.5) {
        seasonalMultiplier = 0.60; 
        seasonIndicator = "Season Cooling 📉";
        seasonColor = "text-rose-700 bg-rose-50 border-rose-200";
     }
  }

  // Step 3: Initial EOQ & Reorder Cycle
  const annualDemand = baseAds * 365;
  const orderingCost = 1500;
  const costPrice = p.costPrice && p.costPrice > 0 ? p.costPrice : 1000;
  const holdingCost = costPrice * 0.20; 
  
  const initialEoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCost);
  const initialReorderCycleDays = Math.max(7, Math.round(initialEoq / baseAds)); 
  
  // Step 4: Adjust ADS for cycle window
  const cycleDaysAgo = subDays(now, initialReorderCycleDays).getTime();
  let cycleUnitsSold = 0;
  for (const s of productSales) {
    if (s.time >= cycleDaysAgo) {
      cycleUnitsSold += s.qty;
    }
  }
  
  const adjustedAds = cycleUnitsSold / initialReorderCycleDays;
  if (adjustedAds <= 0 && seasonalMultiplier >= 1) return null; 

  const forecastedAds = (adjustedAds > 0 ? adjustedAds : baseAds) * seasonalMultiplier;

  // Step 5: Final EOQ & Suggested ROP
  const finalAnnualDemand = forecastedAds * 365;
  const finalEoq = Math.ceil(Math.sqrt((2 * finalAnnualDemand * orderingCost) / holdingCost));
  const finalReorderCycle = Math.max(7, Math.round(finalEoq / forecastedAds));

  const leadTimeDays = 14; 
  const safetyStockDays = 7;
  const suggestedROP = Math.ceil(forecastedAds * (leadTimeDays + safetyStockDays));
  const currentMin = typeof p.minStockAlert === 'number' && !isNaN(p.minStockAlert) ? p.minStockAlert : 5;
  
  return {
    product: p,
    forecastedAds,
    suggestedROP,
    currentMin,
    eoq: finalEoq,
    reorderCycle: finalReorderCycle,
    seasonIndicator,
    seasonColor
  };
}

export function autoUpdateProductsROP(products: Product[], sales: Sale[]): { updatedProducts: Product[], changed: boolean } {
  let changed = false;
  const now = new Date();
  
  const salesMap = buildProductSalesMap(sales);
  
  const updatedProducts = products.map(p => {
    const insight = calculateSmartROP(p, salesMap, now);
    if (insight) {
      const currentMin = typeof p.minStockAlert === 'number' && !isNaN(p.minStockAlert) ? p.minStockAlert : 5;
      
      // Auto-update if there's a meaningful change
      if (currentMin !== insight.suggestedROP) {
        changed = true;
        return { ...p, minStockAlert: insight.suggestedROP };
      }
    }
    return p;
  });
  
  return { updatedProducts, changed };
}
`;

fs.writeFileSync('src/services/analytics.ts', analyticsCode);
console.log('Optimized analytics.ts service for scale');
