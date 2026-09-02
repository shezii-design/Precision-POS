const fs = require('fs');
let code = fs.readFileSync('src/components/AuthModal.tsx', 'utf-8');

// 1. Remove Biometric Tab button
const bioTabBtn = `<button
                type="button"
                onClick={() => { setActiveTab('biometric'); setErrorMessage(''); }}
                className={\`flex-1 py-3 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 \${
                  activeTab === 'biometric'
                    ? 'border-red-600 text-red-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }\`}
              >
                {deviceInfo.os === 'iOS' ? <ScanFace className="w-3.5 h-3.5" /> : <Fingerprint className="w-3.5 h-3.5" />}
                {deviceInfo.os === 'iOS' ? 'Face ID' : 'Fingerprint'}
              </button>`;
code = code.replace(bioTabBtn, '');

// 2. Replace pin pad biometric button with blank div
const pinPadBio = `<button
                  type="button"
                  onClick={() => handleBiometricAuth()}
                  className="h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition-all active:scale-95 cursor-pointer"
                  title="Biometric scan"
                >
                  <Fingerprint className="w-6 h-6 text-red-600" />
                </button>`;
code = code.replace(pinPadBio, '<div></div>');

// 3. Remove activeTab === 'biometric' section completely.
// I'll just use regex to remove from `{/* 2. BIOMETRIC SCAN MODE */}` to `{/* 3. SUPABASE EMAIL & PASSWORD MODE (NO SIGN UP) */}`
code = code.replace(/\{\/\* 2\. BIOMETRIC SCAN MODE \*\/\}\s*\{activeTab === 'biometric' && \([\s\S]*?\)\}\s*\{\/\* 3\. SUPABASE EMAIL & PASSWORD MODE \(NO SIGN UP\) \*\/\}/, '{/* 3. SUPABASE EMAIL & PASSWORD MODE (NO SIGN UP) */}');

// 4. Remove Biometric settings block
const bioSettings = `<div className="pt-1">
                <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer mb-2">
                  <div className="flex items-center gap-2.5">
                    <Fingerprint className="w-5 h-5 text-red-600" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Enable Biometrics</div>
                      <div className="text-[11px] text-slate-500">Allow Fingerprint / Face scan on this device</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={biometricsToggle}
                    onChange={(e) => setBiometricsToggle(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                  />
                </label>

                {biometricsToggle && (
                  <button
                    type="button"
                    onClick={handleRegisterBiometrics}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-2 mb-2"
                  >
                    <ScanFace className="w-4 h-4 text-slate-600" />
                    {authState.biometricCredentialId ? 'Re-register Fingerprint (Saved)' : 'Register Fingerprint to Device & Cloud'}
                  </button>
                )}
              </div>`;
code = code.replace(bioSettings, '');

// If the regex above failed because the exact string didn't match, let's also remove it with a looser regex if needed.
fs.writeFileSync('src/components/AuthModal.tsx', code);
console.log('patched AuthModal biometrics');
