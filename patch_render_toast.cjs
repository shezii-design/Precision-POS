const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes("<StockBreachToast")) {
  const insertTarget = "{/* Keyboard Shortcut HUD Toast Notification */";
  const toastComponent = `<StockBreachToast 
        breaches={stockBreaches} 
        onOpenCreatePO={(presets) => handleOpenCreatePO(undefined, presets)}
        onDismiss={(id) => setStockBreaches(prev => prev.filter(b => b.product.id !== id))}
      />
      
      {/* Keyboard Shortcut HUD Toast Notification */`;
  
  code = code.replace(insertTarget, toastComponent);
  fs.writeFileSync('src/App.tsx', code);
  console.log("App.tsx render patched");
}
