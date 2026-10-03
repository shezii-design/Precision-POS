import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  try {
    createRoot(rootEl).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (err: any) {
    console.error('Fatal mount error:', err);
    rootEl.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#f8fafc;font-family:sans-serif;padding:20px;text-align:center;">
        <div style="max-width:440px;background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px;">
          <h2 style="font-size:18px;font-weight:bold;margin:0 0 8px;">PrecisionPOS Startup</h2>
          <p style="font-size:13px;color:#94a3b8;margin:0 0 16px;">App encountered an issue starting up: ${err?.message || err}</p>
          <button onclick="localStorage.clear();sessionStorage.clear();window.location.reload();" style="width:100%;padding:12px;background:#dc2626;color:#fff;border:none;border-radius:10px;font-weight:bold;cursor:pointer;">Reset Storage & Reload</button>
        </div>
      </div>
    `;
  }
}
