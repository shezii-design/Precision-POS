const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// I will just replace the whole ternary block for the products rendering with the correct fragment wrapper.
// Let's do it cleanly by searching for `viewMode === 'grid' ? (` and `) : (` and `)}` etc.

const target = `          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedProducts.map((product) => (
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
              ))}
            </div>
            
            {hasMoreProducts && (
              <div className="flex justify-center mt-6 mb-4">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="px-6 py-2.5 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold rounded-xl shadow-sm transition-all"
                >
                  Load More ({filteredProducts.length - paginatedProducts.length} remaining)
                </button>
              </div>
            )}

          ) : (
            <ProductTable
              products={paginatedProducts}
              pricingSettings={pricingSettings}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              onDuplicate={handleDuplicateProduct}
              onPrintLabel={handleOpenLabelPrint}
              onAdjustStock={handleOpenStockAdjust}
              onQuickUpdateCost={handleQuickUpdateCost}
              onViewHistory={handleOpenProductHistory}
            />
            
            {hasMoreProducts && (
              <div className="flex justify-center mt-6 mb-4">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="px-6 py-2.5 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold rounded-xl shadow-sm transition-all"
                >
                  Load More ({filteredProducts.length - paginatedProducts.length} remaining)
                </button>
              </div>
            )}

          )}`;

const replacement = `          ) : viewMode === 'grid' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginatedProducts.map((product) => (
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
                ))}
              </div>
              
              {hasMoreProducts && (
                <div className="flex justify-center mt-6 mb-4">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="px-6 py-2.5 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold rounded-xl shadow-sm transition-all"
                  >
                    Load More ({filteredProducts.length - paginatedProducts.length} remaining)
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <ProductTable
                products={paginatedProducts}
                pricingSettings={pricingSettings}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
                onDuplicate={handleDuplicateProduct}
                onPrintLabel={handleOpenLabelPrint}
                onAdjustStock={handleOpenStockAdjust}
                onQuickUpdateCost={handleQuickUpdateCost}
                onViewHistory={handleOpenProductHistory}
              />
              
              {hasMoreProducts && (
                <div className="flex justify-center mt-6 mb-4">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="px-6 py-2.5 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold rounded-xl shadow-sm transition-all"
                  >
                    Load More ({filteredProducts.length - paginatedProducts.length} remaining)
                  </button>
                </div>
              )}
            </>
          )}`;

let code2 = code;
// To handle any potential whitespace diff, I'll extract it programmatically instead
code2 = code.replace(
  /) : viewMode === 'grid' \? \([\s\S]*?\)\s*:\s*\([\s\S]*?\n\s*\)\}/,
  replacement
);

if(code2 === code) {
  console.log('Failed to replace, fallback to manual string replacement');
  // Just rewrite App.tsx between line 2435 and 2490
  const lines = code.split('\n');
  const start = lines.findIndex(l => l.includes(`) : viewMode === 'grid' ? (`));
  const end = lines.findIndex((l, i) => i > start && l.trim() === `)}` && lines[i-1].includes(`</div>`)); // approx
  console.log('start:', start, 'end:', end);
} else {
  fs.writeFileSync('src/App.tsx', code2);
  console.log('Successfully patched JSX ternary with Fragments');
}
