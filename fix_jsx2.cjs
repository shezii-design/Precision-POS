const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

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

code = code.replace(
  /\) : viewMode === 'grid' \? \([\s\S]*?\)\s*:\s*\([\s\S]*?\n\s*\)\}/,
  replacement
);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed');
