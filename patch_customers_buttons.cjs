const fs = require('fs');
let code = fs.readFileSync('src/components/CustomersPage.tsx', 'utf8');

code = code.replace(
  /<button\s+onClick=\{\(\) => setShowCustomerModal\(true\)\}[\s\S]*?<\/button>/g,
  `{isActionAllowed(currentEmployee, 'canManageCustomers') && (<button
              onClick={() => setShowCustomerModal(true)}
              className="flex-1 sm:flex-initial justify-center px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs sm:text-sm font-black rounded-xl shadow-xs transition-colors flex items-center gap-1.5 sm:gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
              <span className="whitespace-nowrap">Add Customer / Company</span>
            </button>)}`
);

// We have multiple setShowCustomerModal(true) buttons. 
// Some are edit buttons, some are Add. The above regex might override edits with "Add Customer / Company".

fs.writeFileSync('src/components/CustomersPage.tsx.temp', code);
