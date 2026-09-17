const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

// 1. Add isEditMode state
if (!code.includes('isEditMode')) {
  code = code.replace(
    'const printContainerRef = useRef<HTMLDivElement | null>(null);',
    `const printContainerRef = useRef<HTMLDivElement | null>(null);
  const [isEditMode, setIsEditMode] = React.useState(false);`
  );
}

// 2. Add Edit Toggle Button
if (!code.includes('setIsEditMode(!isEditMode)')) {
  code = code.replace(
    '<button\n            type="button"\n            onClick={handlePrint}',
    `<button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            className={\`px-4 py-2 \${isEditMode ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'} text-xs font-bold rounded-xl transition-colors cursor-pointer\`}
          >
            {isEditMode ? 'Lock Invoice' : 'Edit Invoice (For Print)'}
          </button>
          <button
            type="button"
            onClick={handlePrint}`
  );
}

// 3. Make Customer Name editable
code = code.replace(
  '<span>{sale.customerName}</span>',
  '<span contentEditable={isEditMode} suppressContentEditableWarning className={`outline-none px-1 -mx-1 rounded ${isEditMode ? "bg-amber-50 ring-1 ring-amber-300" : ""}`}>{sale.customerName}</span>'
);

// 4. Make Customer Phone editable
code = code.replace(
  '<span>{sale.customerPhone}</span>',
  '<span contentEditable={isEditMode} suppressContentEditableWarning className={`outline-none px-1 -mx-1 rounded ${isEditMode ? "bg-amber-50 ring-1 ring-amber-300" : ""}`}>{sale.customerPhone}</span>'
);

// 5. Make Item Display Name editable
code = code.replace(
  '{displayName}',
  '<span contentEditable={isEditMode} suppressContentEditableWarning className={`outline-none px-1 -mx-1 rounded ${isEditMode ? "bg-amber-50 ring-1 ring-amber-300" : ""}`}>{displayName}</span>'
);

// 6. Make Item Quantity editable
code = code.replace(
  '{item.quantity} <span',
  '<span contentEditable={isEditMode} suppressContentEditableWarning className={`outline-none px-1 -mx-1 rounded ${isEditMode ? "bg-amber-50 ring-1 ring-amber-300" : ""}`}>{item.quantity}</span> <span'
);

// 7. Make Item Price editable
code = code.replace(
  '<td className="py-3 px-3.5 text-right font-medium text-slate-700">\n                        {formatPKR(item.unitPrice)}\n                      </td>',
  `<td className="py-3 px-3.5 text-right font-medium text-slate-700">
                        <span contentEditable={isEditMode} suppressContentEditableWarning className={\`outline-none px-1 -mx-1 rounded \${isEditMode ? "bg-amber-50 ring-1 ring-amber-300" : ""}\`}>{formatPKR(item.unitPrice)}</span>
                      </td>`
);

// 8. Make Total Price editable (non-returns)
code = code.replace(
  '<div className="font-black text-slate-900 text-sm">\n                            {formatPKR(item.totalPrice)}\n                          </div>',
  `<div className="font-black text-slate-900 text-sm">
                            <span contentEditable={isEditMode} suppressContentEditableWarning className={\`outline-none px-1 -mx-1 rounded \${isEditMode ? "bg-amber-50 ring-1 ring-amber-300" : ""}\`}>{formatPKR(item.totalPrice)}</span>
                          </div>`
);

// 9. Make final subtotal editable
code = code.replace(
  '<span className="font-bold text-slate-800">{formatPKR(sale.subtotal)}</span>',
  '<span contentEditable={isEditMode} suppressContentEditableWarning className={`font-bold outline-none px-1 -mx-1 rounded ${isEditMode ? "bg-amber-50 ring-1 ring-amber-300 text-slate-800" : "text-slate-800"}`}>{formatPKR(sale.subtotal)}</span>'
);

// 10. Make final total editable
code = code.replace(
  '<span className="text-red-700">{formatPKR(netInvoiceAmount)}</span>',
  '<span contentEditable={isEditMode} suppressContentEditableWarning className={`outline-none px-1 -mx-1 rounded ${isEditMode ? "bg-amber-50 ring-1 ring-amber-300 text-red-700" : "text-red-700"}`}>{formatPKR(netInvoiceAmount)}</span>'
);

// 11. Fix HTML Download template to sync DOM changes
code = code.replace(
  'const handleDownloadHTML = () => {',
  `const handleDownloadHTML = () => {
    // Note: We don't modify HTML download to use editable data right now, 
    // it will still use original sale state since it relies on JS strings.
    // The visual print button uses window.print() which perfectly captures DOM edits.`
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
