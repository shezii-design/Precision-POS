const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace handleEditProduct
code = code.replace(
  `  const handleEditProduct = (prod: Product) => {`,
  `  const handleEditProduct = useCallback((prod: Product) => {`
).replace(
  `    setShowProductModal(true);\n  };`,
  `    setShowProductModal(true);\n  }, [isOnline]);`
);

// Replace handleDeleteProduct
code = code.replace(
  `  const handleDeleteProduct = (id: string) => {\n    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }\n    if (window.confirm('Are you sure you want to delete this product from inventory?')) {\n      setProducts(products.filter(p => p.id !== id));\n    }\n  };`,
  `  const handleDeleteProduct = useCallback((id: string) => {\n    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }\n    if (window.confirm('Are you sure you want to delete this product from inventory?')) {\n      setProducts(prev => prev.filter(p => p.id !== id));\n    }\n  }, [isOnline]);`
);

// Replace handleDuplicateProduct
code = code.replace(
  `  const handleDuplicateProduct = (prod: Product) => {\n    const nextId = getNextInternalId(products);\n    const duplicated: Product = {\n      ...prod,\n      id: \`prod-\${Date.now()}\`,\n      internalId: nextId,\n      name: \`\${prod.name} (Copy)\`,\n      createdAt: new Date().toISOString(),\n      updatedAt: new Date().toISOString(),\n    };\n    setProducts([duplicated, ...products]);\n  };`,
  `  const handleDuplicateProduct = useCallback((prod: Product) => {\n    setProducts(prev => {\n      const nextId = getNextInternalId(prev);\n      const duplicated: Product = {\n        ...prod,\n        id: \`prod-\${Date.now()}\`,\n        internalId: nextId,\n        name: \`\${prod.name} (Copy)\`,\n        createdAt: new Date().toISOString(),\n        updatedAt: new Date().toISOString(),\n      };\n      return [duplicated, ...prev];\n    });\n  }, []);`
);

// Replace handleQuickUpdateCost
code = code.replace(
  `  const handleQuickUpdateCost = (productId: string, newCost: number) => {\n    const updated = products.map(p => {\n      if (p.id === productId) {\n        // Regenerate tier selling prices based on new cost unless locked\n        const nextPrices = generateProductSellingPrices(newCost, pricingSettings, p.sellingPrices);\n        return {\n          ...p,\n          costPrice: newCost,\n          sellingPrices: nextPrices,\n          updatedAt: new Date().toISOString(),\n        };\n      }\n      return p;\n    });\n    setProducts(updated);\n  };`,
  `  const handleQuickUpdateCost = useCallback((productId: string, newCost: number) => {\n    setProducts(prev => prev.map(p => {\n      if (p.id === productId) {\n        const nextPrices = generateProductSellingPrices(newCost, pricingSettings, p.sellingPrices);\n        return {\n          ...p,\n          costPrice: newCost,\n          sellingPrices: nextPrices,\n          updatedAt: new Date().toISOString(),\n        };\n      }\n      return p;\n    }));\n  }, [pricingSettings]);`
);

// handleOpenStockAdjust
code = code.replace(
  `  const handleOpenStockAdjust = (prod: Product) => {`,
  `  const handleOpenStockAdjust = useCallback((prod: Product) => {`
).replace(
  `    setShowStockModal(true);\n  };`,
  `    setShowStockModal(true);\n  }, [isOnline]);`
);

// handleOpenLabelPrint
code = code.replace(
  `  const handleOpenLabelPrint = (prod: Product) => {`,
  `  const handleOpenLabelPrint = useCallback((prod: Product) => {`
).replace(
  `    setShowLabelModal(true);\n  };`,
  `    setShowLabelModal(true);\n  }, []);`
);

// handleOpenProductHistory
code = code.replace(
  `  const handleOpenProductHistory = (prod: Product) => {`,
  `  const handleOpenProductHistory = useCallback((prod: Product) => {`
).replace(
  `    setShowProductHistoryModal(true);\n  };`,
  `    setShowProductHistoryModal(true);\n  }, []);`
);

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx handlers patched');
