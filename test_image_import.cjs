const XLSX = require('xlsx');

// Create a workbook with a regular URL
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
  ['Product Name', 'Image URL'],
  ['Test 1', 'https://example.com/regular.jpg']
]);

XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
const readWb = XLSX.read(buf, { type: 'buffer' });
const readWs = readWb.Sheets[readWb.SheetNames[0]];

// My patch logic:
if (readWs['!ref']) {
  const range = XLSX.utils.decode_range(readWs['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = readWs[cellAddress];
      if (!cell) continue;
      
      let extractedUrl = null;
      if (cell.l && cell.l.Target) {
        extractedUrl = cell.l.Target;
      } else if (cell.f && typeof cell.f === 'string') {
        const match = cell.f.match(/HYPERLINK\(\s*"([^"]+)"/i);
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

const rawJson = XLSX.utils.sheet_to_json(readWs);
console.log(rawJson);

const parsedRows = [];
for (const row of rawJson) {
  const normalized = {};
  for (const key of Object.keys(row)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    normalized[cleanKey] = row[key];
  }
  
  const image = String(normalized['imageurl'] || normalized['image'] || normalized['imagelink'] || normalized['picture'] || normalized['url'] || normalized['link'] || normalized['productimage'] || normalized['itemimage'] || '').trim();
  parsedRows.push({ name: normalized['productname'], image });
}

console.log(parsedRows);
