const fs = require('fs');
let code = fs.readFileSync('src/components/CustomersPage.tsx', 'utf8');

// The "+ Add Customer" button
code = code.replace(
  /<button\s+onClick=\{\(\) => \{\s*setEditingCustomer\(null\);\s*setCustomerModalType\('customer'\);\s*setShowCustomerModal\(true\);\s*\}\}[\s\S]*?<\/button>/,
  `{isActionAllowed(currentEmployee, 'canManageCustomers') && (<button
            onClick={() => {
              setEditingCustomer(null);
              setCustomerModalType('customer');
              setShowCustomerModal(true);
            }}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <User className="w-4 h-4 text-slate-500" />
            <span>+ Add Customer</span>
          </button>)}`
);

// The "+ Add Company" button
code = code.replace(
  /<button\s+onClick=\{\(\) => \{\s*setEditingCustomer\(null\);\s*setCustomerModalType\('company'\);\s*setShowCustomerModal\(true\);\s*\}\}[\s\S]*?<\/button>/,
  `{isActionAllowed(currentEmployee, 'canManageCustomers') && (<button
            onClick={() => {
              setEditingCustomer(null);
              setCustomerModalType('company');
              setShowCustomerModal(true);
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            <span>+ Add Company (Demand Tab)</span>
          </button>)}`
);

// The empty state Add button
code = code.replace(
  /<button\s+onClick=\{\(\) => \{\s*setEditingCustomer\(null\);\s*setCustomerModalType\(activeTab === 'companies' \? 'company' : 'customer'\);\s*setShowCustomerModal\(true\);\s*\}\}[\s\S]*?<\/button>/,
  `{isActionAllowed(currentEmployee, 'canManageCustomers') && (<button
                onClick={() => {
                  setEditingCustomer(null);
                  setCustomerModalType(activeTab === 'companies' ? 'company' : 'customer');
                  setShowCustomerModal(true);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
              >
                + Add {activeTab === 'companies' ? 'Company' : 'Customer'}
              </button>)}`
);

// Edit button in list
code = code.replace(
  /<button\s+onClick=\{\(\) => \{\s*e\.stopPropagation\(\);\s*setEditingCustomer\(cust\);\s*setCustomerModalType\(cust\.type \|\| 'customer'\);\s*setShowCustomerModal\(true\);\s*\}\}[\s\S]*?<\/button>/g,
  `{isActionAllowed(currentEmployee, 'canManageCustomers') && (<button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCustomer(cust);
                          setCustomerModalType(cust.type || 'customer');
                          setShowCustomerModal(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>)}`
);

// Add Payment (in top header)
code = code.replace(
  /<button\s+onClick=\{\(\) => \{\s*setSelectedCustomerForPayment\(null\);\s*setShowPaymentModal\(true\);\s*\}\}[\s\S]*?<\/button>/,
  `{isActionAllowed(currentEmployee, 'canRecordCustomerPayments') && (<button
              onClick={() => {
                setSelectedCustomerForPayment(null);
                setShowPaymentModal(true);
              }}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer hidden sm:flex"
            >
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>Record Payment</span>
            </button>)}`
);

// Payment button in list
code = code.replace(
  /<button\s+onClick=\{\(\) => \{\s*e\.stopPropagation\(\);\s*setSelectedCustomerForPayment\(cust\);\s*setShowPaymentModal\(true\);\s*\}\}[\s\S]*?<\/button>/g,
  `{isActionAllowed(currentEmployee, 'canRecordCustomerPayments') && (<button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomerForPayment(cust);
                          setShowPaymentModal(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Record Payment"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                      </button>)}`
);

// New Sale button in list
code = code.replace(
  /<button\s+onClick=\{\(\) => \{\s*e\.stopPropagation\(\);\s*onOpenNewSale\(cust\.id\);\s*\}\}[\s\S]*?<\/button>/g,
  `{isActionAllowed(currentEmployee, 'canCreateSales') && (<button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenNewSale(cust.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="New Sale for Customer"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>)}`
);

// Delete button in list
code = code.replace(
  /<button\s+onClick=\{\(\) => \{\s*e\.stopPropagation\(\);\s*if \(window\.confirm\([\s\S]*?\}\}[\s\S]*?<\/button>/g,
  `{isActionAllowed(currentEmployee, 'canManageCustomers') && (<button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to delete this customer? All their history will be lost!')) {
                            handleDeleteCustomer(cust.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete customer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>)}`
);

fs.writeFileSync('src/components/CustomersPage.tsx', code);
console.log("Patched CustomersPage.tsx buttons");
