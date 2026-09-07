const fs = require('fs');
let code = fs.readFileSync('src/components/AnalyticsPage.tsx', 'utf-8');

code = code.replace(
  "import { Product, Sale, Purchase } from '../types';",
  "import { Product, Sale, Purchase } from '../types';\nimport { calculateSmartROP, buildProductSalesMap } from '../services/analytics';"
);

code = code.replace(
  "import { AlertTriangle, PackageX, TrendingUp, Search, Calendar, ChevronRight, Lightbulb, ArrowRight } from 'lucide-react';",
  "import { AlertTriangle, PackageX, TrendingUp, Search, Calendar, ChevronRight, Lightbulb, ArrowRight, Truck, Sparkles } from 'lucide-react';"
);

fs.writeFileSync('src/components/AnalyticsPage.tsx', code);
console.log("AnalyticsPage imports patched again");
