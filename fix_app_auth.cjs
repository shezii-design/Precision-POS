const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace activeEmployeeId state with authState.currentUserId since authState handles authentication globally.
// Actually, activeEmployeeId is probably updated via SwitchUserModal.
// Let's just update activeEmployeeId when AuthModal succeeds.

const onAuthSuccessSnippet = `onAuthSuccess={() => {
          if (authState.currentUserId) {
            setActiveEmployeeId(authState.currentUserId);
          }
          setAuthState(prev => ({ ...prev, isLocked: false, lastUnlockedAt: new Date().toISOString() }));
          setShowSecurityModal(false);`;

code = code.replace(
  `onAuthSuccess={() => {
          setAuthState(prev => ({ ...prev, isLocked: false, lastUnlockedAt: new Date().toISOString() }));
          setShowSecurityModal(false);`,
  onAuthSuccessSnippet
);

// We need to also check if we can remove SwitchUserModal entirely and replace it with a "Logout" action.
// In Navbar.tsx, `onOpenSwitchUser` is called when switching users. In App.tsx, `onOpenSwitchUser` opens SwitchUserModal.
// Instead of SwitchUserModal, `onOpenSwitchUser` should just LOGOUT.

code = code.replace(
  `onOpenSwitchUser={() => setShowSwitchUserModal(true)}`,
  `onOpenSwitchUser={() => { setAuthState(prev => ({ ...prev, isLocked: true, currentUserId: undefined })); }}`
);

// We can remove SwitchUserModal state and usage.
fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx auth logic");
