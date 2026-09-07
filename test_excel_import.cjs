const XLSX = require('xlsx');

// Create a workbook with a long URL that is formatted as a hyperlink
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
  ['Product Name', 'Image URL'],
  ['Test 1', 'https://example.com/very/long/url/that/might/be/truncated/by/excel/visually/but/is/it/really.jpg']
]);

// Add hyperlink
ws['B2'].l = { Target: 'https://example.com/very/long/url/that/might/be/truncated/by/excel/visually/but/is/it/really.jpg' };
// Simulate Excel's visual truncation in the value
ws['B2'].v = 'https://example.com/very...';
ws['B2'].w = 'https://example.com/very...';

XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

// Write to a buffer to simulate reading from file
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

// Now simulate the read logic in parseFileForImport
const readWb = XLSX.read(buf, { type: 'buffer' });
const readWs = readWb.Sheets[readWb.SheetNames[0]];

// My patch logic:
if (readWs['!ref']) {
  const range = XLSX.utils.decode_range(readWs['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = readWs[cellAddress];
      if (cell && cell.l && cell.l.Target) {
        cell.v = cell.l.Target;
        cell.w = cell.l.Target;
      }
    }
  }
}

const rawJson = XLSX.utils.sheet_to_json(readWs);
console.log(rawJson);
