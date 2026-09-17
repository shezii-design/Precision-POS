const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

code = code.replace(
  '<span contentEditable={isEditMode} suppressContentEditableWarning className={`font-bold outline-none px-1 -mx-1 rounded ${isEditMode ? "hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text text-slate-800" : "text-slate-800"}`}>{formatPKR(sale.subtotal)}</span>',
  '<span contentEditable={isEditMode} suppressContentEditableWarning onBlur={(e) => handleEditChange("subtotal", e.currentTarget.innerText)} className={`font-bold outline-none px-1 -mx-1 rounded ${isEditMode ? "hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text text-slate-800" : "text-slate-800"}`}>{activeTab === \'original\' ? formatPKR(sale.subtotal) : (edits["subtotal"] ?? formatPKR(sale.subtotal))}</span>'
);

code = code.replace(
  '<span contentEditable={isEditMode} suppressContentEditableWarning className={`outline-none px-1 -mx-1 rounded ${isEditMode ? "hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text text-red-700" : "text-red-700"}`}>{formatPKR(netInvoiceAmount)}</span>',
  '<span contentEditable={isEditMode} suppressContentEditableWarning onBlur={(e) => handleEditChange("netInvoiceAmount", e.currentTarget.innerText)} className={`outline-none px-1 -mx-1 rounded ${isEditMode ? "hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text text-red-700" : "text-red-700"}`}>{activeTab === \'original\' ? formatPKR(netInvoiceAmount) : (edits["netInvoiceAmount"] ?? formatPKR(netInvoiceAmount))}</span>'
);

// We need to also fix brand name inside the modal for 'original' tab, since we replaced it with 'King Filter House' unconditionally earlier.
// Wait, the user said "as it is as the orginal one that shows original system names prices added during sale and even brand name on invoice"
// In the current file, we replaced PRECISION INVENTORY with King Filter House unconditionally.
// Let's conditionally show PRECISION INVENTORY for the 'original' tab, and 'King Filter House' for the 'print' tab.

code = code.replace(
  '<h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">\\n                  King Filter House\\n                </h1>',
  '<h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">\\n                  {activeTab === \\\'original\\\' ? \\\'PRECISION INVENTORY\\\' : \\\'King Filter House\\\'}\\n                </h1>'
);

code = code.replace(
  '<p className="text-xs text-slate-500 font-medium mt-0.5">\\n                Your Filteration Solution<br />03226600734, 03222000734\\n              </p>',
  '<p className="text-xs text-slate-500 font-medium mt-0.5">\\n                {activeTab === \\\'original\\\' ? \\\'Automotive Filters & Precision Machinery Spares\\\' : <span dangerouslySetInnerHTML={{ __html: \\\'Your Filteration Solution<br />03226600734, 03222000734\\\' }} />}\\n              </p>'
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
console.log('Tabs logic 2 applied');
