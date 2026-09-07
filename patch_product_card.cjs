const fs = require('fs');
let code = fs.readFileSync('src/components/ProductCard.tsx', 'utf-8');

const helper = `
// Helper to find older cost tiers
const getOldCostTiers = (product: Product) => {
  if (!product.costBatches || product.costBatches.length === 0) return [];
  // Sort oldest first
  const sortedBatches = [...product.costBatches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Group remaining quantities by unitCost, but only for costs DIFFERENT from the current costPrice
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
  "const ProductCard: React.FC<ProductCardProps> = ({",
  helper + "\nconst ProductCard: React.FC<ProductCardProps> = ({"
);

const oldTiersCall = `  const oldTiers = getOldCostTiers(product);`;
code = code.replace(
  "const isLowStock = !isOutOfStock && stockQty <= alertThreshold;",
  "const isLowStock = !isOutOfStock && stockQty <= alertThreshold;\n" + oldTiersCall
);

const pricingSection = `{/* PRICING SECTION (Cost in Red + Wholesale in Yellow + Retail Tiers in Progressive Green) */}
        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          {oldTiers.length > 0 && (
            <div className="flex flex-col gap-1 px-1">
              {oldTiers.map(t => (
                <div key={t.cost} className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/60 inline-block w-fit">
                  {t.qty} item{t.qty !== 1 ? 's' : ''} in stock at {formatPKR(t.cost)}
                </div>
              ))}
            </div>
          )}`;

code = code.replace(
  "{/* PRICING SECTION (Cost in Red + Wholesale in Yellow + Retail Tiers in Progressive Green) */}\n        <div className=\"pt-2 border-t border-slate-100 space-y-2.5\">",
  pricingSection
);

fs.writeFileSync('src/components/ProductCard.tsx', code);
console.log("Patched ProductCard.tsx");
