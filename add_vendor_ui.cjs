const fs = require('fs');
let code = fs.readFileSync('src/components/NewSaleModal.tsx', 'utf8');

const modeBtnRegex = /<button\n                  type="button"\n                  onClick=\{handleSetNewCustomer\}[\s\S]*?\+ New Customer\n                <\/button>/;
const modeBtnReplacement = `<button
                  type="button"
                  onClick={handleSetNewCustomer}
                  className={\`flex-1 sm:flex-initial text-center px-2.5 sm:px-3 py-1 rounded-lg transition-all cursor-pointer \${
                    customerMode === 'new'
                      ? 'bg-white text-red-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }\`}
                >
                  + New Customer
                </button>
                {vendors && vendors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setCustomerMode('vendor'); setSelectedVendor(null); setVendorSearch(''); }}
                    className={\`flex-1 sm:flex-initial text-center px-2.5 sm:px-3 py-1 rounded-lg transition-all cursor-pointer \${
                      customerMode === 'vendor'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }\`}
                  >
                    Sale to Vendor
                  </button>
                )}`;
code = code.replace(modeBtnRegex, modeBtnReplacement);

const newCustomerBlockRegex = /\{customerMode === 'new' && \([\s\S]*?\}\)/;
const newCustomerBlockReplacement = `{customerMode === 'new' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    placeholder="e.g. 0300 1234567"
                  />
                </div>
              </div>
            )}
            
            {customerMode === 'vendor' && (
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={vendorSearch}
                    onChange={(e) => {
                      setVendorSearch(e.target.value);
                      setShowVendorDropdown(true);
                      if (!e.target.value) setSelectedVendor(null);
                    }}
                    onFocus={() => setShowVendorDropdown(true)}
                    className="w-full px-3 py-2 pl-9 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="Search vendor name..."
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  {vendorSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setVendorSearch('');
                        setSelectedVendor(null);
                        setShowVendorDropdown(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {showVendorDropdown && (vendorSearch || !selectedVendor) && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                    {(vendors || []).filter(v => v.name.toLowerCase().includes(vendorSearch.toLowerCase())).map((vend) => (
                      <button
                        key={vend.id}
                        type="button"
                        onClick={() => {
                          setSelectedVendor(vend);
                          setVendorSearch(vend.name);
                          setShowVendorDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex flex-col cursor-pointer border-b border-slate-100 last:border-0"
                      >
                        <span className="font-bold text-slate-900">{vend.name}</span>
                        {vend.phone && <span className="text-[10px] text-slate-500">{vend.phone}</span>}
                      </button>
                    ))}
                    {(vendors || []).filter(v => v.name.toLowerCase().includes(vendorSearch.toLowerCase())).length === 0 && (
                      <div className="px-3 py-4 text-center text-[11px] text-slate-500 font-medium">
                        No vendors found.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}`;
code = code.replace(newCustomerBlockRegex, newCustomerBlockReplacement);

fs.writeFileSync('src/components/NewSaleModal.tsx', code);
