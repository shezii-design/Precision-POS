const fs = require('fs');
let code = fs.readFileSync('src/components/AnalyticsPage.tsx', 'utf-8');

// Update imports
code = code.replace(
  "import { calculateSmartROP } from '../services/analytics';",
  "import { calculateSmartROP, buildProductSalesMap } from '../services/analytics';"
);

// Update useMemo
const regexMath = /\/\/ 4\. Smart Reorder Point \(ROP\), EOQ & Seasonal Insights \(Now AI Managed Thresholds\)[\s\S]*?(?=  const filteredRestock)/;
const newMath = `// 4. Smart Reorder Point (ROP), EOQ & Seasonal Insights (Now AI Managed Thresholds)
  const smartReorderInsights = useMemo(() => {
    const insights = [];
    const salesMap = buildProductSalesMap(sales);
    
    for (const p of products) {
      const insight = calculateSmartROP(p, salesMap);
      if (insight) {
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

fs.writeFileSync('src/components/AnalyticsPage.tsx', code);
console.log("AnalyticsPage patched for scale");
