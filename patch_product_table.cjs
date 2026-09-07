const fs = require('fs');
let code = fs.readFileSync('src/components/ProductTable.tsx', 'utf-8');

const helper = `
// Helper to find older cost tiers
const getOldCostTiers = (product: Product) => {
  if (!product.costBatches || product.costBatches.length === 0) return [];
  const sortedBatches = [...product.costBatches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const tiers: Record<number, number> = {};
  for (const batch of sortedBatches) {
    if ((batch.remainingQuantity || 0) > 0) {
      if (batch.unitCost !== product.costPrice) {
        tiers[batch.unitCost] = (tiers[batch.unitCost] || 0) + batch.remainingQuantity;
      }
    }
  }
  return Object.entries(tiers).map(([costStr, qty]) => ({
    cost: Number(costStr),
    qty,
  }));
};
`;

code = code.replace(
  "const ProductTable: React.FC<ProductTableProps> = ({",
  helper + "\nconst ProductTable: React.FC<ProductTableProps> = ({"
);

const costHtml = `                        <div className="flex items-center gap-1">
                          <span>{formatPKR(p.costPrice)}</span>
                          <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-red-400" />
                        </div>
                        {getOldCostTiers(p).map(t => (
                          <div key={t.cost} className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200/60 w-fit mt-0.5 whitespace-nowrap">
                            {t.qty} @ {formatPKR(t.cost)}
                          </div>
                        ))}
                        {p.costBatches && p.costBatches.length > 1 && getOldCostTiers(p).length === 0 && (
                          <div className="text-[9px] font-semibold text-slate-400 font-sans mt-0.5">
                            {p.costBatches.length} FIFO batches
                          </div>
                        )}`;

code = code.replace(
  `                        <div className="flex items-center gap-1">
                          <span>{formatPKR(p.costPrice)}</span>
                          <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-red-400" />
                        </div>
                        {p.costBatches && p.costBatches.length > 1 && (
                          <div className="text-[9px] font-semibold text-slate-400 font-sans">
                            {p.costBatches.length} FIFO batches
                          </div>
                        )}`,
  costHtml
);

fs.writeFileSync('src/components/ProductTable.tsx', code);
console.log("Patched ProductTable.tsx");
