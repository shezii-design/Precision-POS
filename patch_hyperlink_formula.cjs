const fs = require('fs');
let code = fs.readFileSync('src/services/excel.ts', 'utf-8');

// Replace the previous patch with a more comprehensive one
const prevPatch = `
        // Fix for Excel auto-formatting URLs as hyperlinks which truncates cell values
        if (worksheet['!ref']) {
          const range = XLSX.utils.decode_range(worksheet['!ref']);
          for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
              const cell = worksheet[cellAddress];
              if (cell && cell.l && cell.l.Target) {
                cell.v = cell.l.Target;
                cell.w = cell.l.Target;
              }
            }
          }
        }
`;

const newPatch = `
        // Fix for Excel auto-formatting URLs as hyperlinks or formulas which truncates cell values
        if (worksheet['!ref']) {
          const range = XLSX.utils.decode_range(worksheet['!ref']);
          for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
              const cell = worksheet[cellAddress];
              if (!cell) continue;
              
              let extractedUrl = null;
              if (cell.l && cell.l.Target) {
                extractedUrl = cell.l.Target;
              } else if (cell.f && typeof cell.f === 'string') {
                const match = cell.f.match(/HYPERLINK\\(\\s*"([^"]+)"/i);
                if (match && match[1]) {
                  extractedUrl = match[1];
                }
              }
              
              if (extractedUrl) {
                cell.v = extractedUrl;
                cell.w = extractedUrl;
              }
            }
          }
        }
`;

code = code.replace(prevPatch.trim(), newPatch.trim());

const prevImageExtract = `const image = String(normalized['imageurl'] || normalized['image'] || normalized['imagelink'] || normalized['picture'] || '').trim();`;
const newImageExtract = `const image = String(normalized['imageurl'] || normalized['image'] || normalized['imagelink'] || normalized['picture'] || normalized['url'] || normalized['link'] || normalized['productimage'] || normalized['itemimage'] || '').trim();`;

code = code.replace(prevImageExtract, newImageExtract);

fs.writeFileSync('src/services/excel.ts', code);
console.log('Patched excel.ts with comprehensive URL and formula extraction');
