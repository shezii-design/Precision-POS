const fs = require('fs');
let code = fs.readFileSync('src/components/AnalyticsPage.tsx', 'utf-8');

// Add export function import
if (!code.includes("exportAnalyticsToExcel")) {
  code = code.replace(
    "import { formatPKR } from '../services/pricing';",
    "import { formatPKR } from '../services/pricing';\nimport { exportAnalyticsToExcel } from '../services/excel';"
  );
}

// Add Download icon
if (!code.includes("Download")) {
  code = code.replace(
    "Truck, Sparkles } from 'lucide-react';",
    "Truck, Sparkles, Download } from 'lucide-react';"
  );
}

// Replace the div holding the search bar to include the export button
const searchDiv = `<div className="relative w-72">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>`;

const replaceDiv = `<div className="flex items-center gap-3">
          <div className="relative w-72 hidden sm:block">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>
          <button
            onClick={() => exportAnalyticsToExcel(products, sales)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 shadow-xs rounded-xl font-bold text-sm transition-all"
            title="Export AI Reorder Data & EOQ to Excel"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Analytics</span>
          </button>
        </div>`;

if (!code.includes("exportAnalyticsToExcel(products, sales)")) {
  code = code.replace(searchDiv, replaceDiv);
  fs.writeFileSync('src/components/AnalyticsPage.tsx', code);
  console.log("AnalyticsPage export button patched");
} else {
  console.log("Already has export button");
}
