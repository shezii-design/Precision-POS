const fs = require('fs');
let code = fs.readFileSync('src/components/NewSaleModal.tsx', 'utf8');

code = code.replace(
  "  Sale,\n  SaleItem\n} from '../types';",
  "  Sale,\n  SaleItem,\n  Vendor\n} from '../types';"
);

code = code.replace(
  "const NewSaleModal: React.FC<NewSaleModalProps> = ({\n  isOpen,\n  onClose,\n  products,\n  customers,\n  sales,",
  "const NewSaleModal: React.FC<NewSaleModalProps> = ({\n  isOpen,\n  onClose,\n  products,\n  customers,\n  vendors,\n  sales,"
);

fs.writeFileSync('src/components/NewSaleModal.tsx', code);
