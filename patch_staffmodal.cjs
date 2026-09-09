const fs = require('fs');
let code = fs.readFileSync('src/components/StaffManagementModal.tsx', 'utf8');

const validationCode = `    if (!formData.email.trim()) {
      showNotification('Please enter an email or username.');
      return;
    }
    
    // Check for duplicate username/email
    const isDuplicate = employees.some(emp => 
      emp.email.toLowerCase() === formData.email.trim().toLowerCase() && emp.id !== formData.id
    );
    if (isDuplicate) {
      showNotification('Username / Email already exists. Please use a different one.');
      return;
    }
`;

code = code.replace(
  `    if (!formData.email.trim()) {
      showNotification('Please enter an email or username.');
      return;
    }`,
  validationCode
);

// We need to also add password input to staff management form since we are moving away from PIN-only.
// Let's check how the form fields are laid out.
fs.writeFileSync('src/components/StaffManagementModal.tsx', code);
console.log("Patched StaffManagementModal.tsx");
