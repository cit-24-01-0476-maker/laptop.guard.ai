import React from 'react';
import { Volume2, AlertTriangle, X, VolumeX } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const AlarmTriggerModal: React.FC = () => {
  const { isAlarmModalOpen, setIsAlarmModalOpen, selectedDevice, soundAlarm, stopAlarm, isAlarmActive } = useSecurity();

  if (!isAlarmModalOpen || !selectedDevice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl jelly-card p-7 border border-amber-200/80 dark:border-amber-500/30 shadow-2xl relative">
        <button
          onClick={() => setIsAlarmModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="bubble-icon w-12 h-12 bubble-amber flex items-center justify-center shadow-sm">
            <Volume2 className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Deterrence Siren Controls</h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Current State: <strong className={isAlarmActive ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-600 dark:text-slate-300'}>{isAlarmActive ? 'Active (Sounding)' : 'Silent (Standby)'}</strong>
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          Direct hardware siren control on <strong className="text-slate-900 dark:text-white font-bold">{selectedDevice.device_name}</strong>.
          Automatically boosts Windows speaker volume to draw immediate public attention.
        </p>

        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-slate-900/80 border border-amber-200/60 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 space-y-1.5 mb-6">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Safe & Non-destructive</span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            ⏱️ <strong>Smart Auto-Silence:</strong> Plays for up to 15 seconds then automatically turns off to prevent continuous disturbance, or click STOP at any moment.
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={async () => {
              await stopAlarm(selectedDevice.id);
              setIsAlarmModalOpen(false);
            }}
            className="jelly-button flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-rose-200/80 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer"
          >
            <VolumeX className="w-4 h-4" />
            <span>Mute / Stop Siren</span>
          </button>
          <button
            onClick={async () => {
              await soundAlarm(selectedDevice.id);
              setIsAlarmModalOpen(false);
            }}
            className="jelly-button flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            <span>Sound Alarm (ON)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
