const fs = require('fs');
let code = fs.readFileSync('src/components/SupabaseConfigModal.tsx', 'utf-8');

// 1. Remove manual states
code = code.replace(/  \/\/ Manual Credentials Input State[\s\S]*?(?=  \/\/ Health and Testing state)/, '');

// 2. Update useEffect for initial test
const oldUseEffect = `  // On initial open, run a quiet connection test if credentials exist
  useEffect(() => {
    if (isOpen && (envConfig.isConfigured || (config.url && config.anonKey)) && !testResult) {
      handleTestConnection(manualUrl || envConfig.url, manualKey || envConfig.anonKey);
    }
  }, [isOpen]);`;
const newUseEffect = `  // On initial open, run a quiet connection test if credentials exist
  useEffect(() => {
    if (isOpen && (envConfig.isConfigured || (config.url && config.anonKey)) && !testResult) {
      handleTestConnection(envConfig.url || config.url, envConfig.anonKey || config.anonKey);
    }
  }, [isOpen]);`;
code = code.replace(oldUseEffect, newUseEffect);

// 3. Update handleTestConnection
const oldHandleTest = `    const targetUrl = urlToTest || manualUrl || envConfig.url || config.url;
    const targetKey = keyToTest || manualKey || envConfig.anonKey || config.anonKey;`;
const newHandleTest = `    const targetUrl = urlToTest || envConfig.url || config.url;
    const targetKey = keyToTest || envConfig.anonKey || config.anonKey;`;
code = code.replace(oldHandleTest, newHandleTest);

// 4. Remove handleSaveManualCredentials
const oldSaveManual = `  const handleSaveManualCredentials = () => {
    if (!manualUrl.trim() || !manualKey.trim()) {
      setSyncFeedback({ success: false, message: 'Please enter both Supabase Project URL and Anon Key.' });
      return;
    }
    const cleanUrl = manualUrl.trim();
    const cleanKey = manualKey.trim();
    const newConfig: SupabaseConfig = {
      ...config,
      url: cleanUrl,
      anonKey: cleanKey,
      enabled: true,
      syncStatus: 'connected',
      lastSyncedAt: new Date().toISOString(),
    };
    onSaveConfig(newConfig);
    resetSupabaseClient();
    handleTestConnection(cleanUrl, cleanKey);
  };`;
code = code.replace(oldSaveManual, '');

// 5. Replace UI block
const oldUI = `                {/* Direct Credentials Input Form */}
                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Supabase Project URL
                      </label>
                      <input
                        type="text"
                        value={manualUrl}
                        onChange={(e) => setManualUrl(e.target.value)}
                        placeholder="https://xyzcompany.supabase.co"
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden bg-slate-50 focus:bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Supabase Public Anon Key
                      </label>
                      <input
                        type="password"
                        value={manualKey}
                        onChange={(e) => setManualKey(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden bg-slate-50 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id="btn-save-manual-supabase"
                        onClick={handleSaveManualCredentials}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Save & Test Connection</span>
                      </button>
                      <button
                        type="button"
                        id="btn-test-supabase-connection"
                        onClick={() => handleTestConnection()}
                        disabled={isTesting}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer border border-slate-200"
                      >
                        <RefreshCw className={\`w-3.5 h-3.5 \${isTesting ? 'animate-spin' : ''}\`} />
                        <span>{isTesting ? 'Testing Latency...' : 'Test Connection'}</span>
                      </button>
                    </div>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 hover:underline"
                    >
                      <span>Open Supabase Dashboard</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>`;
const newUI = `                {/* Controls */}
                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <button
                      type="button"
                      id="btn-test-supabase-connection"
                      onClick={() => handleTestConnection()}
                      disabled={isTesting}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer border border-slate-200"
                    >
                      <RefreshCw className={\`w-3.5 h-3.5 \${isTesting ? 'animate-spin' : ''}\`} />
                      <span>{isTesting ? 'Testing Latency...' : 'Test Connection'}</span>
                    </button>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 hover:underline"
                    >
                      <span>Open Supabase Dashboard</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>`;
code = code.replace(oldUI, newUI);

fs.writeFileSync('src/components/SupabaseConfigModal.tsx', code);
console.log('Done');
