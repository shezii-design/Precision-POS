const fs = require('fs');
let code = fs.readFileSync('src/components/AnalyticsPage.tsx', 'utf-8');

// 1. Replace Logic
const regex = /\/\/ 4\. Smart Reorder Point \(ROP\) Insights[\s\S]*?(?=  const filteredRestock)/;

const newLogic = `// 4. Smart Reorder Point (ROP) & EOQ Insights
  const smartReorderInsights = useMemo(() => {
    const now = new Date();
    const ninetyDaysAgo = subDays(now, 90);
    const insights = [];
    
    for (const p of products) {
      // Step 1: Calculate Base ADS over the last 90 days for stability
      const baseSales = sales.filter(s => new Date(s.date || now) >= ninetyDaysAgo);
      let baseUnitsSold = 0;
      for (const s of baseSales) {
        const item = s.items.find(it => it.productId === p.id);
        if (item) baseUnitsSold += (item.quantity || 0);
      }
      
      const baseAds = baseUnitsSold / 90;
      if (baseAds <= 0.05) continue; // Skip practically dead items

      // Step 2: Initial EOQ & Reorder Cycle Calculation
      // Assumptions: Ordering Cost (S) = Rs 1500, Holding Cost (H) = 20% of Cost Price per year
      const annualDemand = baseAds * 365;
      const orderingCost = 1500;
      const costPrice = p.costPrice && p.costPrice > 0 ? p.costPrice : 1000;
      const holdingCost = costPrice * 0.20; 
      
      const initialEoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCost);
      const initialReorderCycleDays = Math.max(7, Math.round(initialEoq / baseAds)); 
      
      // Step 3: Adjust ADS according to the specific Reorder Cycle window
      const cycleDaysAgo = subDays(now, initialReorderCycleDays);
      const cycleSales = sales.filter(s => new Date(s.date || now) >= cycleDaysAgo);
      let cycleUnitsSold = 0;
      for (const s of cycleSales) {
        const item = s.items.find(it => it.productId === p.id);
        if (item) cycleUnitsSold += (item.quantity || 0);
      }
      
      const adjustedAds = cycleUnitsSold / initialReorderCycleDays;
      if (adjustedAds <= 0) continue; // Ignore if no sales inside the new dynamic cycle

      // Step 4: Final EOQ & Suggested ROP
      const finalAnnualDemand = adjustedAds * 365;
      const finalEoq = Math.ceil(Math.sqrt((2 * finalAnnualDemand * orderingCost) / holdingCost));
      const finalReorderCycle = Math.max(7, Math.round(finalEoq / adjustedAds));

      // Smart ROP Formula: (Adjusted ADS * Lead Time) + Safety Stock
      // Assuming a default 14-day vendor lead time and 7-day safety stock buffer
      const leadTimeDays = 14; 
      const safetyStockDays = 7;
      const suggestedROP = Math.ceil(adjustedAds * (leadTimeDays + safetyStockDays));
      
      const currentMin = typeof p.minStockAlert === 'number' && !isNaN(p.minStockAlert) ? p.minStockAlert : 5;
      
      if (suggestedROP > currentMin * 1.1 || (currentMin > 15 && suggestedROP < currentMin * 0.8)) {
        insights.push({
          product: p,
          adjustedAds,
          suggestedROP,
          currentMin,
          eoq: finalEoq,
          reorderCycle: finalReorderCycle,
          type: suggestedROP > currentMin ? 'increase' : 'decrease'
        });
      }
    }
    return insights.sort((a, b) => b.suggestedROP - a.suggestedROP);
  }, [products, sales]);

`;

code = code.replace(regex, newLogic);

// 2. Replace UI
const uiRegex = /filteredSmartInsights\.map\([\s\S]*?\)\)\n            \)}/;

const newUI = `filteredSmartInsights.map(insight => (
                <div 
                  key={insight.product.id} 
                  onClick={() => onOpenProductHistory(insight.product)}
                  className="bg-white p-3 rounded-xl border border-indigo-100 cursor-pointer hover:border-indigo-300 transition-colors group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="pr-2">
                      <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {insight.product.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Adj ADS: <span className="font-semibold text-slate-700">{insight.adjustedAds.toFixed(2)}/day</span></div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-semibold text-indigo-500">Cycle / EOQ</div>
                      <div className="font-black text-slate-700 text-xs">{insight.reorderCycle}d / {insight.eoq}u</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 justify-center">
                    <div className="text-center w-1/3">
                      <div className="text-[10px] font-semibold text-slate-400">Current Min</div>
                      <div className="font-bold text-slate-600 line-through decoration-rose-400">{insight.currentMin}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 shrink-0 mx-1" />
                    <div className="text-center w-1/3">
                      <div className="text-[10px] font-semibold text-indigo-500">Suggested ROP</div>
                      <div className="font-black text-indigo-600">{insight.suggestedROP}</div>
                    </div>
                  </div>
                </div>
              ))
            )}`;

code = code.replace(uiRegex, newUI);

fs.writeFileSync('src/components/AnalyticsPage.tsx', code);
console.log("Patched successfully");
