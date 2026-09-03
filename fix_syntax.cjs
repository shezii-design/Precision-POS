const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// The faulty code has:
//   const handleOpenAddProduct = () => {
//     ...
//     setShowProductModal(true);
//   }, [isOnline]);
// 
//   const handleEditProduct = useCallback((prod: Product) => {
//     ...
//     setShowProductModal(true);
//   };

code = code.replace(
  `  // Handlers for Product Management
  const handleOpenAddProduct = () => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setEditingProduct(null);
    setShowProductModal(true);
  }, [isOnline]);

  const handleEditProduct = useCallback((prod: Product) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setEditingProduct(prod);
    setShowProductModal(true);
  };`,
  `  // Handlers for Product Management
  const handleOpenAddProduct = useCallback(() => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setEditingProduct(null);
    setShowProductModal(true);
  }, [isOnline]);

  const handleEditProduct = useCallback((prod: Product) => {
    if (!isOnline) { showToast('Offline Mode (Read-Only)', 'Cannot perform write/edit actions while offline.', ); return; }
    setEditingProduct(prod);
    setShowProductModal(true);
  }, [isOnline]);`
);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed syntax error');
