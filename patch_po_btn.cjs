const fs = require('fs');
let code = fs.readFileSync('src/components/PurchaseOrderFormModal.tsx', 'utf-8');

const target = `<button
                                type="button"
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                              >`;
const replacement = `<button
                                type="button"
                                onClick={() => handleAddProduct(prod)}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                              >`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/PurchaseOrderFormModal.tsx', code);
console.log('patched PO form add button');
