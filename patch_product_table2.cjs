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
  "export const ProductTable: React.FC<ProductTableProps> = React.memo(({",
  helper + "\nexport const ProductTable: React.FC<ProductTableProps> = React.memo(({"
);

fs.writeFileSync('src/components/ProductTable.tsx', code);
console.log("Patched ProductTable.tsx again");
