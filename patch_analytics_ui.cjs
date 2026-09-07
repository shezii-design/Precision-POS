const fs = require('fs');
let code = fs.readFileSync('src/components/AnalyticsPage.tsx', 'utf-8');

// 1. Add onOpenCreatePO to Props
code = code.replace(
  "onOpenProductHistory: (product: Product) => void;",
  "onOpenProductHistory: (product: Product) => void;\n  onOpenCreatePO?: (presets: Array<{ productId: string, orderedQuantity: number }>) => void;"
);
code = code.replace(
  "onOpenProductHistory\n}) => {",
  "onOpenProductHistory,\n  onOpenCreatePO\n}) => {"
);

// 2. Add selection state
code = code.replace(
  "const [searchTerm, setSearchTerm] = useState('');",
  "const [searchTerm, setSearchTerm] = useState('');\n  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});\n\n  const toggleSelection = (productId: string, qty: number, e: React.MouseEvent) => {\n    e.stopPropagation();\n    setSelectedItems(prev => {\n      const next = { ...prev };\n      if (next[productId]) {\n        delete next[productId];\n      } else {\n        next[productId] = qty;\n      }\n      return next;\n    });\n  };\n\n  const handleCreatePO = () => {\n    if (onOpenCreatePO) {\n      const presets = Object.entries(selectedItems).map(([productId, orderedQuantity]) => ({ productId, orderedQuantity }));\n      onOpenCreatePO(presets);\n      setSelectedItems({});\n    }\n  };"
);

// 3. Inject checkboxes into Restock Needed
const regexRestockItem = /<div \n                  key=\{p\.id\} \n                  onClick=\{\(\) => onOpenProductHistory\(p\)\}/g;
const newRestockItem = `<div 
                  key={p.id} 
                  onClick={() => onOpenProductHistory(p)}
                  className="bg-white p-3 rounded-xl border border-rose-100 cursor-pointer hover:border-rose-300 transition-colors group flex items-center gap-3"
                >
                  <input 
                    type="checkbox" 
                    checked={!!selectedItems[p.id]}
                    onClick={(e) => {
                      const qty = typeof p.minStockAlert === 'number' && p.minStockAlert > 0 ? p.minStockAlert : 10;
                      toggleSelection(p.id, qty, e);
                    }}
                    onChange={() => {}}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                  />
                  <div className="flex-1 flex justify-between items-center">`;
code = code.replace(
  /<div \n                  key=\{p\.id\} \n                  onClick=\{\(\) => onOpenProductHistory\(p\)\}\n                  className="bg-white p-3 rounded-xl border border-rose-100 cursor-pointer hover:border-rose-300 transition-colors group flex items-center justify-between"\n                >/g,
  newRestockItem
);
// Need to close the inner div added above
code = code.replace(
  /                    <div className="text-\[10px\] text-slate-400">\n                      Min: \{p\.minStockAlert \|\| 5\}\n                    <\/div>\n                  <\/div>\n                <\/div>/g,
  `                    <div className="text-[10px] text-slate-400">
                      Min: {p.minStockAlert || 5}
                    </div>
                  </div>
                  </div>
                </div>`
);


// 4. Inject checkboxes into Smart ROP Insights
const newSmartRopItem = `<div 
                  key={insight.product.id} 
                  onClick={() => onOpenProductHistory(insight.product)}
                  className="bg-white p-3 rounded-xl border border-indigo-100 cursor-pointer hover:border-indigo-300 transition-colors group"
                >
                  <div className="flex justify-between items-start mb-2 gap-3">
                    <input 
                      type="checkbox" 
                      checked={!!selectedItems[insight.product.id]}
                      onClick={(e) => toggleSelection(insight.product.id, insight.eoq, e)}
                      onChange={() => {}}
                      className="w-4 h-4 mt-0.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <div className="flex-1 pr-2">`;
code = code.replace(
  /<div \n                  key=\{insight\.product\.id\} \n                  onClick=\{\(\) => onOpenProductHistory\(insight\.product\)\}\n                  className="bg-white p-3 rounded-xl border border-indigo-100 cursor-pointer hover:border-indigo-300 transition-colors group"\n                >\n                  <div className="flex justify-between items-start mb-2">\n                    <div className="pr-2">/g,
  newSmartRopItem
);

// 5. Inject Floating Action Button
const fab = `      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {Object.keys(selectedItems).length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4">
            <div className="font-bold">
              <span className="text-emerald-400">{Object.keys(selectedItems).length}</span> items selected
            </div>
            <div className="w-px h-6 bg-slate-700"></div>
            <button
              onClick={handleCreatePO}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-4 py-1.5 rounded-full font-black text-sm transition-colors flex items-center gap-2"
            >
              <Truck className="w-4 h-4" />
              Create PO
            </button>
          </div>
        </div>
      )}`;

code = code.replace(
  /      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">/,
  fab
);

// Add import for Truck if missing
if (!code.includes('Truck')) {
  code = code.replace(
    "AlertTriangle, PackageX, TrendingUp, Search, Calendar, ChevronRight, Lightbulb, ArrowRight",
    "AlertTriangle, PackageX, TrendingUp, Search, Calendar, ChevronRight, Lightbulb, ArrowRight, Truck"
  );
}

fs.writeFileSync('src/components/AnalyticsPage.tsx', code);
console.log("Patched Analytics UI successfully");
