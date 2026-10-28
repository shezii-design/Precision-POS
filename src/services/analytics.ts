import { Product, Sale, ProductVelocityMetrics, InventoryVelocityTier, InventoryVelocitySummary } from '../types';
import { subDays, getTime } from 'date-fns';
import { formatPKR } from './pricing';

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

export interface ProductSaleEvent {
  time: number;
  dateStr: string;
  qty: number;
  unitPrice: number;
  revenue: number;
  saleId: string;
}

export function buildProductSalesActivityMap(sales: Sale[]): Map<string, ProductSaleEvent[]> {
  const map = new Map<string, ProductSaleEvent[]>();
  for (const s of sales) {
    if (!s.date) continue;
    const time = new Date(s.date).getTime();
    if (isNaN(time)) continue;

    for (const item of s.items || []) {
      if (!item.productId) continue;
      if (!map.has(item.productId)) {
        map.set(item.productId, []);
      }
      const qty = item.netQuantity !== undefined ? item.netQuantity : (item.quantity || 0);
      const unitPrice = item.unitPrice || 0;
      const revenue = item.netTotalPrice !== undefined ? item.netTotalPrice : (qty * unitPrice);
      map.get(item.productId)!.push({
        time,
        dateStr: s.date,
        qty: Math.max(0, qty),
        unitPrice,
        revenue: Math.max(0, revenue),
        saleId: s.id,
      });
    }
  }
  return map;
}

