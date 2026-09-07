const fs = require('fs');
let code = fs.readFileSync('src/components/AnalyticsPage.tsx', 'utf-8');

if (!code.includes("import { calculateSmartROP, buildProductSalesMap }")) {
  code = code.replace(
    /import \{[^}]*\} from '\.\.\/services\/analytics';/g,
    "import { calculateSmartROP, buildProductSalesMap } from '../services/analytics';"
  );
  if (!code.includes("import { calculateSmartROP, buildProductSalesMap }")) {
      code = code.replace(
        "import { Product, Sale, Purchase, PurchaseOrder, Customer, Vendor, Quotation, CustomerReturn, VendorReturn } from '../types';",
        "import { Product, Sale, Purchase, PurchaseOrder, Customer, Vendor, Quotation, CustomerReturn, VendorReturn } from '../types';\nimport { calculateSmartROP, buildProductSalesMap } from '../services/analytics';"
      );
  }
}

// Fix Truck and Sparkles
if (!code.includes("Truck")) {
  code = code.replace(
    "TrendingDown",
    "TrendingDown, Truck, Sparkles"
  );
}

fs.writeFileSync('src/components/AnalyticsPage.tsx', code);
console.log("AnalyticsPage imports patched");
