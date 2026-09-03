const fs = require('fs');

function limitMap(file, oldStr, newStr) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(file, content);
}

limitMap('src/components/PurchaseFormModal.tsx', 'filteredProducts.map(p => (', 'filteredProducts.slice(0, 50).map(p => (');
limitMap('src/components/CompanyMachineModal.tsx', 'filteredProducts.map((prod) => (', 'filteredProducts.slice(0, 50).map((prod) => (');
limitMap('src/components/QuotationFormModal.tsx', 'filteredProducts.map(p => (', 'filteredProducts.slice(0, 50).map(p => (');
limitMap('src/components/ConfigureLinkedProductsModal.tsx', 'filteredProducts.map(product => {', 'filteredProducts.slice(0, 100).map(product => {');

console.log('Fixed limits');
