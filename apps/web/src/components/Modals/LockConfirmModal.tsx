import React from 'react';
import { Lock, ShieldAlert, X } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const LockConfirmModal: React.FC = () => {
  const { isLockModalOpen, setIsLockModalOpen, selectedDevice, lockDevice } = useSecurity();

  if (!isLockModalOpen || !selectedDevice) return null;

  const handleConfirm = async () => {
    await lockDevice(selectedDevice.id);
    setIsLockModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl jelly-card p-7 border border-white/80 dark:border-white/10 shadow-2xl relative">
        <button
          onClick={() => setIsLockModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="bubble-icon w-12 h-12 bubble-blue flex items-center justify-center shadow-sm">
            <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Lock This Device Now?</h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Signed Authenticated Win32 Instruction</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          The LaptopGuard Cloud will transmit an authenticated, cryptographically signed command to{' '}
          <strong className="text-slate-900 dark:text-white font-bold">{selectedDevice.device_name}</strong>. The operating system session will
          be locked immediately via <code className="px-1.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-mono text-[11px]">user32.LockWorkStation</code>.
        </p>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-slate-200/60 dark:border-white/5 text-xs space-y-1.5 mb-6">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Target:</span>
            <span className="text-slate-900 dark:text-white font-mono font-bold">{selectedDevice.device_name} ({selectedDevice.id})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Authorization:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Verified Owner Session</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setIsLockModalOpen(false)}
            className="jelly-button flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="jelly-button flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            Lock Workstation Now
          </button>
        </div>
      </div>
    </div>
  );
};
