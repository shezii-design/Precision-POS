const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardPage.tsx', 'utf8');

code = code.replace(/onOpenNewSale: \(\) => void;/g, 'onOpenNewSale?: () => void;');
code = code.replace(/onOpenNewPurchase: \(vendorId\?: string\) => void;/g, 'onOpenNewPurchase?: (vendorId?: string) => void;');
code = code.replace(/onOpenCreatePO: \(\) => void;/g, 'onOpenCreatePO?: () => void;');
code = code.replace(/onOpenCreateDemand: \(\) => void;/g, 'onOpenCreateDemand?: () => void;');
code = code.replace(/onOpenAddProduct: \(\) => void;/g, 'onOpenAddProduct?: () => void;');

code = code.replace(
  /<button\s+type="button"\s+onClick=\{onOpenNewSale\}[\s\S]*?<\/button>/,
  `{onOpenNewSale && (<button
              type="button"
              onClick={onOpenNewSale}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Open POS Cashier Billing (F5)"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>New Sale</span>
            </button>)}`
);

// We need to also patch the other buttons in the header if they exist. Let's see what else is there.

fs.writeFileSync('src/components/DashboardPage.tsx', code);
console.log("Patched DashboardPage.tsx");
