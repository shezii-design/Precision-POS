const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Add import for VirtuosoGrid
code = code.replace(
  "import { Filter, LayoutGrid, Plus, Search, Table as TableIcon } from 'lucide-react';",
  "import { Filter, LayoutGrid, Plus, Search, Table as TableIcon } from 'lucide-react';\nimport { VirtuosoGrid } from 'react-virtuoso';"
);

// Remove pagination logic
code = code.replace(
  /  const \[currentPage, setCurrentPage\] = useState\(1\);\n  const itemsPerPage = 50;\n/g,
  ""
);
code = code.replace(
  /  useEffect\(\(\) => \{ setCurrentPage\(1\); \}, \[primarySearch, dimensionQuery, brandFilter, typeFilter, locationFilter, cabinFilter, stockStatusFilter, sortBy\]\);\n/g,
  ""
);
code = code.replace(
  /  const paginatedProducts = filteredProducts\.slice\(0, currentPage \* itemsPerPage\);\n  const hasMoreProducts = paginatedProducts\.length < filteredProducts\.length;\n/g,
  ""
);

// Replace grid render block
const gridRegex = /<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">[\s\S]*?<\/div>\s*\{hasMoreProducts[\s\S]*?<\/div>\s*\}/;

const virtuosoGridStr = `<VirtuosoGrid
                style={{ height: '70vh' }}
                data={filteredProducts}
                totalCount={filteredProducts.length}
                listClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                itemClassName="h-full"
                itemContent={(index, product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    pricingSettings={pricingSettings}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                    onDuplicate={handleDuplicateProduct}
                    onPrintLabel={handleOpenLabelPrint}
                    onAdjustStock={handleOpenStockAdjust}
                    onQuickUpdateCost={handleQuickUpdateCost}
                    onViewHistory={handleOpenProductHistory}
                  />
                )}
              />`;

code = code.replace(gridRegex, virtuosoGridStr);

// Replace table render block
const tableRegex = /<ProductTable\s*products=\{paginatedProducts\}[\s\S]*?\/>\s*\{hasMoreProducts[\s\S]*?<\/div>\s*\}/;

const tableStr = `<ProductTable
                products={filteredProducts}
                pricingSettings={pricingSettings}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
                onDuplicate={handleDuplicateProduct}
                onPrintLabel={handleOpenLabelPrint}
                onAdjustStock={handleOpenStockAdjust}
                onQuickUpdateCost={handleQuickUpdateCost}
                onViewHistory={handleOpenProductHistory}
              />`;

code = code.replace(tableRegex, tableStr);

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx updated');
