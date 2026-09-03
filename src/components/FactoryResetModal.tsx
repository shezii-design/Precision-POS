import React, { useState } from 'react';
import { AlertTriangle, Trash2, Download, X } from 'lucide-react';

interface FactoryResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmWipe: (downloadBackup: boolean) => void;
}

export function FactoryResetModal({ isOpen, onClose, onConfirmWipe }: FactoryResetModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [downloadBackup, setDownloadBackup] = useState(true);

  if (!isOpen) return null;

  const isConfirmed = confirmText === 'DELETE ALL';

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirmWipe(downloadBackup);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <AlertTriangle className="w-6 h-6" />
            <h2 className="text-lg font-black">Factory Reset</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-red-50 text-red-800 p-4 rounded-xl text-sm leading-relaxed border border-red-200">
            <strong>WARNING:</strong> This action is irreversible. All products, customers, vendors, transactions, and logs will be permanently deleted from this device.
          </div>

          <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
            <input
              type="checkbox"
              checked={downloadBackup}
              onChange={(e) => setDownloadBackup(e.target.checked)}
              className="w-5 h-5 text-red-600 border-slate-300 rounded focus:ring-red-600 focus:ring-2"
            />
            <div className="flex flex-col">
              <span className="font-bold text-slate-800 flex items-center gap-2">
                <Download className="w-4 h-4 text-slate-500" /> Download Full Backup
              </span>
              <span className="text-xs text-slate-500 mt-0.5">Save a copy of your data before wiping it.</span>
            </div>
          </label>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">
              Type <strong className="text-red-600">DELETE ALL</strong> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE ALL"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-center uppercase"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isConfirmed}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Wipe Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
