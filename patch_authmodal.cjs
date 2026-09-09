const fs = require('fs');

const authModalContent = `import React, { useState } from 'react';
import { AuthState, DeviceInfo } from '../types';
import { authenticateEmployee } from '../services/auth';
import { ShieldCheck, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  isLockScreenMode?: boolean;
  onClose: () => void;
  authState: AuthState;
  onAuthSuccess: () => void;
  deviceInfo: DeviceInfo;
  onUpdateAuthState: (state: AuthState) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  authState,
  onAuthSuccess,
  deviceInfo,
  onUpdateAuthState,
}) => {
  const [enteredEmail, setEnteredEmail] = useState<string>('');
  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!enteredEmail.trim() || !enteredPassword) {
      setErrorMessage('Please enter both username/email and password/PIN.');
      return;
    }

    setIsLoggingIn(true);
    
    // Simulate slight network delay for feel
    await new Promise(r => setTimeout(r, 600));

    const empRes = authenticateEmployee(enteredEmail, enteredPassword, deviceInfo.deviceId);
    
    setIsLoggingIn(false);

    if (empRes.success && empRes.employee) {
      setErrorMessage('');
      setEnteredEmail('');
      setEnteredPassword('');
      
      onUpdateAuthState({ 
        ...authState, 
        currentUserId: empRes.employee.id, 
        isLocked: false,
        lastUnlockedAt: new Date().toISOString()
      });
      onAuthSuccess();
    } else {
      setErrorMessage(empRes.error || 'Invalid username or password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-red-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-br from-red-600 to-red-700 p-8 text-white text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md mx-auto flex items-center justify-center border border-white/20 mb-4 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-black tracking-tight">System Login</h2>
          <p className="text-sm text-red-100 mt-1 opacity-90">Enter your credentials to access the system</p>
        </div>

        <div className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2 animate-in fade-in zoom-in-95">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Username / Email</label>
              <input
                type="text"
                autoFocus
                value={enteredEmail}
                onChange={(e) => setEnteredEmail(e.target.value)}
                placeholder="Enter username or email"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all"
              />
            </div>

            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Password / PIN</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={enteredPassword}
                  onChange={(e) => setEnteredPassword(e.target.value)}
                  placeholder="Enter your password or PIN"
                  className="w-full px-4 py-3 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold rounded-xl text-sm transition-colors mt-2 shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Secure Login</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
`;

fs.writeFileSync('src/components/AuthModal.tsx', authModalContent);
console.log("Updated AuthModal");
