const fs = require('fs');
let code = fs.readFileSync('src/components/BulkImportModal.tsx', 'utf-8');

const target = '                        <span className="text-slate-400 text-[11px]">({row.brandName} • {row.typeName})</span>';
const replacement = '                        <span className="text-slate-400 text-[11px]">({row.brandName} • {row.typeName})</span>\n                        {row.image && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold">Image</span>}';

code = code.replace(target, replacement);

fs.writeFileSync('src/components/BulkImportModal.tsx', code);
console.log('Patched BulkImportModal preview to show image badge');
