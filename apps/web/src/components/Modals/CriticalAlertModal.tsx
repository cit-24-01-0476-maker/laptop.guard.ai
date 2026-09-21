import React from 'react';
import { AlertTriangle, Camera, Lock, Volume2, Eye, X, MapPin, Clock } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

interface CriticalAlertModalProps {
  onViewDevice: () => void;
  onOpenLiveCamera: () => void;
}

export const CriticalAlertModal: React.FC<CriticalAlertModalProps> = ({ onViewDevice, onOpenLiveCamera }) => {
  const { criticalAlert, dismissCriticalAlert, selectedDevice, lockDevice, soundAlarm } = useSecurity();

  if (!criticalAlert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/80 backdrop-blur-md p-4 animate-in zoom-in-95">
      <div className="w-full max-w-lg rounded-3xl jelly-card p-7 border-2 border-rose-400 dark:border-rose-500 shadow-2xl shadow-rose-500/20 relative">
        <button
          onClick={dismissCriticalAlert}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="bubble-icon w-14 h-14 bubble-rose flex items-center justify-center shadow-md animate-bounce">
            <AlertTriangle className="w-7 h-7 text-rose-600 dark:text-rose-400 stroke-[2.5]" />
          </div>
          <div>
            <span className="jelly-pill text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-700/50">
              Immediate Threat Alert
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              CRITICAL SECURITY ALERT
            </h2>
          </div>
        </div>

        {/* Content Box */}
        <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-slate-900/90 border border-rose-200/80 dark:border-rose-500/20 mb-5 space-y-3">
          <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
            {criticalAlert.body || 'Suspicious physical movement / sensor disturbance detected.'}
          </p>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-rose-200/50 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>Time: <strong className="text-slate-900 dark:text-white">{criticalAlert.time}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>Location: <strong className="text-slate-900 dark:text-white">{selectedDevice?.last_location ? `${selectedDevice.last_location.city}, ${selectedDevice.last_location.country}` : 'Colombo, Sri Lanka'}</strong></span>
            </div>
          </div>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              dismissCriticalAlert();
              onViewDevice();
            }}
            className="jelly-button flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white/80 dark:bg-slate-800 hover:bg-white text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/60 dark:border-white/10 shadow-sm cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>View Device</span>
          </button>

          <button
            onClick={() => {
              dismissCriticalAlert();
              onOpenLiveCamera();
            }}
            className="jelly-button flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Live Camera</span>
          </button>

          <button
            onClick={async () => {
              if (selectedDevice) await lockDevice(selectedDevice.id);
              dismissCriticalAlert();
            }}
            className="jelly-button flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 text-white text-xs font-bold shadow-md cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Lock Laptop</span>
          </button>

          <button
            onClick={async () => {
              if (selectedDevice) await soundAlarm(selectedDevice.id);
              dismissCriticalAlert();
            }}
            className="jelly-button flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-500/25 active:scale-[0.98] cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            <span>Sound Alarm</span>
          </button>
        </div>
      </div>
    </div>
  );
};
