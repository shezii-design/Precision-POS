const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add the onSavePdfEdits handler
code = code.replace(
  '<InvoiceModal\n        isOpen={showInvoiceModal}\n        onClose={() => setShowInvoiceModal(false)}\n        sale={activeSaleForInvoice}\n      />',
  `<InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        sale={activeSaleForInvoice}
        onSavePdfEdits={(saleId, edits) => {
          const updatedSales = sales.map(s => s.id === saleId ? { ...s, pdfEdits: edits } : s);
          setSales(updatedSales);
          saveStoredSales(updatedSales);
          syncSalesToSupabase(updatedSales).catch(console.error);
        }}
      />`
);

fs.writeFileSync('src/App.tsx', code);
