const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

// The clean style for editable fields (no yellow boxes, just clean dashed lines that disappear on print)
const editStyle = "outline-none px-1 -mx-1 rounded transition-colors ${isEditMode ? 'hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text' : ''}";

// Replace the ugly yellow backgrounds with the clean style
code = code.replace(/bg-amber-50 ring-1 ring-amber-300/g, "hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text");

// Make the displayName an editable DIV so they can press Enter and add lines
code = code.replace(
  '<div className="font-bold text-slate-900 text-sm">\n                          {displayName}\n                        </div>',
  '<div contentEditable={isEditMode} suppressContentEditableWarning className={`font-bold text-slate-900 text-sm outline-none px-1 -mx-1 rounded whitespace-pre-wrap ${isEditMode ? "hover:bg-slate-100 border-b border-dashed border-slate-400 cursor-text min-h-[24px]" : ""}`}>\n                          {displayName}\n                        </div>'
);

// If there are notes, make the notes block editable as well
code = code.replace(
  '<p className="text-slate-700 whitespace-pre-line font-medium leading-relaxed">\n                    {sale.notes}\n                  </p>',
  '<p contentEditable={isEditMode} suppressContentEditableWarning className={`text-slate-700 whitespace-pre-wrap font-medium leading-relaxed outline-none px-1 -mx-1 rounded ${isEditMode ? "hover:bg-slate-100 border border-dashed border-slate-400 cursor-text min-h-[40px]" : ""}`}>\n                    {sale.notes}\n                  </p>'
);

// Allow editing the empty notes block too
code = code.replace(
  '<div className="border border-dashed border-slate-200 rounded-2xl p-4 text-center text-slate-400 text-xs">\n                  No additional remarks on this invoice\n                </div>',
  '<div contentEditable={isEditMode} suppressContentEditableWarning className={`border border-dashed border-slate-200 rounded-2xl p-4 text-center text-slate-400 text-xs outline-none ${isEditMode ? "hover:bg-slate-50 border-slate-400 cursor-text min-h-[40px]" : ""}`}>\n                  No additional remarks on this invoice\n                </div>'
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
