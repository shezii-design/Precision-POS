import React, { useState } from 'react';
import { DeviceInfo, EmployeeAccount } from '../types';
import { authenticateEmployee, validateEmployeeDeviceAccess } from '../services/auth';
import { detectDeviceInfo } from '../services/device';
import { 
  Users, 
  KeyRound, 
  ShieldCheck, 
  AlertCircle, 
  X, 
  CheckCircle2, 
  Delete, 
  Lock, 
  Monitor, 
  Laptop, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export interface SwitchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: EmployeeAccount[];
  currentUserId?: string;
  activeEmployeeId?: string;
  currentDeviceId?: string;
  deviceInfo?: DeviceInfo;
  onSwitchUser?: (employee: EmployeeAccount) => void;
  onSelectEmployee?: (employee: EmployeeAccount) => void;
  onOpenStaffManagement?: () => void;
}

export const SwitchUserModal: React.FC<SwitchUserModalProps> = ({
  isOpen,
  onClose,
  employees,
  currentUserId,
  activeEmployeeId,
  currentDeviceId,
  deviceInfo: propDeviceInfo,
  onSwitchUser,
  onSelectEmployee,
  onOpenStaffManagement
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeAccount | null>(null);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSuccessAnim, setIsSuccessAnim] = useState<boolean>(false);

  if (!isOpen) return null;

  const effectiveDeviceInfo = propDeviceInfo || detectDeviceInfo();
  const effectiveDeviceId = currentDeviceId || effectiveDeviceInfo.deviceId || 'DEV-WIN-8492';
  const activeEmployees = employees.filter(e => e.status === 'active');
  const effectiveUserId = activeEmployeeId || currentUserId || 'admin-master';
  const currentEmp = employees.find(e => e.id === effectiveUserId) || employees[0];

  const handleSelectEmployee = (emp: EmployeeAccount) => {
    setSelectedEmployee(emp);
    setEnteredPin('');
    setErrorMessage('');
  };

  const handlePinDigit = (digit: string) => {
    setErrorMessage('');
    if (enteredPin.length < 6) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      if (selectedEmployee && next.length === selectedEmployee.pin.length) {
        verifyPinAndSwitch(selectedEmployee, next);
      }
    }
  };

  const handleBackspace = () => {
    setEnteredPin(prev => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleClearPin = () => {
    setEnteredPin('');
    setErrorMessage('');
  };

  const verifyPinAndSwitch = (targetEmployee: EmployeeAccount, pinToTest: string) => {
    // 1. Device check
    const deviceCheck = validateEmployeeDeviceAccess(targetEmployee, effectiveDeviceId);
    if (!deviceCheck.allowed) {
      setErrorMessage(deviceCheck.reason || 'Device access restricted.');
      setEnteredPin('');
      return;
    }

    // 2. PIN verification
    if (pinToTest === targetEmployee.pin) {
      setIsSuccessAnim(true);
      setTimeout(() => {
        setIsSuccessAnim(false);
        if (onSwitchUser) {
          onSwitchUser(targetEmployee);
        } else if (onSelectEmployee) {
          onSelectEmployee(targetEmployee);
        }
        onClose();
      }, 400);
    } else {
      setErrorMessage('Incorrect PIN. Please try again.');
      setEnteredPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/30 border border-red-500/30 flex items-center justify-center text-red-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Switch Active Operator</h2>
              <p className="text-xs text-slate-400">
                Current: <span className="text-white font-bold">{currentEmp?.name}</span> ({currentEmp?.designation})
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-switch-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          
          {/* Active Terminal Indicator */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="font-bold text-slate-800">{effectiveDeviceInfo.deviceName}</span>
                <span className="text-[10px] text-slate-400 block font-mono">{effectiveDeviceId}</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Authorized Terminal
            </span>
          </div>

          {/* Employee Selection Grid */}
          {!selectedEmployee ? (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">Select Employee Account:</label>
              <div className="grid grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {activeEmployees.map(emp => {
                  const isCurrent = emp.id === effectiveUserId;
                  const deviceAccess = validateEmployeeDeviceAccess(emp, effectiveDeviceId);

                  return (
                    <button
                      key={emp.id}
                      type="button"
                      id={`btn-select-user-${emp.id}`}
                      onClick={() => handleSelectEmployee(emp)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                        isCurrent 
                          ? 'bg-red-50 border-red-300 ring-2 ring-red-500/20' 
                          : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white ${
                          emp.role === 'admin' ? 'bg-red-600' :
                          emp.role === 'cashier' ? 'bg-blue-600' :
                          emp.role === 'procurement' ? 'bg-amber-600' :
                          emp.role === 'stockkeeper' ? 'bg-emerald-600' :
                          'bg-purple-600'
                        }`}>
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 truncate">{emp.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{emp.designation}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-mono text-slate-400">@{emp.email}</span>
                        {emp.restrictToDevices && !deviceAccess.allowed ? (
                          <span className="text-red-600 font-bold">Locked PC</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">Ready</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* PIN Verification Screen for Selected Employee */
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                    {selectedEmployee.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{selectedEmployee.name}</h3>
                    <span className="text-[11px] text-slate-500">{selectedEmployee.designation}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { setSelectedEmployee(null); setEnteredPin(''); setErrorMessage(''); }}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Change User
                </button>
              </div>

              {/* PIN Dots Display */}
              <div className="text-center py-2">
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Enter Quick PIN for {selectedEmployee.name}:
                </label>
                <div className="flex items-center justify-center gap-2.5">
                  {Array.from({ length: selectedEmployee.pin.length || 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full border-2 transition-all ${
                        i < enteredPin.length
                          ? 'bg-blue-600 border-blue-600 scale-110 shadow-xs'
                          : 'border-slate-300 bg-slate-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {errorMessage && (
                <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {isSuccessAnim && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center justify-center gap-2 animate-in zoom-in-95">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold">Access Granted! Switching user...</span>
                </div>
              )}

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePinDigit(num)}
                    className="py-3 bg-slate-100 hover:bg-slate-200 active:bg-blue-100 text-slate-800 font-bold text-lg rounded-xl transition-colors cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClearPin}
                  className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handlePinDigit('0')}
                  className="py-3 bg-slate-100 hover:bg-slate-200 active:bg-blue-100 text-slate-800 font-bold text-lg rounded-xl transition-colors cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center rounded-xl transition-colors cursor-pointer"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          {onOpenStaffManagement && currentEmp?.role === 'admin' ? (
            <button
              type="button"
              id="btn-manage-staff-from-switch"
              onClick={() => {
                onClose();
                onOpenStaffManagement();
              }}
              className="text-red-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manage Staff & Roles</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">Multi-Cashier Shift Management</span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};
