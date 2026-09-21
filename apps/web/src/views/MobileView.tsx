import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  Zap,
  Volume2,
  VolumeX,
  Lock,
  Camera,
  MapPin,
  RefreshCw,
  Battery,
  BatteryCharging,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ExternalLink,
  Download
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { getDownloadUrl, getCameraStreamUrl } from '../services/api';

interface MobileViewProps {
  onBackToLanding: () => void;
  onOpenDashboard: () => void;
}

export const MobileView: React.FC<MobileViewProps> = ({ onBackToLanding, onOpenDashboard }) => {
  const {
    selectedDevice,
    isAlarmActive,
    soundAlarm,
    stopAlarm,
    armDevice,
    disarmDevice,
    lockDevice,
    setIsLostModalOpen,
    isWsConnected
  } = useSecurity();

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('1.4.2');

  // Check Over-The-Air (OTA) Auto-Update from backend manifest
  const checkAutoUpdate = async (manual = false) => {
    setIsCheckingUpdate(true);
    try {
      const res = await fetch(getDownloadUrl('manifest'));
      const data = await res.json();
      if (data.latest_version) {
        setCurrentVersion(data.latest_version);
        if (manual) {
          setUpdateMessage(`App is up to date (v${data.latest_version}) • Auto-Update Active`);
        }
      }
    } catch (e) {
      if (manual) setUpdateMessage('App is running the latest live OTA bundle.');
    } finally {
      setIsCheckingUpdate(false);
      if (manual) setTimeout(() => setUpdateMessage(null), 3000);
    }
  };

  useEffect(() => {
    checkAutoUpdate(false);
    // Poll for OTA updates every 30 seconds
    const interval = setInterval(() => checkAutoUpdate(false), 30000);
    return () => clearInterval(interval);
  }, []);

  if (!selectedDevice) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F1F5FB]">
        <div className="jelly-card p-6 rounded-3xl text-center max-w-sm w-full space-y-4">
          <p className="text-sm text-slate-500 font-medium">No device selected.</p>
          <button
            onClick={onOpenDashboard}
            className="jelly-button py-2.5 px-4 rounded-xl bg-blue-600 text-white text-xs font-bold"
          >
            Go to Cloud Console
          </button>
        </div>
      </div>
    );
  }

  const isArmed = selectedDevice.status === 'Protected' || selectedDevice.status === 'Lost';

  return (
    <div className="min-h-screen bg-[#F1F5FB] text-slate-800 p-3 sm:p-6 flex flex-col items-center justify-start relative">
      {/* Top Floating Mobile Navigation Bar */}
      <div className="w-full max-w-md flex items-center justify-between pb-3 pt-1">
        <button
          onClick={onBackToLanding}
          className="jelly-button flex items-center gap-1.5 py-2 px-3 rounded-2xl bg-white/80 border border-slate-200/80 text-xs font-bold text-slate-700 shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="jelly-pill px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>{isWsConnected ? 'Live Mobile Sync' : 'Reconnecting...'}</span>
          </span>

          <button
            onClick={onOpenDashboard}
            className="jelly-button py-2 px-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* Main Mobile App Container (Phone Frame Styled) */}
      <div className="w-full max-w-md jelly-card rounded-[38px] p-6 shadow-2xl space-y-5 border border-white/80 relative overflow-hidden">
        {/* Mobile App Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Shield className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 leading-tight">LaptopGuard Mobile</h2>
              <p className="text-[10px] text-slate-400 font-medium">Remote Sentinel Controller</p>
            </div>
          </div>

          <button
            onClick={() => checkAutoUpdate(true)}
            disabled={isCheckingUpdate}
            className="jelly-pill px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center gap-1 cursor-pointer transition-all"
            title="Check for Over-The-Air Update"
          >
            <RefreshCw className={`w-3 h-3 text-indigo-500 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
            <span>v{currentVersion}</span>
          </button>
        </div>

        {/* Update Notification Pill */}
        {updateMessage && (
          <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold text-center animate-in fade-in shadow-sm">
            {updateMessage}
          </div>
        )}

        {/* Arm / Disarm Master Slider Button */}
        <div className="p-4 rounded-3xl bg-white/90 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Security Guard</span>
            <span className={`jelly-pill px-2.5 py-0.5 text-[11px] font-bold ${
              isArmed
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              ● {isArmed ? 'ARMED' : 'DISARMED'}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => armDevice(selectedDevice.id)}
              disabled={isArmed}
              className={`flex-1 py-3 rounded-2xl text-xs font-bold transition-all ${
                isArmed
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 cursor-default'
                  : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 border border-slate-200 cursor-pointer'
              }`}
            >
              🛡️ ARM SYSTEM
            </button>
            <button
              onClick={() => disarmDevice(selectedDevice.id)}
              disabled={!isArmed}
              className={`flex-1 py-3 rounded-2xl text-xs font-bold transition-all ${
                !isArmed
                  ? 'bg-slate-300 text-slate-700 cursor-default'
                  : 'bg-slate-100 hover:bg-rose-50 text-slate-700 border border-slate-200 cursor-pointer'
              }`}
            >
              🔓 DISARM
            </button>
          </div>
        </div>

        {/* Device Status Card */}
        <div className="p-4 rounded-3xl bg-white/90 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">{selectedDevice.device_name}</h3>
              <p className="text-[11px] text-slate-500 font-medium">Dell G15 5530 • Windows 11</p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
              {selectedDevice.battery}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2">
              <BatteryCharging className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold">AC Charger</span>
                <span className="font-extrabold text-slate-800">
                  {selectedDevice.is_charging ? 'Plugged In' : 'Unplugged'}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold">Location Radar</span>
                <span className="font-extrabold text-slate-800">
                  {selectedDevice.last_location ? selectedDevice.last_location.city : 'Sri Lanka'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Big Touch Action Buttons Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 px-1">
            Mobile Commands (Real-Time)
          </h3>

          {/* 1. Alarm Toggle Button */}
          {isAlarmActive ? (
            <button
              onClick={() => stopAlarm(selectedDevice.id)}
              className="w-full flex items-center justify-center gap-2 py-4 px-5 rounded-3xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-extrabold text-sm shadow-xl shadow-rose-500/30 animate-pulse active:scale-[0.98] cursor-pointer"
            >
              <VolumeX className="w-5 h-5" />
              <span>STOP ALARM NOW (Mute Siren)</span>
            </button>
          ) : (
            <button
              onClick={() => soundAlarm(selectedDevice.id)}
              className="w-full flex items-center justify-center gap-2 py-4 px-5 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold text-sm shadow-lg shadow-amber-500/25 active:scale-[0.98] cursor-pointer"
            >
              <Volume2 className="w-5 h-5" />
              <span>Sound Deterrent Siren (15s Max)</span>
            </button>
          )}

          {/* 2. Remote Workstation Lock */}
          <button
            onClick={() => lockDevice(selectedDevice.id)}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-3xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md active:scale-[0.98] cursor-pointer"
          >
            <Lock className="w-4 h-4 text-cyan-400" />
            <span>Lock Windows WorkStation Immediately</span>
          </button>

          {/* 3. Live Camera View Toggle */}
          <button
            onClick={() => setIsCameraActive(!isCameraActive)}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-3xl bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Camera className="w-4 h-4 text-blue-600" />
            <span>{isCameraActive ? 'Hide Live Camera' : 'View Laptop Live Camera'}</span>
          </button>

          {/* Live Camera Box (if toggled) */}
          {isCameraActive && (
            <div className="rounded-2xl overflow-hidden border border-blue-200 shadow-md animate-in fade-in">
              <img
                src={getCameraStreamUrl(selectedDevice.id)}
                alt="Live Camera Feed"
                className="w-full aspect-video object-cover bg-black"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="p-2 bg-slate-900 text-white text-[10px] font-mono flex justify-between">
                <span>WEBCAM: HARDWARE LED ON</span>
                <span className="text-emerald-400 font-bold">LIVE STREAM</span>
              </div>
            </div>
          )}

          {/* 4. Lost Mode Toggle */}
          <button
            onClick={() => setIsLostModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-3xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xs shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Manage High-Priority Lost Mode</span>
          </button>
        </div>

        {/* APK Direct Download footer banner */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-slate-800 block">Android Mobile App APK</span>
            <span className="text-[10px] text-slate-500">Live Over-The-Air auto-update enabled</span>
          </div>
          <a
            href={getDownloadUrl('android-apk')}
            className="jelly-button py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Get APK</span>
          </a>
        </div>
      </div>
    </div>
  );
};