export function calculateProductVelocity(
  p: Product,
  salesEvents: ProductSaleEvent[] = [],
  now = new Date()
): ProductVelocityMetrics {
  const nowTime = now.getTime();
  const thirtyDaysAgo = subDays(now, 30).getTime();
  const sixtyDaysAgo = subDays(now, 60).getTime();
  const ninetyDaysAgo = subDays(now, 90).getTime();

  let totalUnitsSold = 0;
  let totalRevenue = 0;
  let unitsLast30Days = 0;
  let revenueLast30Days = 0;
  let unitsLast60Days = 0;
  let unitsLast90Days = 0;
  let latestSaleTime: number | null = null;
  let latestSaleDateStr: string | null = null;
  const distinctInvoices = new Set<string>();

  for (const ev of salesEvents) {
    totalUnitsSold += ev.qty;
    totalRevenue += ev.revenue;
    distinctInvoices.add(ev.saleId);

    if (ev.time >= thirtyDaysAgo) {
      unitsLast30Days += ev.qty;
      revenueLast30Days += ev.revenue;
    }
    if (ev.time >= sixtyDaysAgo) {
      unitsLast60Days += ev.qty;
    }
    if (ev.time >= ninetyDaysAgo) {
      unitsLast90Days += ev.qty;
    }

    if (latestSaleTime === null || ev.time > latestSaleTime) {
      latestSaleTime = ev.time;
      latestSaleDateStr = ev.dateStr;
    }
  }

  const daysSinceLastSale = latestSaleTime !== null
    ? Math.max(0, Math.floor((nowTime - latestSaleTime) / (1000 * 60 * 60 * 24)))
    : null;

  const currentStock = typeof p.stockQuantity === 'number' && !isNaN(p.stockQuantity) ? p.stockQuantity : 0;
  const costPrice = typeof p.costPrice === 'number' && !isNaN(p.costPrice) ? p.costPrice : 0;
  const tiedUpCapital = Math.max(0, currentStock) * costPrice;

  // Run Rate (Average Daily Sales):
  // Blended ADS: 70% weight to last 30d, 30% weight to days 31-60
  const ads30 = unitsLast30Days / 30;
  const adsPrev30 = Math.max(0, unitsLast60Days - unitsLast30Days) / 30;
  const dailySalesRate = Number(((ads30 * 0.7) + (adsPrev30 * 0.3)).toFixed(3));

  // Days of inventory cover:
  let stockDaysOfCover = 999999;
  if (dailySalesRate > 0) {
    stockDaysOfCover = Number((currentStock / dailySalesRate).toFixed(1));
  } else if (unitsLast30Days > 0) {
    stockDaysOfCover = Number((currentStock / (unitsLast30Days / 30)).toFixed(1));
  }

  // Monthly turnover ratio
  const monthlyTurnoverRatio = currentStock > 0 ? Number((unitsLast30Days / currentStock).toFixed(2)) : 0;

  // Age of product in system
  const createdTime = p.createdAt ? new Date(p.createdAt).getTime() : 0;
  const daysSinceCreation = createdTime > 0 ? Math.max(0, Math.floor((nowTime - createdTime) / (1000 * 60 * 60 * 24))) : 999;

  // Velocity Tier Decision:
  let velocityTier: InventoryVelocityTier = 'moderate';
  let tierLabel = 'Steady Mover ⚡';
  let tierBadgeColor = 'bg-blue-100 text-blue-900 border-blue-300';
  let recommendation = 'Consistent healthy turnover. Maintain standard buffer stock.';
  let isStockoutRisk = false;
  let isOverstocked = false;

  if (currentStock <= 0) {
    velocityTier = 'out_of_stock';
    if (unitsLast30Days >= 3 || unitsLast60Days >= 6) {
      isStockoutRisk = true;
      tierLabel = 'Stockout (High Demand!) 🚨';
      tierBadgeColor = 'bg-rose-100 text-rose-900 border-rose-300';
      recommendation = 'CRITICAL: High customer demand item is completely out of stock! Create a Purchase Order immediately.';
    } else {
      tierLabel = 'Out of Stock';
      tierBadgeColor = 'bg-slate-100 text-slate-700 border-slate-300';
      recommendation = 'Zero stock on hand. Review demand before reordering.';
    }
  } else {
    // Has physical stock
    if (totalUnitsSold === 0 && daysSinceCreation <= 30) {
      velocityTier = 'new_unsold';
      tierLabel = 'New Arrival 🆕';
      tierBadgeColor = 'bg-cyan-100 text-cyan-900 border-cyan-300';
      recommendation = 'New addition to inventory. Monitor customer demand over the next 30 days.';
    } else if (daysSinceLastSale === null || daysSinceLastSale >= 60 || (unitsLast60Days === 0 && daysSinceCreation > 30)) {
      velocityTier = 'dead';
      tierLabel = 'Dead Stock 💀';
      tierBadgeColor = 'bg-purple-100 text-purple-900 border-purple-300';
      const daysStr = daysSinceLastSale !== null ? `${daysSinceLastSale} days` : 'recorded history';
      recommendation = `No sales in ${daysStr}. ₨ ${formatPKR(tiedUpCapital)} locked in idle capital. Recommend 15–25% clearance discount, promotional bundles, or vendor return debit note.`;
    } else if (
      unitsLast30Days >= 5 ||
      (unitsLast60Days >= 10 && daysSinceLastSale !== null && daysSinceLastSale <= 15) ||
      (unitsLast30Days >= 3 && distinctInvoices.size >= 3)
    ) {
      velocityTier = 'fast';
      tierLabel = 'Fast Selling 🔥';
      tierBadgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-300';

      if (stockDaysOfCover <= 14) {
        isStockoutRisk = true;
        recommendation = `URGENT RESTOCK: Only ~${Math.round(stockDaysOfCover)} days of stock remaining at current velocity (${unitsLast30Days} pcs/mo). Restock now to prevent lost revenue!`;
      } else if (stockDaysOfCover <= 30) {
        recommendation = `High velocity item (~${Math.round(stockDaysOfCover)} days of cover). Normal lead time replenishment is recommended.`;
      } else {
        recommendation = `Top revenue driver selling fast (${unitsLast30Days} pcs/30d) with a safe buffer (~${Math.round(stockDaysOfCover)} days).`;
      }
    } else if (
      (daysSinceLastSale !== null && daysSinceLastSale >= 35 && unitsLast30Days <= 1) ||
      (stockDaysOfCover >= 120 && currentStock >= 8) ||
      (unitsLast30Days <= 1 && unitsLast60Days <= 2)
    ) {
      velocityTier = 'slow';
      tierLabel = 'Slow Moving 🐢';
      tierBadgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
      isOverstocked = stockDaysOfCover >= 120;
      recommendation = isOverstocked
        ? `Overstocked with ~${Math.round(stockDaysOfCover)} days of cover (${currentStock} pcs on hand). Pause reordering until stock depletes.`
        : `Sluggish sales pace (last sold ${daysSinceLastSale || 0} days ago). Tied capital: ₨ ${formatPKR(tiedUpCapital)}. Monitor carefully.`;
    } else {
      velocityTier = 'moderate';
      tierLabel = 'Steady Mover ⚡';
      tierBadgeColor = 'bg-blue-100 text-blue-900 border-blue-300';
      recommendation = `Steady sales (${unitsLast30Days} pcs/mo) with balanced stock cover (~${Math.round(stockDaysOfCover)} days).`;
    }
  }

  // Normalized velocity score (0 to 100)
  const recencyBonus = daysSinceLastSale !== null ? Math.max(0, 30 - daysSinceLastSale) : 0;
  const volumeBonus = Math.min(50, unitsLast30Days * 5);
  const freqBonus = Math.min(20, distinctInvoices.size * 4);
  const velocityScore = Math.min(100, Math.round(volumeBonus + freqBonus + recencyBonus));

  return {
    productId: p.id,
    internalId: p.internalId,
    productName: p.name,
    brandName: p.brandName,
    typeName: p.typeName,
    locationName: p.locationName,
    cabinNumber: p.cabinNumber,
    currentStock,
    unit: p.unit,
    costPrice,
    tiedUpCapital,
    totalUnitsSold,
    totalSalesCount: distinctInvoices.size,
    totalRevenue,
    unitsLast30Days,
    revenueLast30Days,
    unitsLast60Days,
    unitsLast90Days,
    dailySalesRate,
    lastSaleDate: latestSaleDateStr,
    daysSinceLastSale,
    stockDaysOfCover,
    monthlyTurnoverRatio,
    velocityTier,
    velocityScore,
    tierLabel,
    tierBadgeColor,
    recommendation,
    isStockoutRisk,
    isOverstocked,
  };
}

