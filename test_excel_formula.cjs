const XLSX = require('xlsx');

// Create a workbook with a formula
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
  ['Product Name', 'Image URL'],
  ['Test 1', '']
]);

ws['B2'].f = 'HYPERLINK("https://example.com/formula.jpg", "Click Here")';
ws['B2'].v = 'Click Here';

XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
const readWb = XLSX.read(buf, { type: 'buffer' });
const readWs = readWb.Sheets[readWb.SheetNames[0]];

// Check how the cell looks
console.log("Cell B2:", readWs['B2']);
