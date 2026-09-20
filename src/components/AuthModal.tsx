import React, { useState } from 'react';
import { AuthState, DeviceInfo, EmployeeAccount } from '../types';
import { authenticateEmployee } from '../services/auth';
import { 
  ShieldCheck, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Loader2, 
  KeyRound 
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  isLockScreenMode?: boolean;
  onClose: () => void;
  authState: AuthState;
  onAuthSuccess: (employee?: EmployeeAccount) => void;
  deviceInfo: DeviceInfo;
  onUpdateAuthState: (state: AuthState) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  isLockScreenMode = false,
  onClose,
  authState,
  onAuthSuccess,
  deviceInfo,
  onUpdateAuthState,
}) => {
  // Login form state
  const [enteredEmail, setEnteredEmail] = useState<string>('');
  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const ident = enteredEmail.trim();
    const pass = enteredPassword.trim();

    if (!ident && !pass) {
      setErrorMessage('Please enter your username/email and password or PIN.');
      return;
    }

    setIsLoggingIn(true);
    
    try {
      // Slight delay for feedback feel
      await new Promise(r => setTimeout(r, 200));

      // Support flexible inputs: either username + pass/PIN, or single PIN/password
      const empRes = await authenticateEmployee(
        ident,
        pass || undefined,
        deviceInfo.deviceId
      );
      
      setIsLoggingIn(false);

      if (empRes.success && empRes.employee) {
        const emp = empRes.employee;
        setErrorMessage('');
        setEnteredEmail('');
        setEnteredPassword('');
        
        onUpdateAuthState({ 
          ...authState, 
          currentUserId: emp.id, 
          isLocked: false,
          lastUnlockedAt: new Date().toISOString()
        });
        onAuthSuccess(emp);
      } else {
        setErrorMessage(empRes.error || 'Invalid credentials. Access denied.');
      }
    } catch (err: unknown) {
      setIsLoggingIn(false);
      const msg = err instanceof Error ? err.message : 'Network drop or server unreachable. Please verify connection and try again.';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-red-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
        {!isLockScreenMode && (
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 rounded-full transition-colors cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        )}

        <div className="bg-gradient-to-br from-red-600 to-red-700 p-7 text-white text-center relative">
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md mx-auto flex items-center justify-center border border-white/20 mb-3 shadow-inner">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-black tracking-tight">
            System Login
          </h2>
          <p className="text-xs text-red-100 mt-1 opacity-90 max-w-xs mx-auto">
            Enter your verified employee credentials or quick PIN to access the ERP
          </p>
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
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Username / Email / Phone / Name</label>
              <input
                type="text"
                autoFocus
                value={enteredEmail}
                onChange={(e) => setEnteredEmail(e.target.value)}
                placeholder="e.g. admin, cashier1, or leave blank if PIN-only"
                className="w-full px-4 py-3 bg-slate-100 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all"
              />
            </div>

            <div className="space-y-1.5 relative">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Password or Quick PIN</label>
                <span className="text-[11px] text-slate-400">4-6 digit PIN supported</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={enteredPassword}
                  onChange={(e) => setEnteredPassword(e.target.value)}
                  placeholder="Enter password or 4-6 digit PIN"
                  className="w-full px-4 py-3 pr-10 bg-slate-100 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-[11px] text-slate-500 font-medium">
                💡 <strong>Quick Sign In:</strong> Store staff and cashiers can enter their 4-6 digit security PIN in either field to sign in instantly.
              </p>
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
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In to ERP</span>
                </>
              )}
            </button>

            <div className="pt-3 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                PrecisionPOS RBAC Authentication System
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
