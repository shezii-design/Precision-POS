const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

code = code.replace(
  "| 'inventory_audit';",
  "| 'inventory_audit'\n  | 'analytics';"
);

// We also need to add it to the array.
const analyticsTab = `    {
      id: 'analytics',
      title: 'Analytics & Reordering',
      shortTitle: 'Analytics',
      icon: TrendingUp,
      shortcut: 'Ctrl + Y',
      description: 'Long-term seasonality charts, smart reorder threshold calculators, and dead stock identification.',
      themeColor: 'emerald',
    },
    {
      id: 'inventory',`;

code = code.replace(
  `    {
      id: 'inventory',`,
  analyticsTab
);

fs.writeFileSync('src/components/Navbar.tsx', code);
console.log("Patched Navbar.tsx");
