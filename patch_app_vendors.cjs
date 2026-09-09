const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/onOpenAddVendorModal=\{handleOpenAddVendor\}/g, 
  "onOpenAddVendorModal={isActionAllowed(currentEmployee, 'canManageVendors') ? handleOpenAddVendor : undefined}");

code = code.replace(/onOpenEditVendorModal=\{handleOpenEditVendor\}/g, 
  "onOpenEditVendorModal={isActionAllowed(currentEmployee, 'canManageVendors') ? handleOpenEditVendor : undefined}");

code = code.replace(/onDeleteVendor=\{handleDeleteVendor\}/g, 
  "onDeleteVendor={isActionAllowed(currentEmployee, 'canManageVendors') ? handleDeleteVendor : undefined}");

code = code.replace(/onOpenCashModal=\{\(id\) => handleOpenVendorCashModal\(id\)\}/g, 
  "onOpenCashModal={isActionAllowed(currentEmployee, 'canRecordVendorPayments') ? (id) => handleOpenVendorCashModal(id) : undefined}");

code = code.replace(/onOpenConfigureLinksModal=\{handleOpenConfigureLinksModal\}/g, 
  "onOpenConfigureLinksModal={isActionAllowed(currentEmployee, 'canManageVendors') ? handleOpenConfigureLinksModal : undefined}");

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx Vendors actions");
