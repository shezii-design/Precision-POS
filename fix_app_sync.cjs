const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const syncCode = `
  useEffect(() => {
    if (authState.currentUserId && authState.currentUserId !== activeEmployeeId) {
      setActiveEmployeeId(authState.currentUserId);
    }
  }, [authState.currentUserId]);

  useEffect(() => {
`;

code = code.replace(
  `  useEffect(() => {
    saveStoredActiveEmployeeId(activeEmployeeId);`,
  syncCode + `    saveStoredActiveEmployeeId(activeEmployeeId);`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx auth sync");
