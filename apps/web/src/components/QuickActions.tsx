import React from 'react';
import {
  Shield,
  ShieldOff,
  Lock,
  Volume2,
  VolumeX,
  MapPin,
  Camera,
  AlertOctagon
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';

interface QuickActionsProps {
  onOpenLiveCamera: () => void;
  onOpenMap: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onOpenLiveCamera, onOpenMap }) => {
  const {
    selectedDevice,
    armDevice,
    disarmDevice,
    setIsLockModalOpen,
    setIsLostModalOpen,
    isAlarmActive,
    toggleAlarm
  } = useSecurity();

  if (!selectedDevice) return null;

  const isArmed = selectedDevice.status === 'Protected' || selectedDevice.status === 'Lost';
  const isLost = selectedDevice.status === 'Lost';

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Remote Security Actions
        </h3>
        <span className="text-[11px] text-blue-600 font-bold">Signed Device Protocol</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Arm Device */}
        <button
          onClick={() => armDevice(selectedDevice.id)}
          disabled={isArmed}
          className={`flex flex-col items-center justify-center p-4 rounded-2xl jelly-button border transition-all text-center ${
            isArmed
              ? 'bg-emerald-50/50 border-emerald-200/50 text-slate-400 cursor-not-allowed opacity-60'
              : 'bg-white/80 hover:bg-emerald-50/80 border-emerald-200/90 text-emerald-800 shadow-sm'
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bubble-mint flex items-center justify-center mb-2 shadow-sm">
            <Shield className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="text-xs font-extrabold text-slate-900">Arm Device</span>
          <span className="text-[10px] text-slate-500 mt-0.5 font-medium">Activate Defense</span>
        </button>

        {/* 2. Disarm */}
        <button
          onClick={() => disarmDevice(selectedDevice.id)}
          disabled={!isArmed}
          className={`flex flex-col items-center justify-center p-4 rounded-2xl jelly-button border transition-all text-center ${
            !isArmed
              ? 'bg-slate-50/50 border-slate-200/50 text-slate-400 cursor-not-allowed opacity-60'
              : 'bg-white/80 hover:bg-slate-100/80 border-slate-200/90 text-slate-800 shadow-sm'
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bubble-slate flex items-center justify-center mb-2 shadow-sm">
            <ShieldOff className="w-5 h-5 text-slate-600" />
          </div>
          <span className="text-xs font-extrabold text-slate-900">Disarm</span>
          <span className="text-[10px] text-slate-500 mt-0.5 font-medium">Standby Mode</span>
        </button>

        {/* 3. Lock Laptop */}
        <button
          onClick={() => setIsLockModalOpen(true)}
          className="flex flex-col items-center justify-center p-4 rounded-2xl jelly-button bg-white/80 hover:bg-blue-50/80 border border-blue-200/90 text-blue-800 transition-all text-center shadow-sm"
        >
          <div className="w-10 h-10 rounded-2xl bubble-blue flex items-center justify-center mb-2 shadow-sm">
            <Lock className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-xs font-extrabold text-slate-900">Lock Laptop</span>
          <span className="text-[10px] text-slate-500 mt-0.5 font-medium">Instant Win32 Lock</span>
        </button>

        {/* 4. Sound Alarm / Stop Alarm Live Toggle */}
        <button
          onClick={() => toggleAlarm(selectedDevice.id)}
          className={`flex flex-col items-center justify-center p-4 rounded-2xl jelly-button border transition-all text-center ${
            isAlarmActive
              ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30 animate-pulse'
              : 'bg-white/80 hover:bg-amber-50/80 border-amber-200/90 text-amber-800 shadow-sm'
          }`}
          title={isAlarmActive ? 'Click to Silence Siren Immediately' : 'Click to Sound Deterrent Siren'}
        >
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-2 shadow-sm ${
            isAlarmActive ? 'bg-white text-rose-600' : 'bubble-amber'
          }`}>
            {isAlarmActive ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-amber-600" />}
          </div>
          <span className={`text-xs font-extrabold ${isAlarmActive ? 'text-white' : 'text-slate-900'}`}>
            {isAlarmActive ? 'STOP ALARM' : 'Sound Alarm'}
          </span>
          <span className={`text-[10px] mt-0.5 font-medium ${isAlarmActive ? 'text-rose-100' : 'text-slate-500'}`}>
            {isAlarmActive ? 'Mute Siren (OFF)' : 'Audible Siren (ON)'}
          </span>
        </button>

        {/* 5. Find Laptop */}
        <button
          onClick={onOpenMap}
          className="flex flex-col items-center justify-center p-4 rounded-2xl jelly-button bg-white/80 hover:bg-cyan-50/80 border border-cyan-200/90 text-cyan-800 transition-all text-center shadow-sm"
        >
          <div className="w-10 h-10 rounded-2xl bubble-cyan flex items-center justify-center mb-2 shadow-sm">
            <MapPin className="w-5 h-5 text-cyan-600" />
          </div>
          <span className="text-xs font-extrabold text-slate-900">Find Laptop</span>
          <span className="text-[10px] text-slate-500 mt-0.5 font-medium">Location Radar</span>
        </button>

        {/* 6. Live Camera */}
        <button
          onClick={onOpenLiveCamera}
          className="flex flex-col items-center justify-center p-4 rounded-2xl jelly-button bg-white/80 hover:bg-violet-50/80 border border-violet-200/90 text-violet-800 transition-all text-center shadow-sm"
        >
          <div className="w-10 h-10 rounded-2xl bubble-violet flex items-center justify-center mb-2 shadow-sm">
            <Camera className="w-5 h-5 text-violet-600" />
          </div>
          <span className="text-xs font-extrabold text-slate-900">Live Camera</span>
          <span className="text-[10px] text-slate-500 mt-0.5 font-medium">Secure WebRTC</span>
        </button>

        {/* 7. Lost Mode */}
        <button
          onClick={() => setIsLostModalOpen(true)}
          className={`flex flex-col items-center justify-center p-4 rounded-2xl jelly-button border transition-all text-center ${
            isLost
              ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
              : 'bg-white/80 hover:bg-rose-50/80 border-rose-200/90 text-rose-800 shadow-sm'
          }`}
        >
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-2 shadow-sm ${
            isLost ? 'bg-white text-rose-600' : 'bubble-rose'
          }`}>
            <AlertOctagon className="w-5 h-5 text-rose-500" />
          </div>
          <span className={`text-xs font-extrabold ${isLost ? 'text-white' : 'text-slate-900'}`}>
            {isLost ? 'Lost Mode Active' : 'Lost Mode'}
          </span>
          <span className={`text-[10px] mt-0.5 font-medium ${isLost ? 'text-rose-100' : 'text-slate-500'}`}>
            Owner Broadcast
          </span>
        </button>
      </div>
    </div>
  );
};
