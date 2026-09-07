const XLSX = require('xlsx');
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([['Name', 'Image URL'], ['A', 'Click Here']]);
ws['B2'].l = { Target: 'https://example.com/img.png' };

const range = XLSX.utils.decode_range(ws['!ref']);
for (let R = range.s.r; R <= range.e.r; ++R) {
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
    const cell = ws[cellAddress];
    if (cell && cell.l && cell.l.Target) {
      cell.v = cell.l.Target;
      cell.w = cell.l.Target;
    }
  }
}

console.log(XLSX.utils.sheet_to_json(ws));
