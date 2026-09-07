const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Add import
if (!code.includes('import { AnalyticsPage }')) {
  code = code.replace(
    "import { DashboardPage }",
    "import { AnalyticsPage } from './components/AnalyticsPage';\nimport { DashboardPage }"
  );
}

// Add to view rendering
const analyticsView = `        ) : currentView === 'analytics' ? (
          <AnalyticsPage
            products={products}
            sales={sales}
            purchases={purchases}
            onOpenProductHistory={(product) => {
              handleOpenProductHistory(product);
            }}
          />
        ) : currentView === 'income_statement' ? (`;

code = code.replace(
  "        ) : currentView === 'income_statement' ? (",
  analyticsView
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx");
