const fs = require('fs');
let code = fs.readFileSync('src/components/PurchaseOrderFormModal.tsx', 'utf-8');

const regexProps = /initialVendorId\?: string;/;
code = code.replace(
  regexProps,
  "initialVendorId?: string;\n  initialPresets?: Array<{ productId: string; orderedQuantity: number }>;"
);

const regexDestructure = /  initialVendorId,\n  nextPONumber: customNextPONumber,/;
code = code.replace(
  regexDestructure,
  "  initialVendorId,\n  initialPresets,\n  nextPONumber: customNextPONumber,"
);

const regexEffect = /    \} else \{[\s\S]*?    \}/;
const newEffect = `    } else {
      setVendorId(initialVendorId || '');
      setVendorName('');
      setVendorPhone('');
      setVendorAddress('');
      setPoNumber(autoNextPONumber);
      setOrderDate(new Date().toISOString().split('T')[0]);
      setExpectedDeliveryDate('');
      setEstimatedCargoCost(0);
      setStatus('ordered');
      setNotes('');
      
      if (initialPresets && initialPresets.length > 0) {
        setItems(
          initialPresets.map(preset => {
            const matchProd = products.find(p => p.id === preset.productId);
            return {
              tempId: \`poi-\${Date.now()}-\${Math.random().toString(36).substring(2, 6)}\`,
              productId: preset.productId,
              internalId: matchProd?.internalId || '',
              productName: matchProd?.name || 'Unknown',
              brandName: matchProd?.brandName || '',
              typeName: matchProd?.typeName || '',
              unit: matchProd?.unit || 'Pcs',
              stockInHand: matchProd?.stockQuantity || 0,
              orderedQuantity: preset.orderedQuantity,
              estimatedUnitPrice: matchProd?.costPrice || 0,
              notes: ''
            };
          })
        );
      } else {
        setItems([]);
      }
    }`;
code = code.replace(regexEffect, newEffect);

const regexDeps = /isOpen, initialPO, initialVendorId, autoNextPONumber, vendors, products\]\);/;
code = code.replace(
  regexDeps,
  "isOpen, initialPO, initialVendorId, initialPresets, autoNextPONumber, vendors, products]);"
);

fs.writeFileSync('src/components/PurchaseOrderFormModal.tsx', code);
console.log("Patched PurchaseOrderFormModal.tsx");
