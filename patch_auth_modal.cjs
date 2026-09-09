const fs = require('fs');
let code = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');

code = code.replace(
  "import { authenticateWithWebAuthn, saveAuthState } from '../services/auth';",
  "import { authenticateWithWebAuthn, saveAuthState, authenticateEmployee } from '../services/auth';"
);

code = code.replace(
  /const handlePinInput = \([\s\S]*?const verifyPin = \([\s\S]*?};\n/m,
  `const handlePinInput = (digit: string) => {
    setErrorMessage('');
    if (enteredPin.length < 6) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      
      const correctMasterPin = authState.pin || '1234';
      if (next === correctMasterPin) {
        verifyPin(next);
        return;
      }
      
      const empRes = authenticateEmployee(next, undefined, deviceInfo.deviceId);
      if (empRes.success) {
        verifyPin(next, empRes.employee?.id);
        return;
      }
      
      if (next.length === Math.max(6, correctMasterPin.length)) {
        verifyPin(next);
      }
    }
  };

  const handlePinBackspace = () => {
    setEnteredPin(prev => prev.slice(0, -1));
    setErrorMessage('');
  };

  const verifyPin = (pinToTest: string, matchedEmployeeId?: string) => {
    const correctPin = authState.pin || '1234';
    if (pinToTest === correctPin) {
      setErrorMessage('');
      setEnteredPin('');
      // Admin master override
      onUpdateAuthState({ ...authState, currentUserId: 'admin-master', isLocked: false });
      onAuthSuccess();
    } else if (matchedEmployeeId) {
      setErrorMessage('');
      setEnteredPin('');
      onUpdateAuthState({ ...authState, currentUserId: matchedEmployeeId, isLocked: false });
      onAuthSuccess();
    } else {
      setErrorMessage('Incorrect PIN.');
      setEnteredPin('');
    }
  };
`
);

fs.writeFileSync('src/components/AuthModal.tsx', code);
console.log("Patched AuthModal");
