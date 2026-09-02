const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace('customerReturns, vendors, vendorLedger, vendorReturns, purchases, purchaseOrders,', 'customerReturns, vendors, vendorLedger: ledgerEntries, vendorReturns, purchases, purchaseOrders,');
code = code.replace('customerReturns, vendors, vendorLedger, vendorReturns, purchases, purchaseOrders,', 'customerReturns, vendors, ledgerEntries, vendorReturns, purchases, purchaseOrders,');

fs.writeFileSync('src/App.tsx', code);
console.log('patched');
