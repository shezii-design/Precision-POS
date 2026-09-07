const XLSX = require('xlsx');
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([['Name', 'Link'], ['A', 'Click Here']]);
ws['B2'].l = { Target: 'https://example.com/img.png' };
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
console.log(XLSX.utils.sheet_to_json(ws));
