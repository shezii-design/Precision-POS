const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldAuthInit = `  const [authState, setAuthState] = useState<AuthState>(() => {
    const stored = getStoredAuthState();
    // Always lock the app on startup for security
    return { ...stored, isLocked: true };
  });`;

const newAuthInit = `  const [authState, setAuthState] = useState<AuthState>(() => {
    const stored = getStoredAuthState();
    let shouldLock = true;
    
    // Check if within 24 hours
    if (stored.lastUnlockedAt && stored.rememberSession !== false) {
      const lastUnlockTime = new Date(stored.lastUnlockedAt).getTime();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      if (Date.now() - lastUnlockTime < ONE_DAY_MS) {
        shouldLock = false; // still valid for today
      }
    }
    
    return { ...stored, isLocked: shouldLock };
  });`;

code = code.replace(oldAuthInit, newAuthInit);
fs.writeFileSync('src/App.tsx', code);
console.log('patched app auth');
