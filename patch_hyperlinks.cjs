const fs = require('fs');
let code = fs.readFileSync('src/services/excel.ts', 'utf-8');

const injection = `
        const worksheet = workbook.Sheets[firstSheetName];
        
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

        const rawJson: Array<Record<string, unknown>> = XLSX.utils.sheet_to_json(worksheet);
`;

code = code.replace(
  "        const worksheet = workbook.Sheets[firstSheetName];\n        const rawJson: Array<Record<string, unknown>> = XLSX.utils.sheet_to_json(worksheet);",
  injection.trim()
);

fs.writeFileSync('src/services/excel.ts', code);
console.log('Patched excel.ts with hyperlink extraction');
