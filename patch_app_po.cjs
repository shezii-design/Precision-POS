const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add state for initialPOPresets
if (!code.includes('initialPOPresets')) {
  code = code.replace(
    "const [poModalVendorId, setPoModalVendorId] = useState<string | undefined>(undefined);",
    "const [poModalVendorId, setPoModalVendorId] = useState<string | undefined>(undefined);\n  const [initialPOPresets, setInitialPOPresets] = useState<Array<{ productId: string, orderedQuantity: number }> | undefined>(undefined);"
  );
}

// 2. Update handleOpenCreatePO
code = code.replace(
  "const handleOpenCreatePO = (vendorId?: string) => {",
  "const handleOpenCreatePO = (vendorId?: string, presets?: Array<{ productId: string, orderedQuantity: number }>) => {"
);

code = code.replace(
  "setPoModalVendorId(validVendorId);\n    setEditingPOForModal(null);",
  "setPoModalVendorId(validVendorId);\n    setEditingPOForModal(null);\n    setInitialPOPresets(presets);"
);

// 3. Update PurchaseOrderFormModal render in App.tsx
code = code.replace(
  "<PurchaseOrderFormModal\n          isOpen={showPOFormModal}",
  "<PurchaseOrderFormModal\n          isOpen={showPOFormModal}\n          initialPresets={initialPOPresets}"
);

// 4. Expose handleOpenCreatePO to AnalyticsPage
const regexAnalyticsRender = /<AnalyticsPage\s+products=\{products\}\s+sales=\{sales\}\s+purchases=\{purchases\}\s+onOpenProductHistory=\{\(product\) => \{\s+handleOpenProductHistory\(product\);\s+\}\}\s+\/>/;
const newAnalyticsRender = `<AnalyticsPage
            products={products}
            sales={sales}
            purchases={purchases}
            onOpenProductHistory={(product) => {
              handleOpenProductHistory(product);
            }}
            onOpenCreatePO={(presets) => {
              handleOpenCreatePO(undefined, presets);
              setCurrentView('purchase_orders');
            }}
          />`;
code = code.replace(regexAnalyticsRender, newAnalyticsRender);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx for PO Presets");
