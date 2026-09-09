const fs = require('fs');
let code = fs.readFileSync('src/components/CustomersPage.tsx', 'utf8');

code = code.replace(
  /interface CustomersPageProps \{/,
  "import { isActionAllowed } from '../services/auth';\nimport { EmployeeAccount } from '../types';\n\ninterface CustomersPageProps {\n  currentEmployee: EmployeeAccount | null;"
);

code = code.replace(
  /export const CustomersPage: React\.FC\<CustomersPageProps\> = \(\{/,
  "export const CustomersPage: React.FC<CustomersPageProps> = ({\n  currentEmployee,"
);

fs.writeFileSync('src/components/CustomersPage.tsx', code);
console.log("Added currentEmployee to CustomersPage");
