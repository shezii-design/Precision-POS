const fs = require('fs');
let code = fs.readFileSync('src/components/AnalyticsPage.tsx', 'utf-8');

// Update imports
code = code.replace(
  "import { Product, Sale, PurchaseOrder, LedgerEntry } from '../types';",
  "import { Product, Sale, PurchaseOrder, LedgerEntry } from '../types';\nimport { calculateSmartROP } from '../services/analytics';"
);

// Replace math in AnalyticsPage with the service call
const regexMath = /\/\/ 4\. Smart Reorder Point \(ROP\), EOQ & Seasonal Insights[\s\S]*?(?=  const filteredRestock)/;
const newMath = `// 4. Smart Reorder Point (ROP), EOQ & Seasonal Insights (Now AI Managed Thresholds)
  const smartReorderInsights = useMemo(() => {
    const insights = [];
    
    for (const p of products) {
      const insight = calculateSmartROP(p, sales);
      if (insight) {
        // Since we now auto-update the ROP, currentMin WILL equal suggestedROP.
        // So we show ALL items that the AI is actively managing and setting thresholds for.
        insights.push({
          ...insight,
          type: insight.suggestedROP > 15 ? 'increase' : 'decrease'
        });
      }
    }
    return insights.sort((a, b) => b.suggestedROP - a.suggestedROP);
  }, [products, sales]);

`;

code = code.replace(regexMath, newMath);

// Change UI title from "Smart ROP Insights" to "AI Managed Thresholds"
code = code.replace(
  '<h2 className="text-sm font-black text-slate-800">Smart ROP Insights</h2>',
  '<h2 className="text-sm font-black text-slate-800">AI Managed Thresholds</h2>'
);

code = code.replace(
  '<p className="text-[10px] text-slate-500 font-medium">Reorder points dynamically suggested based on EOQ & Seasonal Momentum.</p>',
  '<p className="text-[10px] text-slate-500 font-medium">Reorder points dynamically managed by AI based on EOQ & Seasonal Momentum.</p>'
);

// We need to change the UI where it shows Current Min -> Suggested ROP, since they will be the same now.
const regexOldUI = /<div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 justify-center">[\s\S]*?<\/div>\n                  <\/div>\n                <\/div>/;

const newUI = `<div className="flex items-center justify-between bg-emerald-50 p-2 rounded-lg border border-emerald-100 mt-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <div className="text-[10px] font-semibold text-emerald-700">AI Auto-Set Min:</div>
                    </div>
                    <div className="font-black text-emerald-700">{insight.suggestedROP}</div>
                  </div>
                </div>`;

code = code.replace(regexOldUI, newUI);

fs.writeFileSync('src/components/AnalyticsPage.tsx', code);
console.log("AnalyticsPage patched");
