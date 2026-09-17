const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

// Replace standard variables with edits map
code = code.replace(
  '<strong>Billed To:</strong> ${sale.customerName}<br>',
  '<strong>Billed To:</strong> ${edits["customerName"] ?? sale.customerName}<br>'
);
code = code.replace(
  '${sale.customerPhone ? `<strong>Phone:</strong> ${sale.customerPhone}<br>` : \'\'}',
  '${(edits["customerPhone"] ?? sale.customerPhone) ? `<strong>Phone:</strong> ${(edits["customerPhone"] ?? sale.customerPhone)}<br>` : \'\'}'
);
code = code.replace(
  '${sale.notes ? `<strong>Notes:</strong> ${sale.notes}` : \'\'}',
  '${(edits["notes"] ?? sale.notes) ? `<strong>Notes:</strong> ${(edits["notes"] ?? sale.notes)}` : \'\'}'
);

// Item Description
code = code.replace(
  '<strong>${formatItemInvoiceName(it, sale.invoiceNamingPreference)}</strong>',
  '<strong>${edits[`item_name_${idx}`] ?? formatItemInvoiceName(it, sale.invoiceNamingPreference)}</strong>'
);

// Item Qty
code = code.replace(
  '<td class="text-center">${it.quantity} ${it.unit}</td>',
  '<td class="text-center">${edits[`item_qty_${idx}`] ?? it.quantity} <span style="font-size:10px;color:#64748b;">${it.unit}</span></td>'
);

// Item Rate
code = code.replace(
  '<td class="text-right">${formatPKR(it.unitPrice)}</td>',
  '<td class="text-right">${edits[`item_price_${idx}`] ?? formatPKR(it.unitPrice)}</td>'
);

// Item Total
code = code.replace(
  '<strong>${formatPKR(metrics.netLineTotal)}</strong>',
  '<strong>${edits[`item_total_${idx}`] ?? formatPKR(metrics.netLineTotal)}</strong>'
);

// Subtotal
code = code.replace(
  '<span>Original Subtotal:</span><span>${formatPKR(sale.subtotal)}</span>',
  '<span>Original Subtotal:</span><span>${edits["subtotal"] ?? formatPKR(sale.subtotal)}</span>'
);

// Net total
code = code.replace(
  '<span>Net Adjusted Total:</span>\n        <span>${formatPKR(netInvoiceAmount)}</span>',
  '<span>Net Adjusted Total:</span>\n        <span>${edits["netInvoiceAmount"] ?? formatPKR(netInvoiceAmount)}</span>'
);
code = code.replace(
  '<span>Total Amount:</span><span>${formatPKR(sale.totalAmount)}</span>',
  '<span>Total Amount:</span><span>${edits["netInvoiceAmount"] ?? formatPKR(sale.totalAmount)}</span>'
);


fs.writeFileSync('src/components/InvoiceModal.tsx', code);
