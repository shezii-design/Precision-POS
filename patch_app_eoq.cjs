const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes("import { autoUpdateProductsROP }")) {
  code = code.replace(
    "import { filterAndSortProducts, normalizeSearchTerm } from './services/search';",
    "import { filterAndSortProducts, normalizeSearchTerm } from './services/search';\nimport { autoUpdateProductsROP } from './services/analytics';"
  );
}

if (!code.includes("import { StockBreachToast }")) {
  code = code.replace(
    "import { LowStockNotificationBanner } from './components/LowStockNotificationBanner';",
    "import { LowStockNotificationBanner } from './components/LowStockNotificationBanner';\nimport { StockBreachToast } from './components/StockBreachToast';"
  );
}

if (!code.includes("const [stockBreaches, setStockBreaches]")) {
  // Add state
  const stateRegex = /const \[showLowStockBanner, setShowLowStockBanner\] = useState<boolean>\(true\);/;
  const newState = `const [showLowStockBanner, setShowLowStockBanner] = useState<boolean>(true);
  const [stockBreaches, setStockBreaches] = useState<{ product: Product, eoq: number }[]>([]);`;
  code = code.replace(stateRegex, newState);
}

// Add the background AI check effect
if (!code.includes("AI Reorder Threshold Auto-Updater & Breach Detector")) {
  const effectRegex = /\/\/ F5 Global Shortcut Effect/;
  const newEffect = `// AI Reorder Threshold Auto-Updater & Breach Detector
  useEffect(() => {
    // 1. Auto-update ROP thresholds
    const { updatedProducts, changed } = autoUpdateProductsROP(products, sales);
    if (changed) {
      setProducts(updatedProducts);
      saveStoredProducts(updatedProducts);
    }

    // 2. Detect Breaches (products where stock <= minStockAlert)
    // Only detect if there's actual stock and sales, and avoid annoying user on load.
    // To make it simple: if a product is below threshold, add it to breaches if not already there,
    // BUT we don't want to show notifications for things that have been low for a long time.
    // Instead of doing it in this useEffect, we can hook into handleSaveSale to detect real-time drops.
  }, [sales]); // Only run when sales change, to avoid infinite loop on products change

  // F5 Global Shortcut Effect`;
  code = code.replace(effectRegex, newEffect);
}

fs.writeFileSync('src/App.tsx', code);
console.log("App.tsx patched for EOQ");
