const fs = require('fs');
let code = fs.readFileSync('src/components/AnalyticsPage.tsx', 'utf-8');

// 1. Add Icons
code = code.replace(
  "import { AlertTriangle, PackageX, TrendingUp, Search, Calendar, ChevronRight } from 'lucide-react';",
  "import { AlertTriangle, PackageX, TrendingUp, Search, Calendar, ChevronRight, Lightbulb, ArrowRight } from 'lucide-react';"
);

// 2. Add Smart Reorder logic inside the component
const smartReorderLogic = `  // 3. Dead Stock (No sales in last 90 days, but we have stock)
  const deadStock = useMemo(() => {
    const ninetyDaysAgo = subDays(new Date(), 90);
    return products.filter(p => {
      if ((p.stockQuantity || 0) <= 0) return false;
      // Has it been sold in last 90 days?
      const recentSales = sales.some(s => {
        const d = new Date(s.date || new Date());
        return isAfter(d, ninetyDaysAgo) && s.items.some(it => it.productId === p.id);
      });
      return !recentSales;
    }).sort((a, b) => (b.stockQuantity || 0) * (b.costPrice || 0) - (a.stockQuantity || 0) * (a.costPrice || 0));
  }, [products, sales]);

  // 4. Smart Reorder Point (ROP) Insights
  const smartReorderInsights = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const insights = [];
    
    for (const p of products) {
      // Calculate sales in last 30 days
      const recentSales = sales.filter(s => new Date(s.date || new Date()) >= thirtyDaysAgo);
      let unitsSold = 0;
      for (const s of recentSales) {
        const item = s.items.find(it => it.productId === p.id);
        if (item) unitsSold += (item.quantity || 0);
      }
      
      const ads = unitsSold / 30; // Average Daily Sales
      if (ads <= 0.1) continue; // Skip very slow movers for ROP suggestions

      // Smart ROP Formula: (Average Daily Sales * Lead Time) + Safety Stock
      // Assuming a default 14-day vendor lead time and 7-day safety stock buffer
      const leadTimeDays = 14; 
      const safetyStockDays = 7;
      const suggestedROP = Math.ceil(ads * (leadTimeDays + safetyStockDays));
      
      const currentMin = typeof p.minStockAlert === 'number' && !isNaN(p.minStockAlert) ? p.minStockAlert : 5;
      
      // If suggested ROP is significantly higher (understocking risk) or much lower (overstocking risk)
      if (suggestedROP > currentMin * 1.5 || (currentMin > 15 && suggestedROP < currentMin * 0.5)) {
        insights.push({
          product: p,
          ads,
          suggestedROP,
          currentMin,
          type: suggestedROP > currentMin ? 'increase' : 'decrease'
        });
      }
    }
    return insights.sort((a, b) => b.suggestedROP - a.suggestedROP);
  }, [products, sales]);`;

code = code.replace(
  /  \/\/ 3\. Dead Stock \(No sales in last 90 days, but we have stock\)[\s\S]*?\}, \[products, sales\]\);/,
  smartReorderLogic
);

// 3. Add Smart ROP filter
const filterLogic = `  const filteredDeadStock = deadStock.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.internalId && p.internalId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSmartInsights = smartReorderInsights.filter(i => 
    i.product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.product.internalId && i.product.internalId.toLowerCase().includes(searchTerm.toLowerCase()))
  );`;

code = code.replace(
  /  const filteredDeadStock = deadStock\.filter\(p => [\s\S]*?\n  \);/,
  filterLogic
);

// 4. Update Grid layout from 2 to 3 columns
code = code.replace(
  /<div className="lg:col-span-2 bg-slate-50/g,
  '<div className="lg:col-span-1 bg-slate-50'
);

// 5. Inject the Smart ROP UI block
const smartROPBlock = `        {/* Smart Reorder Point Insights */}
        <div className="lg:col-span-1 bg-indigo-50 border border-indigo-200 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 bg-white border-b border-indigo-100 flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-bold text-indigo-800 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-indigo-500" />
                Smart ROP Insights
              </h3>
              <div className="text-[10px] text-slate-500 mt-0.5">AI suggested Reorder Points</div>
            </div>
            <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-black">
              {filteredSmartInsights.length} suggestions
            </span>
          </div>
          <div className="p-2 overflow-y-auto flex-1 space-y-2">
            {filteredSmartInsights.length === 0 ? (
              <div className="text-center text-indigo-400 p-8 text-sm font-medium">Your reorder thresholds look optimal!</div>
            ) : (
              filteredSmartInsights.map(insight => (
                <div 
                  key={insight.product.id} 
                  onClick={() => onOpenProductHistory(insight.product)}
                  className="bg-white p-3 rounded-xl border border-indigo-100 cursor-pointer hover:border-indigo-300 transition-colors group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {insight.product.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{insight.product.internalId}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-semibold text-slate-400">Daily Sales</div>
                      <div className="font-black text-slate-700">{insight.ads.toFixed(1)}/day</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 justify-center">
                    <div className="text-center">
                      <div className="text-[10px] font-semibold text-slate-400">Current Min</div>
                      <div className="font-bold text-slate-600">{insight.currentMin}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 mx-2" />
                    <div className="text-center">
                      <div className="text-[10px] font-semibold text-indigo-500">Suggested</div>
                      <div className="font-black text-indigo-600">{insight.suggestedROP}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dead Stock */}`;

code = code.replace(
  /        \{\/\* Dead Stock \*\/\}/,
  smartROPBlock
);

fs.writeFileSync('src/components/AnalyticsPage.tsx', code);
console.log("Patched AnalyticsPage.tsx with Smart ROP");
