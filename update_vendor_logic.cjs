const fs = require('fs');
let code = fs.readFileSync('src/components/NewSaleModal.tsx', 'utf8');

const initRegex = /if \(editingSale\.customerId\) \{[\s\S]*?\} else \{/;
const initReplacement = `if (editingSale.isVendorSale && editingSale.vendorId && vendors) {
          const matchedVendor = vendors.find(v => v.id === editingSale.vendorId);
          if (matchedVendor) {
            setCustomerMode('vendor');
            setSelectedVendor(matchedVendor);
            setVendorSearch(matchedVendor.name);
          }
        } else if (editingSale.customerId) {
          const matchedCust = customers.find(c => c.id === editingSale.customerId);
          if (matchedCust) {
            setCustomerMode('select');
            setSelectedCustomer(matchedCust);
            setCustomerSearch(matchedCust.name);
          } else {
            setCustomerMode('new');
            setNewCustomerName(editingSale.customerName || '');
            setNewCustomerPhone(editingSale.customerPhone || '');
          }
        } else {`;
code = code.replace(initRegex, initReplacement);

const saveRegex = /const newSale: Sale = \{[\s\S]*?isVendorSale: editingSale\?\.isVendorSale,\n    \};/;
const saveReplacement = `const newSale: Sale = {
      id: saleIdToUse,
      date: finalSaleDateIso,
      customerId: customerMode === 'vendor' ? (selectedVendor?.id || '') : (selectedCustomer?.id || editingSale?.customerId),
      customerName: effectiveCustomerName,
      customerPhone: effectiveCustomerPhone,
      items: finalSaleItems,
      subtotal,
      discountType,
      discountValue: Number(discountValue) || 0,
      discountAmount,
      totalAmount,
      amountReceived: numericReceived,
      paymentType,
      paymentStatus,
      balanceDue,
      changeGiven,
      invoiceNamingPreference: namingChoice,
      notes: saleNotes.trim(),
      createdAt: editingSale ? editingSale.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      vendorId: customerMode === 'vendor' ? selectedVendor?.id : (customerMode === 'new' || customerMode === 'walkin' ? undefined : editingSale?.vendorId),
      vendorName: customerMode === 'vendor' ? selectedVendor?.name : (customerMode === 'new' || customerMode === 'walkin' ? undefined : editingSale?.vendorName),
      isVendorSale: customerMode === 'vendor'
    };`;
code = code.replace(saveRegex, saveReplacement);

fs.writeFileSync('src/components/NewSaleModal.tsx', code);
