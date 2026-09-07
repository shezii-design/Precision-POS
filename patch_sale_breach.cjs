const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Insert after handleSaveSale definition, but wait, handleSaveSale calls recordSaleAndUpdateInventory
const regexSale = /const res = recordSaleAndUpdateInventory\(newSale, products, sales, customers\);\n\s*setProducts\(res\.updatedProducts\);\n\s*setSales\(res\.updatedSales\);/g;

const newSaleLogic = `const res = recordSaleAndUpdateInventory(newSale, products, sales, customers);
      setProducts(res.updatedProducts);
      setSales(res.updatedSales);
      
      // BACKGROUND CHECK: Detect newly breached thresholds
      const newBreaches: {product: Product, eoq: number}[] = [];
      newSale.items.forEach(saleItem => {
        const oldProd = products.find(p => p.id === saleItem.productId);
        const newProd = res.updatedProducts.find(p => p.id === saleItem.productId);
        if (oldProd && newProd) {
          const threshold = typeof newProd.minStockAlert === 'number' && !isNaN(newProd.minStockAlert) ? newProd.minStockAlert : 5;
          const oldStock = oldProd.stockQuantity || 0;
          const newStock = newProd.stockQuantity || 0;
          // If it just crossed the threshold
          if (oldStock > threshold && newStock <= threshold) {
             // Calculate EOQ for quick action
             const { calculateSmartROP, buildProductSalesMap } = require('./services/analytics');
             const insight = calculateSmartROP(newProd, buildProductSalesMap(res.updatedSales));
             newBreaches.push({ product: newProd, eoq: insight ? insight.eoq : 10 });
          }
        }
      });
      if (newBreaches.length > 0) {
        setStockBreaches(prev => {
           const existingIds = new Set(prev.map(b => b.product.id));
           const toAdd = newBreaches.filter(b => !existingIds.has(b.product.id));
           return [...prev, ...toAdd];
        });
      }
`;

if (!code.includes("Detect newly breached thresholds")) {
  code = code.replace(regexSale, newSaleLogic);
  fs.writeFileSync('src/App.tsx', code);
  console.log("App.tsx handleSaveSale patched");
}
