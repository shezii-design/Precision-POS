const fs = require('fs');
let code = fs.readFileSync('src/components/NewSaleModal.tsx', 'utf8');

// 1. Add vendors to props
code = code.replace(
  "customers: Customer[];",
  "customers: Customer[];\n  vendors?: Vendor[];"
);

// 2. Add 'vendor' to customerMode
code = code.replace(
  "const [customerMode, setCustomerMode] = useState<'walkin' | 'select' | 'new'>('walkin');",
  "const [customerMode, setCustomerMode] = useState<'walkin' | 'select' | 'new' | 'vendor'>('walkin');"
);

// 3. Add vendor state
code = code.replace(
  "const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);",
  "const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);\n  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);\n  const [vendorSearch, setVendorSearch] = useState<string>('');\n  const [showVendorDropdown, setShowVendorDropdown] = useState<boolean>(false);"
);

// 4. Update effective names
code = code.replace(
  "if (customerMode === 'select' && selectedCustomer) return selectedCustomer.name;",
  "if (customerMode === 'select' && selectedCustomer) return selectedCustomer.name;\n    if (customerMode === 'vendor' && selectedVendor) return selectedVendor.name;"
);
code = code.replace(
  "if (customerMode === 'select' && selectedCustomer) return selectedCustomer.phone || '';",
  "if (customerMode === 'select' && selectedCustomer) return selectedCustomer.phone || '';\n    if (customerMode === 'vendor' && selectedVendor) return selectedVendor.phone || '';"
);

fs.writeFileSync('src/components/NewSaleModal.tsx', code);
