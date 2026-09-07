const fs = require('fs');

const analyticsCode = `import { Product, Sale } from '../types';
import { subDays } from 'date-fns';

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

export function calculateSmartROP(p: Product, sales: Sale[], now = new Date()): SmartROPInsight | null {
  const ninetyDaysAgo = subDays(now, 90);
  const thirtyDaysAgo = subDays(now, 30);
  const sixtyDaysAgo = subDays(now, 60);

  // Step 1: Base ADS
  const baseSales = sales.filter(s => new Date(s.date || now) >= ninetyDaysAgo);
  let baseUnitsSold = 0;
  for (const s of baseSales) {
    const item = s.items.find(it => it.productId === p.id);
    if (item) baseUnitsSold += (item.quantity || 0);
  }
  
  const baseAds = baseUnitsSold / 90;
  if (baseAds <= 0.05) return null; 

  // Step 2: Seasonal Momentum Detection
  const salesLast30 = sales.filter(s => new Date(s.date || now) >= thirtyDaysAgo);
  let unitsLast30 = 0;
  for (const s of salesLast30) {
    const item = s.items.find(it => it.productId === p.id);
    if (item) unitsLast30 += (item.quantity || 0);
  }

  const salesPrev30 = sales.filter(s => {
    const d = new Date(s.date || now);
    return d >= sixtyDaysAgo && d < thirtyDaysAgo;
  });
  let unitsPrev30 = 0;
  for (const s of salesPrev30) {
    const item = s.items.find(it => it.productId === p.id);
    if (item) unitsPrev30 += (item.quantity || 0);
  }

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
  const cycleDaysAgo = subDays(now, initialReorderCycleDays);
  const cycleSales = sales.filter(s => new Date(s.date || now) >= cycleDaysAgo);
  let cycleUnitsSold = 0;
  for (const s of cycleSales) {
    const item = s.items.find(it => it.productId === p.id);
    if (item) cycleUnitsSold += (item.quantity || 0);
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
  
  const updatedProducts = products.map(p => {
    const insight = calculateSmartROP(p, sales, now);
    if (insight) {
      const currentMin = typeof p.minStockAlert === 'number' && !isNaN(p.minStockAlert) ? p.minStockAlert : 5;
      
      // Auto-update if there's a meaningful change (we apply it directly since user wants it automated)
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
console.log('Created analytics.ts service');
