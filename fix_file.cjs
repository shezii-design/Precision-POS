const fs = require('fs');
let code = fs.readFileSync('src/components/NewSaleModal.tsx', 'utf8');

const faultyStr = `)}
              </div>
            )}\` : ''}
                                </span>
                              )}
                            </div>`;

const restored = `)}
              </div>
            )}
            </div>

            {/* PRODUCT SEARCH & ADD */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Search & Add Products
              </label>
              <div className="relative">
                <input
                  type="text"
                  ref={productSearchRef}
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  onFocus={() => setShowProductDropdown(true)}
                  className="w-full px-4 py-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  placeholder="Scan barcode, search by name, or internal ID..."
                />
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                {productSearchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductSearchTerm('');
                      setShowProductDropdown(false);
                      if (productSearchRef.current) {
                        productSearchRef.current.focus();
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Dropdown for products */}
                {showProductDropdown && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-y-auto custom-scrollbar overflow-x-hidden">
                    {filteredProducts.length > 0 ? (
                      <div className="flex flex-col py-1">
                        {filteredProducts.map(prod => {
                          const prodTiers = getProductAvailableTiers(prod, pricingSettings);
                          const retailPrice = prodTiers.length > 0 ? prodTiers[0].price : prod.costPrice;
                          const cost = prod.costPrice;

                          return (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => {
                                handleAddProductToSale(prod);
                                setProductSearchTerm('');
                                setShowProductDropdown(false);
                                if (productSearchRef.current) productSearchRef.current.focus();
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 flex flex-col justify-center border-b border-slate-50 last:border-0 transition-colors"
                            >
                              <div className="flex w-full items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 truncate">{prod.name}</span>
                                  {prod.internalId && (
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold shrink-0">
                                      #{prod.internalId}
                                    </span>
                                  )}
                                  {prod.dimensions && (
                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold shrink-0">
                                      {prod.dimensions}
                                    </span>
                                  )}
                                </div>
                            </div>`;

code = code.replace(faultyStr, restored);
fs.writeFileSync('src/components/NewSaleModal.tsx', code);
