const fs = require('fs');
let code = fs.readFileSync('src/components/StaffManagementModal.tsx', 'utf-8');

if (!code.includes("analytics: {")) {
  code = code.replace(
    "audit_logs: { label: 'Audit Logs', icon: ClipboardList, description: 'Historical system and movement audit logs' },",
    "audit_logs: { label: 'Audit Logs', icon: ClipboardList, description: 'Historical system and movement audit logs' },\n  analytics: { label: 'AI Analytics', icon: ClipboardList, description: 'Smart stock predictions' },"
  );
  fs.writeFileSync('src/components/StaffManagementModal.tsx', code);
  console.log("StaffManagementModal patched for analytics");
} else {
  console.log("analytics already present");
}
