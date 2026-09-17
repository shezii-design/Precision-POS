const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

// 1. Add activeTab state
code = code.replace(
  'const [isEditMode, setIsEditMode] = React.useState(false);',
  'const [activeTab, setActiveTab] = React.useState(\'original\');\n  const [isEditMode, setIsEditMode] = React.useState(false);'
);

// 2. Add Tabs UI
code = code.replace(
  '{/* Printable Invoice Container */}\n        <div ref={printContainerRef}',
  `{/* Tabs */}\n        <div className="flex border-b border-slate-200 print:hidden bg-slate-50">\n          <button \n            onClick={() => { setActiveTab('original'); setIsEditMode(false); }}\n            className={\`flex-1 py-3 text-sm font-bold transition-colors \${activeTab === 'original' ? 'text-red-600 border-b-2 border-red-600 bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}\`}\n          >\n            System Record (Original)\n          </button>\n          <button \n            onClick={() => setActiveTab('print')}\n            className={\`flex-1 py-3 text-sm font-bold transition-colors \${activeTab === 'print' ? 'text-red-600 border-b-2 border-red-600 bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}\`}\n          >\n            Print / Edit Receipt\n          </button>\n        </div>\n\n        {/* Printable Invoice Container */}\n        <div ref={printContainerRef}`
);

// 3. Make aggregatedItems mapping conditional
code = code.replace(
  '{aggregatedItems.map((item, index) => {',
  '{(activeTab === \'original\' ? sale.items : aggregatedItems).map((item, index) => {'
);

// 4. Update the Name field
code = code.replace(
  '{edits[`item_name_${index}`] ?? displayName}',
  '{activeTab === \'original\' ? item.productName : (edits[`item_name_${index}`] ?? displayName)}'
);

// 5. Update Locations logic
code = code.replace(
  '{(item.locationName || item.cabinNumber) && (',
  '{(activeTab === \'original\') && (item.locationName || item.cabinNumber) && ('
);

// 6. Update Qty
code = code.replace(
  '{edits[`item_qty_${index}`] ?? item.quantity}',
  '{activeTab === \'original\' ? item.quantity : (edits[`item_qty_${index}`] ?? item.quantity)}'
);

// 7. Update Price
code = code.replace(
  '{edits[`item_price_${index}`] ?? formatPKR(item.unitPrice)}',
  '{activeTab === \'original\' ? formatPKR(item.unitPrice) : (edits[`item_price_${index}`] ?? formatPKR(item.unitPrice))}'
);

// 8. Update Item Total
code = code.replace(
  '{edits[`item_total_${index}`] ?? formatPKR(item.totalPrice)}',
  '{activeTab === \'original\' ? formatPKR(item.totalPrice) : (edits[`item_total_${index}`] ?? formatPKR(item.totalPrice))}'
);

// 9. Update Notes
code = code.replace(
  '{edits["notes"] ?? sale.notes}',
  '{activeTab === \'original\' ? sale.notes : (edits["notes"] ?? sale.notes)}'
);
code = code.replace(
  '{edits["notes"] ?? "No additional remarks on this invoice"}',
  '{activeTab === \'original\' ? "No additional remarks on this invoice" : (edits["notes"] ?? "No additional remarks on this invoice")}'
);

// 10. Hide Edit Button
code = code.replace(
  '<button\n            type="button"\n            onClick={handleToggleEdit}',
  '{activeTab === \'print\' && (<button\n            type="button"\n            onClick={handleToggleEdit}'
);
code = code.replace(
  ' {isEditMode ? \'Save & Lock PDF Edits\' : \'Edit Invoice (For Print)\'}\n          </button>',
  ' {isEditMode ? \'Save & Lock PDF Edits\' : \'Edit Invoice (For Print)\'}\n          </button>)}'
);

// 11. Customer Details Updates
code = code.replace(
  '{edits["customerName"] ?? sale.customerName}',
  '{activeTab === \'original\' ? sale.customerName : (edits["customerName"] ?? sale.customerName)}'
);
code = code.replace(
  '{edits["customerPhone"] ?? sale.customerPhone}',
  '{activeTab === \'original\' ? sale.customerPhone : (edits["customerPhone"] ?? sale.customerPhone)}'
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
console.log('Tabs logic applied');