export function calculateAllInventoryVelocity(
  products: Product[],
  sales: Sale[],
  now = new Date()
): Map<string, ProductVelocityMetrics> {
  const activityMap = buildProductSalesActivityMap(sales);
  const result = new Map<string, ProductVelocityMetrics>();

  for (const p of products) {
    const events = activityMap.get(p.id) || [];
    result.set(p.id, calculateProductVelocity(p, events, now));
  }

  return result;
}

export function calculateInventoryVelocitySummary(
  products: Product[],
  velocityMap: Map<string, ProductVelocityMetrics>
): InventoryVelocitySummary {
  let fastMoversCount = 0;
  let moderateCount = 0;
  let slowMoversCount = 0;
  let deadStockCount = 0;
  let newUnsoldCount = 0;
  let outOfStockCount = 0;
  let totalInventoryValuationCost = 0;
  let deadStockTiedUpCapital = 0;
  let slowMoversTiedUpCapital = 0;
  let fastMoversRevenue30d = 0;
  let fastMoversUnits30d = 0;
  let stockoutRiskCount = 0;

  for (const p of products) {
    const m = velocityMap.get(p.id);
    if (!m) continue;

    totalInventoryValuationCost += m.tiedUpCapital;

    switch (m.velocityTier) {
      case 'fast':
        fastMoversCount++;
        fastMoversRevenue30d += m.revenueLast30Days;
        fastMoversUnits30d += m.unitsLast30Days;
        if (m.isStockoutRisk) stockoutRiskCount++;
        break;
      case 'moderate':
        moderateCount++;
        break;
      case 'slow':
        slowMoversCount++;
        slowMoversTiedUpCapital += m.tiedUpCapital;
        break;
      case 'dead':
        deadStockCount++;
        deadStockTiedUpCapital += m.tiedUpCapital;
        break;
      case 'new_unsold':
        newUnsoldCount++;
        break;
      case 'out_of_stock':
        outOfStockCount++;
        if (m.isStockoutRisk) stockoutRiskCount++;
        break;
    }
  }

  return {
    totalProducts: products.length,
    fastMoversCount,
    moderateCount,
    slowMoversCount,
    deadStockCount,
    newUnsoldCount,
    outOfStockCount,
    totalInventoryValuationCost,
    deadStockTiedUpCapital,
    slowMoversTiedUpCapital,
    fastMoversRevenue30d,
    fastMoversUnits30d,
    stockoutRiskCount,
  };
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

