const fs = require('fs');
let code = fs.readFileSync('src/components/AnalyticsPage.tsx', 'utf-8');

// 1. Replace Logic Block
const regexLogic = /\/\/ 4\. Smart Reorder Point \(ROP\) \& EOQ Insights[\s\S]*?(?=  const filteredRestock = restockNeeded)/;

const newLogic = `// 4. Smart Reorder Point (ROP), EOQ & Seasonal Insights
  const smartReorderInsights = useMemo(() => {
    const now = new Date();
    const ninetyDaysAgo = subDays(now, 90);
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);
    const insights = [];
    
    for (const p of products) {
      // Step 1: Base ADS
      const baseSales = sales.filter(s => new Date(s.date || now) >= ninetyDaysAgo);
      let baseUnitsSold = 0;
      for (const s of baseSales) {
        const item = s.items.find(it => it.productId === p.id);
        if (item) baseUnitsSold += (item.quantity || 0);
      }
      
      const baseAds = baseUnitsSold / 90;
      if (baseAds <= 0.05) continue; 

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

      // If volume is meaningful, check for seasonal turning points
      if (unitsPrev30 > 3 || unitsLast30 > 3) {
         if (unitsLast30 > unitsPrev30 * 1.5) {
            seasonalMultiplier = 1.30; // 30% boost for ramping season
            seasonIndicator = "Season Ramping Up 📈";
            seasonColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
         } else if (unitsPrev30 > 0 && unitsLast30 < unitsPrev30 * 0.5) {
            seasonalMultiplier = 0.60; // 40% cut for ending season
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
      if (adjustedAds <= 0 && seasonalMultiplier >= 1) continue; 

      // Apply Seasonal Momentum to the forecasted ADS
      const forecastedAds = (adjustedAds > 0 ? adjustedAds : baseAds) * seasonalMultiplier;

      // Step 5: Final EOQ & Suggested ROP
      const finalAnnualDemand = forecastedAds * 365;
      const finalEoq = Math.ceil(Math.sqrt((2 * finalAnnualDemand * orderingCost) / holdingCost));
      const finalReorderCycle = Math.max(7, Math.round(finalEoq / forecastedAds));

      const leadTimeDays = 14; 
      const safetyStockDays = 7;
      const suggestedROP = Math.ceil(forecastedAds * (leadTimeDays + safetyStockDays));
      
      const currentMin = typeof p.minStockAlert === 'number' && !isNaN(p.minStockAlert) ? p.minStockAlert : 5;
      
      if (suggestedROP > currentMin * 1.1 || (currentMin > 15 && suggestedROP < currentMin * 0.8)) {
        insights.push({
          product: p,
          forecastedAds,
          suggestedROP,
          currentMin,
          eoq: finalEoq,
          reorderCycle: finalReorderCycle,
          seasonIndicator,
          seasonColor,
          type: suggestedROP > currentMin ? 'increase' : 'decrease'
        });
      }
    }
    return insights.sort((a, b) => b.suggestedROP - a.suggestedROP);
  }, [products, sales]);

`;

code = code.replace(regexLogic, newLogic);

// 2. Replace UI Block
const regexUI = /<div className="text-\[10px\] text-slate-500 mt-0\.5">Adj ADS: <span className="font-semibold text-slate-700">\{insight\.adjustedAds\.toFixed\(2\)\}\/day<\/span><\/div>/;

const newUI = `<div className="flex items-center gap-2 mt-1">
                      <div className="text-[10px] text-slate-500">Proj ADS: <span className="font-semibold text-slate-700">{insight.forecastedAds.toFixed(2)}/day</span></div>
                      {insight.seasonIndicator && (
                        <div className={\`text-[9px] font-bold px-1.5 py-0.5 rounded border \${insight.seasonColor}\`}>
                          {insight.seasonIndicator}
                        </div>
                      )}
                    </div>`;

code = code.replace(regexUI, newUI);

fs.writeFileSync('src/components/AnalyticsPage.tsx', code);
console.log("Patched successfully");
