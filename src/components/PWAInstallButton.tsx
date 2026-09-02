import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl border border-blue-500 transition-colors flex items-center gap-1 shadow-xs cursor-pointer h-8 sm:h-8.5 shrink-0"
        title="Install App"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="text-xs font-bold whitespace-nowrap">Install</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl border border-blue-500 transition-colors flex items-center gap-1 shadow-xs cursor-pointer h-8 sm:h-8.5 shrink-0"
          title="Install on iOS"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs font-bold whitespace-nowrap">Install</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl text-slate-900">
              <h3 className="text-lg font-bold">Install on iPhone / iPad</h3>
              <p className="mt-2 text-sm text-slate-600">
                1. Tap the <strong>Share</strong> button in Safari toolbar.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-slate-100 py-2 text-sm font-bold text-slate-800 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
