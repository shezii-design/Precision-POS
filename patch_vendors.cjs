const fs = require('fs');
let code = fs.readFileSync('src/components/VendorsPage.tsx', 'utf8');

code = code.replace(/onOpenAddVendorModal: \(\) => void;/g, 'onOpenAddVendorModal?: () => void;');
code = code.replace(/onOpenEditVendorModal: \(vendor: Vendor\) => void;/g, 'onOpenEditVendorModal?: (vendor: Vendor) => void;');
code = code.replace(/onOpenCashModal: \(vendorId\?: string\) => void;/g, 'onOpenCashModal?: (vendorId?: string) => void;');
code = code.replace(/onOpenConfigureLinksModal: \(vendor: Vendor\) => void;/g, 'onOpenConfigureLinksModal?: (vendor: Vendor) => void;');
code = code.replace(/onDeleteVendor: \(id: string\) => void;/g, 'onDeleteVendor?: (id: string) => void;');

// Add conditional rendering
code = code.replace(
  /<button\s+onClick=\{\(\) => onOpenCashModal\(\)\}[\s\S]*?<\/button>/,
  `{onOpenCashModal && (<button
              onClick={() => onOpenCashModal()}
              className="flex-1 sm:flex-initial justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-black rounded-xl shadow-xs transition-colors flex items-center gap-1.5 sm:gap-2 cursor-pointer"
            >
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
              Record Payment
            </button>)}`
);

code = code.replace(
  /<button\s+onClick=\{onOpenAddVendorModal\}[\s\S]*?<\/button>/,
  `{onOpenAddVendorModal && (<button
              onClick={onOpenAddVendorModal}
              className="flex-1 sm:flex-initial justify-center px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs sm:text-sm font-black rounded-xl shadow-xs transition-colors flex items-center gap-1.5 sm:gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
              <span className="whitespace-nowrap">Add Vendor</span>
            </button>)}`
);

code = code.replace(
  /\(\s*<button\s+onClick=\{onOpenAddVendorModal\}[\s\S]*?<\/button>\s*\)/,
  '( onOpenAddVendorModal ? <button onClick={onOpenAddVendorModal} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-black rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"><Plus className="w-4 h-4 stroke-[3]" /> Add Your First Vendor</button> : null )'
);

code = code.replace(
  /<button\s+onClick=\{\(\) => onOpenEditVendorModal\(vendor\)\}[\s\S]*?<\/button>/g,
  `{onOpenEditVendorModal && (<button
                          onClick={() => onOpenEditVendorModal(vendor)}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1.5"
                          title="Edit Vendor"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>)}`
);

code = code.replace(
  /<button\s+onClick=\{\(\) => onDeleteVendor\(vendor\.id\)\}[\s\S]*?<\/button>/g,
  `{onDeleteVendor && (<button
                          onClick={() => onDeleteVendor(vendor.id)}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:bg-red-100 text-slate-400 text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1.5"
                          title="Delete Vendor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>)}`
);

fs.writeFileSync('src/components/VendorsPage.tsx', code);
console.log("Patched VendorsPage.tsx");
