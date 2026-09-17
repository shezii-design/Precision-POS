const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

// Add onSavePdfEdits to props
code = code.replace(
  'interface InvoiceModalProps {\n  isOpen: boolean;\n  onClose: () => void;\n  sale: Sale | null;\n  customerReturns?: CustomerReturn[];\n}',
  'interface InvoiceModalProps {\n  isOpen: boolean;\n  onClose: () => void;\n  sale: Sale | null;\n  customerReturns?: CustomerReturn[];\n  onSavePdfEdits?: (saleId: string, edits: Record<string, string>) => void;\n}'
);

code = code.replace(
  '  customerReturns = [],\n}) => {',
  '  customerReturns = [],\n  onSavePdfEdits,\n}) => {'
);

// Add local edits state
code = code.replace(
  'const [isEditMode, setIsEditMode] = React.useState(false);',
  `const [isEditMode, setIsEditMode] = React.useState(false);
  const [edits, setEdits] = React.useState<Record<string, string>>({});
  
  React.useEffect(() => {
    if (sale?.pdfEdits) {
      setEdits(sale.pdfEdits);
    } else {
      setEdits({});
    }
  }, [sale]);

  const handleEditChange = (key: string, value: string) => {
    setEdits(prev => ({ ...prev, [key]: value }));
  };

  const handleToggleEdit = () => {
    if (isEditMode && onSavePdfEdits && sale) {
       onSavePdfEdits(sale.id, edits);
    }
    setIsEditMode(!isEditMode);
  };`
);

// Replace the Edit Toggle button onClick
code = code.replace(
  'onClick={() => setIsEditMode(!isEditMode)}',
  'onClick={handleToggleEdit}'
);
code = code.replace(
  "{isEditMode ? 'Lock Invoice' : 'Edit Invoice (For Print)'}",
  "{isEditMode ? 'Save & Lock PDF Edits' : 'Edit Invoice (For Print)'}"
);

// We need a helper to generate the editable span
// We'll replace the static editable spans with a generic one that uses edits
// Customer Name
code = code.replace(
  '<span contentEditable={isEditMode} suppressContentEditableWarning className={`outline-none px-1 -mx-1 rounded transition-colors ${isEditMode ? \'hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text\' : \'\'}`}>{sale.customerName}</span>',
  '<span contentEditable={isEditMode} suppressContentEditableWarning onBlur={(e) => handleEditChange("customerName", e.currentTarget.innerText)} className={`outline-none px-1 -mx-1 rounded transition-colors ${isEditMode ? \'hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text\' : \'\'}`}>{edits["customerName"] ?? sale.customerName}</span>'
);

// Customer Phone
code = code.replace(
  '<span contentEditable={isEditMode} suppressContentEditableWarning className={`outline-none px-1 -mx-1 rounded transition-colors ${isEditMode ? \'hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text\' : \'\'}`}>{sale.customerPhone}</span>',
  '<span contentEditable={isEditMode} suppressContentEditableWarning onBlur={(e) => handleEditChange("customerPhone", e.currentTarget.innerText)} className={`outline-none px-1 -mx-1 rounded transition-colors ${isEditMode ? \'hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text\' : \'\'}`}>{edits["customerPhone"] ?? sale.customerPhone}</span>'
);

// Item Display Name
code = code.replace(
  '<div contentEditable={isEditMode} suppressContentEditableWarning className={`font-bold text-slate-900 text-sm outline-none px-1 -mx-1 rounded whitespace-pre-wrap ${isEditMode ? "hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text min-h-[24px]" : ""}`}>\n                          {displayName}\n                        </div>',
  '<div contentEditable={isEditMode} suppressContentEditableWarning onBlur={(e) => handleEditChange(`item_name_${index}`, e.currentTarget.innerText)} className={`font-bold text-slate-900 text-sm outline-none px-1 -mx-1 rounded whitespace-pre-wrap ${isEditMode ? "hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text min-h-[24px]" : ""}`}>\n                          {edits[`item_name_${index}`] ?? displayName}\n                        </div>'
);

// Item Quantity
code = code.replace(
  '<span contentEditable={isEditMode} suppressContentEditableWarning className={`outline-none px-1 -mx-1 rounded transition-colors ${isEditMode ? \'hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text\' : \'\'}`}>{item.quantity}</span>',
  '<span contentEditable={isEditMode} suppressContentEditableWarning onBlur={(e) => handleEditChange(`item_qty_${index}`, e.currentTarget.innerText)} className={`outline-none px-1 -mx-1 rounded transition-colors ${isEditMode ? \'hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text\' : \'\'}`}>{edits[`item_qty_${index}`] ?? item.quantity}</span>'
);

