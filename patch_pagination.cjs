const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Add states
code = code.replace(`  const [dimensionQuery, setDimensionQuery] = useState<Partial<Product['dimensions']>>({});`, `  const [dimensionQuery, setDimensionQuery] = useState<Partial<Product['dimensions']>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;`);

// Reset page on filter changes (we can just do it via a useEffect)
code = code.replace(`  const filteredProducts = useMemo(() => {`, `  useEffect(() => { setCurrentPage(1); }, [primarySearch, dimensionQuery, brandFilter, typeFilter, locationFilter, cabinFilter, stockStatusFilter, sortBy]);
  
  const filteredProducts = useMemo(() => {`);

// Paginated products
code = code.replace(`  // Filtered and Sorted Products`, `  // Filtered and Sorted Products`);
code = code.replace(`  const nextInternalId = getNextInternalId(products);`, `  const nextInternalId = getNextInternalId(products);
  
  const paginatedProducts = filteredProducts.slice(0, currentPage * itemsPerPage);
  const hasMoreProducts = paginatedProducts.length < filteredProducts.length;`);

// Replace render array
code = code.replace(`{filteredProducts.map((product) => (`, `{paginatedProducts.map((product) => (`);
code = code.replace(`products={filteredProducts}`, `products={paginatedProducts}`);

// Add Load More button
const loadMoreBlock = `
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
`;

code = code.replace(`              ))}
            </div>
          ) : (`, `              ))}
            </div>
            ${loadMoreBlock}
          ) : (`);

code = code.replace(`              onViewHistory={handleOpenProductHistory}
            />
          )}`, `              onViewHistory={handleOpenProductHistory}
            />
            ${loadMoreBlock}
          )}`);

fs.writeFileSync('src/App.tsx', code);
console.log('Patched App.tsx with pagination');
