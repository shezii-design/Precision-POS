const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace('registeredDevices, stockLogs, pricingSettings', 'registeredDevices: getStoredRegisteredDevices(), stockLogs, pricingSettings');
code = code.replace('employees, registeredDevices, stockLogs, pricingSettings,', 'employees, stockLogs, pricingSettings,');

fs.writeFileSync('src/App.tsx', code);
console.log('patched devices');
