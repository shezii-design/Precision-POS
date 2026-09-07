const fs = require('fs');
let code = fs.readFileSync('src/components/StaffManagementModal.tsx', 'utf-8');

if (!code.includes("analytics: {")) {
  code = code.replace(
    "inventory_audit: { label: 'Inventory Audit & Logs', icon: FileBarChart, description: 'Stock adjustment histories & audit trails' }",
    "inventory_audit: { label: 'Inventory Audit & Logs', icon: FileBarChart, description: 'Stock adjustment histories & audit trails' },\n  analytics: { label: 'AI Analytics', icon: FileBarChart, description: 'Smart stock predictions' }"
  );
  fs.writeFileSync('src/components/StaffManagementModal.tsx', code);
  console.log("StaffManagementModal patched");
}
