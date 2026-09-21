import React, { useState } from 'react';
import { AlertOctagon, Phone, X, Shield } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const LostModeModal: React.FC = () => {
  const { isLostModalOpen, setIsLostModalOpen, selectedDevice, activateLostMode, deactivateLostMode } = useSecurity();
  const [contactMessage, setContactMessage] = useState('This device is lost. Please contact the owner at +94 77 123 4567.');

  if (!isLostModalOpen || !selectedDevice) return null;

  const isAlreadyLost = selectedDevice.status === 'Lost';

  const handleActivate = async () => {
    await activateLostMode(selectedDevice.id, contactMessage);
    setIsLostModalOpen(false);
  };

  const handleDeactivate = async () => {
    await deactivateLostMode(selectedDevice.id);
    setIsLostModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl jelly-card p-7 border border-rose-200/80 dark:border-rose-500/30 shadow-2xl relative">
        <button
          onClick={() => setIsLostModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="bubble-icon w-12 h-12 bubble-rose flex items-center justify-center shadow-sm">
            <AlertOctagon className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {isAlreadyLost ? 'Manage Lost Mode' : 'Activate Lost Mode'}
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">High-Priority Anti-Theft Protocol</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          When Lost Mode is activated, location polling frequency increases, high-priority push notifications
          are dispatched, and the laptop screen displays your emergency contact information.
        </p>

        {!isAlreadyLost && (
          <div className="mb-5 space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Custom Screen Contact Note:</label>
            <textarea
              rows={3}
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              className="w-full rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 p-3.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              * Privacy protection: Never display sensitive personal home addresses or passwords.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setIsLostModalOpen(false)}
            className="jelly-button flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
          >
            Cancel
          </button>
          {isAlreadyLost ? (
            <button
              onClick={handleDeactivate}
              className="jelly-button flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              Disable Lost Mode
            </button>
          ) : (
            <button
              onClick={handleActivate}
              className="jelly-button flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-500/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              Enable Lost Mode
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
