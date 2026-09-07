const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes('autoUpdateProductsROP')) {
  code = code.replace(
    "import { saveLedgerEntries, updateLedgerEntry } from './services/storage';",
    "import { saveLedgerEntries, updateLedgerEntry, saveStoredProducts } from './services/storage';\nimport { autoUpdateProductsROP } from './services/analytics';"
  );
  
  // Add useEffect to auto-update ROP on mount or sales change
  const regexUseEffect = /  \/\/ Initialize online status/;
  const newUseEffect = `  // Auto-Update ROP Thresholds based on recent sales
  useEffect(() => {
    // Debounce slightly to prevent thrashing
    const timeout = setTimeout(() => {
      const { updatedProducts, changed } = autoUpdateProductsROP(products, sales);
      if (changed) {
        setProducts(updatedProducts);
        saveStoredProducts(updatedProducts);
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [sales]); // When sales change, re-evaluate ROPs

  // Initialize online status`;
  
  code = code.replace(regexUseEffect, newUseEffect);
  
  fs.writeFileSync('src/App.tsx', code);
  console.log("App.tsx patched with autoUpdateProductsROP");
} else {
  console.log("Already patched");
}
