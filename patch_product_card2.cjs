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
  "export const ProductCard: React.FC<ProductCardProps> = React.memo(({",
  helper + "\nexport const ProductCard: React.FC<ProductCardProps> = React.memo(({"
);

fs.writeFileSync('src/components/ProductCard.tsx', code);
console.log("Patched ProductCard.tsx again");
