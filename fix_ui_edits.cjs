const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

// Fix quantity
code = code.replace(
  '<span contentEditable={isEditMode} suppressContentEditableWarning className={`outline-none px-1 -mx-1 rounded ${isEditMode ? "hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text" : ""}`}>{item.quantity}</span>',
  '<span contentEditable={isEditMode} suppressContentEditableWarning onBlur={(e) => handleEditChange(`item_qty_${index}`, e.currentTarget.innerText)} className={`outline-none px-1 -mx-1 rounded ${isEditMode ? "hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text" : ""}`}>{edits[`item_qty_${index}`] ?? item.quantity}</span>'
);

// Fix unit price
code = code.replace(
  '<span contentEditable={isEditMode} suppressContentEditableWarning className={`outline-none px-1 -mx-1 rounded ${isEditMode ? "hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text" : ""}`}>{formatPKR(item.unitPrice)}</span>',
  '<span contentEditable={isEditMode} suppressContentEditableWarning onBlur={(e) => handleEditChange(`item_price_${index}`, e.currentTarget.innerText)} className={`outline-none px-1 -mx-1 rounded ${isEditMode ? "hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text" : ""}`}>{edits[`item_price_${index}`] ?? formatPKR(item.unitPrice)}</span>'
);

// Fix total price (in non-returned block)
code = code.replace(
  '<span contentEditable={isEditMode} suppressContentEditableWarning className={`outline-none px-1 -mx-1 rounded ${isEditMode ? "hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text" : ""}`}>{formatPKR(item.totalPrice)}</span>',
  '<span contentEditable={isEditMode} suppressContentEditableWarning onBlur={(e) => handleEditChange(`item_total_${index}`, e.currentTarget.innerText)} className={`outline-none px-1 -mx-1 rounded ${isEditMode ? "hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text" : ""}`}>{edits[`item_total_${index}`] ?? formatPKR(item.totalPrice)}</span>'
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