// Item Unit Price
code = code.replace(
  '<span contentEditable={isEditMode} suppressContentEditableWarning className={`outline-none px-1 -mx-1 rounded transition-colors ${isEditMode ? \'hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text\' : \'\'}`}>{formatPKR(item.unitPrice)}</span>',
  '<span contentEditable={isEditMode} suppressContentEditableWarning onBlur={(e) => handleEditChange(`item_price_${index}`, e.currentTarget.innerText)} className={`outline-none px-1 -mx-1 rounded transition-colors ${isEditMode ? \'hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text\' : \'\'}`}>{edits[`item_price_${index}`] ?? formatPKR(item.unitPrice)}</span>'
);

// Item Total Price
code = code.replace(
  '<span contentEditable={isEditMode} suppressContentEditableWarning className={`outline-none px-1 -mx-1 rounded transition-colors ${isEditMode ? \'hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text\' : \'\'}`}>{formatPKR(item.totalPrice)}</span>',
  '<span contentEditable={isEditMode} suppressContentEditableWarning onBlur={(e) => handleEditChange(`item_total_${index}`, e.currentTarget.innerText)} className={`outline-none px-1 -mx-1 rounded transition-colors ${isEditMode ? \'hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text\' : \'\'}`}>{edits[`item_total_${index}`] ?? formatPKR(item.totalPrice)}</span>'
);

// Notes
code = code.replace(
  '<p contentEditable={isEditMode} suppressContentEditableWarning className={`text-slate-700 whitespace-pre-wrap font-medium leading-relaxed outline-none px-1 -mx-1 rounded ${isEditMode ? "hover:bg-slate-100 border border-dashed border-slate-400 cursor-text min-h-[40px]" : ""}`}>\n                    {sale.notes}\n                  </p>',
  '<p contentEditable={isEditMode} suppressContentEditableWarning onBlur={(e) => handleEditChange("notes", e.currentTarget.innerText)} className={`text-slate-700 whitespace-pre-wrap font-medium leading-relaxed outline-none px-1 -mx-1 rounded ${isEditMode ? "hover:bg-slate-100 border border-dashed border-slate-400 cursor-text min-h-[40px]" : ""}`}>\n                    {edits["notes"] ?? sale.notes}\n                  </p>'
);

// Empty Notes
code = code.replace(
  '<div contentEditable={isEditMode} suppressContentEditableWarning className={`border border-dashed border-slate-200 rounded-2xl p-4 text-center text-slate-400 text-xs outline-none ${isEditMode ? "hover:bg-slate-50 border-slate-400 cursor-text min-h-[40px]" : ""}`}>\n                  No additional remarks on this invoice\n                </div>',
  '<div contentEditable={isEditMode} suppressContentEditableWarning onBlur={(e) => handleEditChange("notes", e.currentTarget.innerText)} className={`border border-dashed border-slate-200 rounded-2xl p-4 text-center text-slate-400 text-xs outline-none ${isEditMode ? "hover:bg-slate-50 border-slate-400 cursor-text min-h-[40px]" : ""}`}>\n                  {edits["notes"] ?? "No additional remarks on this invoice"}\n                </div>'
);

// Subtotal
code = code.replace(
  '<span contentEditable={isEditMode} suppressContentEditableWarning className={`font-bold outline-none px-1 -mx-1 rounded transition-colors ${isEditMode ? "hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text text-slate-800" : "text-slate-800"}`}>{formatPKR(sale.subtotal)}</span>',
  '<span contentEditable={isEditMode} suppressContentEditableWarning onBlur={(e) => handleEditChange("subtotal", e.currentTarget.innerText)} className={`font-bold outline-none px-1 -mx-1 rounded transition-colors ${isEditMode ? "hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text text-slate-800" : "text-slate-800"}`}>{edits["subtotal"] ?? formatPKR(sale.subtotal)}</span>'
);

// Final Total
code = code.replace(
  '<span contentEditable={isEditMode} suppressContentEditableWarning className={`outline-none px-1 -mx-1 rounded transition-colors ${isEditMode ? "hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text text-red-700" : "text-red-700"}`}>{formatPKR(netInvoiceAmount)}</span>',
  '<span contentEditable={isEditMode} suppressContentEditableWarning onBlur={(e) => handleEditChange("netInvoiceAmount", e.currentTarget.innerText)} className={`outline-none px-1 -mx-1 rounded transition-colors ${isEditMode ? "hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text text-red-700" : "text-red-700"}`}>{edits["netInvoiceAmount"] ?? formatPKR(netInvoiceAmount)}</span>'
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
