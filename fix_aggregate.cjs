const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf8');

const aggregatedHelper = `
  const aggregatedItems = useMemo(() => {
    if (!sale) return [];
    const map = new Map();
    
    sale.items.forEach(item => {
      const displayName = formatItemInvoiceName(item, sale.invoiceNamingPreference);
      const key = \`\${displayName}|\${item.unitPrice}|\${item.unit}\`;
      
      if (map.has(key)) {
        const existing = map.get(key);
        existing.quantity += item.quantity;
        existing.returnedQuantity = (existing.returnedQuantity || 0) + (item.returnedQuantity || 0);
        existing.netQuantity = (existing.netQuantity || 0) + (item.netQuantity || 0);
        existing.totalPrice += item.totalPrice;
        
        if (item.locationName && (!existing.locationName || !existing.locationName.includes(item.locationName))) {
           existing.locationName = existing.locationName ? \`\${existing.locationName}, \${item.locationName}\` : item.locationName;
        }
        if (item.cabinNumber && (!existing.cabinNumber || !existing.cabinNumber.includes(item.cabinNumber))) {
           existing.cabinNumber = existing.cabinNumber ? \`\${existing.cabinNumber}, \${item.cabinNumber}\` : item.cabinNumber;
        }
      } else {
        map.set(key, JSON.parse(JSON.stringify(item)));
      }
    });
    
    return Array.from(map.values());
  }, [sale]);
`;

content = content.replace(
  'const printContainerRef = useRef<HTMLDivElement | null>(null);',
  'const printContainerRef = useRef<HTMLDivElement | null>(null);\n' + aggregatedHelper
);

fs.writeFileSync('src/components/InvoiceModal.tsx', content);
