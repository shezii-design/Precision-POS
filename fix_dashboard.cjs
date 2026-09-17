const fs = require('fs');
let content = fs.readFileSync('src/components/DashboardPage.tsx', 'utf8');

// Replace property names for CustomerReturns
content = content.replace(/r\.returnDate/g, 'r.date');
content = content.replace(/r\.totalReturnAmount/g, 'r.totalRefundAmount');
content = content.replace(/r\.restockFee/g, 'r.deductionOrRestockFee');

// Replace property names for VendorReturns
content = content.replace(/r\.totalReturnAmount/g, 'r.totalAmount'); // wait, VendorReturn has totalAmount

// Replace property names for Sales
content = content.replace(/s\.discount\b/g, 's.discountAmount');
content = content.replace(/s\.paidAmount\b/g, 's.amountReceived');
content = content.replace(/s\.remainingBalance\b/g, 's.balanceDue');

// Replace property names for Purchases
content = content.replace(/p\.paidAmount\b/g, 'p.amountPaid');

fs.writeFileSync('src/components/DashboardPage.tsx', content);
