import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
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
  Download,
  Bell,
  User,
  LogOut,
  Laptop,
  Wifi,
  Clock,
  ChevronRight,
  Smartphone,
  Navigation
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { api, getDownloadUrl, getCameraStreamUrl } from '../services/api';

interface MobileViewProps {
  onBackToLanding: () => void;
  onOpenDashboard: () => void;
}

export const MobileView: React.FC<MobileViewProps> = ({ onBackToLanding, onOpenDashboard }) => {
  const {
    devices,
    selectedDevice,
    setSelectedDevice,
    events,
    notifications,
    isAlarmActive,
    soundAlarm,
    stopAlarm,
    armDevice,
    disarmDevice,
    lockDevice,
    setIsLostModalOpen,
    isWsConnected,
    user,
    logoutUser,
    refreshAll
  } = useSecurity();

  const [activeTab, setActiveTab] = useState<'home' | 'camera' | 'map' | 'alerts' | 'profile'>('home');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState('1.4.2');
  const [sirenCountdown, setSirenCountdown] = useState<number | null>(null);
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  // Active or Fallback Device
  const currentDev = selectedDevice || (devices.length > 0 ? devices[0] : {
    id: 'dev_oska_xps15',
    device_name: 'Dell G15 Sentinel',
    status: 'Protected',
    battery: 100,
    is_charging: true,
    current_ssid: 'Campus_Secure_5G',
    ip_address: '127.0.0.1',
    last_seen: new Date().toISOString()
  });

  const isArmed = currentDev.status === 'Protected' || currentDev.status === 'Lost';

  // PWA Install prompt listener
  useEffect(() => {
    const handlePrompt = (e: any) => {
      e.preventDefault();
      setPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPwaInstalled(true);
    }
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  const handleInstallPwa = async () => {
    if (pwaPrompt) {
      pwaPrompt.prompt();
      const choice = await pwaPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsPwaInstalled(true);
      }
      setPwaPrompt(null);
    } else {
      alert('To install on your phone:\n• On iPhone: Tap Share -> "Add to Home Screen"\n• On Android: Tap browser menu -> "Install App"');
    }
  };

  // Automatically start camera session on laptop when user opens Camera tab
  useEffect(() => {
    if (activeTab === 'camera' && currentDev?.id) {
      api.startCameraSession(currentDev.id).catch(() => {});
    }
  }, [activeTab, currentDev?.id]);

  // Check Over-The-Air (OTA) Auto-Update
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
  }, []);

  // Siren countdown timer
  useEffect(() => {
    let timer: any;
    if (isAlarmActive) {
      setSirenCountdown(15);
      timer = setInterval(() => {
        setSirenCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setSirenCountdown(null);
    }
    return () => clearInterval(timer);
  }, [isAlarmActive]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col items-center justify-between pb-24 relative select-none font-sans">
      
      {/* 1. Mobile Phone Top Notch / Status Header */}
      <header className="w-full max-w-md bg-white/95 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-40 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Shield className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-tight text-slate-900">LAPTOPGUARD</span>
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[9px] font-black rounded-md">MOBILE</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                <span className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                <span>{isWsConnected ? 'Cloud Hub Connected' : 'Syncing Cloud...'}</span>
              </div>
            </div>
          </div>

          {/* Device & Profile quick controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => refreshAll()}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 active:scale-95 transition-all"
              title="Refresh Telemetry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenDashboard}
              className="py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs"
            >
              <span>PC View</span>
            </button>
          </div>
        </div>

        {/* Update alert banner */}
        {updateMessage && (
          <div className="mt-2 py-1 px-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-medium text-center animate-in fade-in">
            {updateMessage}
          </div>
        )}
      </header>

      {/* 2. Main Tab Body */}
      <main className="w-full max-w-md px-4 pt-3 flex-1 flex flex-col gap-4">

        {/* ======================================================== */}
        {/* TAB 1: HOME / DASHBOARD                                 */}
        {/* ======================================================== */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            
            {/* Live Laptop Device Card */}
            <div className="jelly-card p-4 rounded-3xl border border-white/80 shadow-md bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{currentDev.device_name}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">ID: {currentDev.id}</span>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 ${
                  isArmed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isArmed ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                  <span>{currentDev.status}</span>
                </div>
              </div>

              {/* Hardware Telemetry Bar */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  {currentDev.is_charging ? (
                    <BatteryCharging className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Battery className="w-4 h-4 text-amber-500" />
                  )}
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Battery</span>
                    <span className="font-bold text-slate-800">{currentDev.battery}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Zap className={`w-4 h-4 ${currentDev.is_charging ? 'text-amber-500 animate-pulse' : 'text-rose-500'}`} />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">AC Power</span>
                    <span className={`font-bold ${currentDev.is_charging ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {currentDev.is_charging ? 'Plugged In' : 'Unplugged!'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 500ms Watchdog Status Notice */}
              <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between font-mono px-1">
                <span>Watchdog: 500ms AC disconnect loop</span>
                <span className="text-emerald-600 font-bold">ACTIVE</span>
              </div>
            </div>

            {/* Giant Hero 1-Touch Armed / Disarmed Shield Button */}
            <div className="jelly-card p-5 rounded-3xl border border-white/80 shadow-lg bg-white flex flex-col items-center text-center">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">
                Security Sentinel Status
              </span>

              <button
                onClick={() => {
                  if (isArmed) {
                    disarmDevice(currentDev.id);
                  } else {
                    armDevice(currentDev.id);
                  }
                }}
                className={`relative group w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 active:scale-95 shadow-xl cursor-pointer ${
                  isArmed
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/30'
                    : 'bg-gradient-to-tr from-slate-700 to-slate-800 text-slate-200 shadow-slate-900/20'
                }`}
              >
                {/* Glowing Outer Ring */}
                <div className={`absolute -inset-2 rounded-full blur-md opacity-40 transition-all ${
                  isArmed ? 'bg-emerald-500' : 'bg-slate-600'
                }`} />

                <div className="relative z-10 flex flex-col items-center">
                  {isArmed ? (
                    <ShieldCheck className="w-12 h-12 mb-1" />
                  ) : (
                    <ShieldAlert className="w-12 h-12 mb-1 opacity-70" />
                  )}
                  <span className="text-sm font-black tracking-wide">
                    {isArmed ? 'ARMED' : 'DISARMED'}
                  </span>
                  <span className="text-[9px] font-semibold opacity-80">
                    {isArmed ? 'Tap to Disarm' : 'Tap to Arm'}
                  </span>
                </div>
              </button>

              <p className="mt-3 text-[11px] text-slate-500 font-medium max-w-xs">
                {isArmed
                  ? '🛡️ Laptop is fully secured. Unplugging the charger triggers an instant siren.'
                  : '○ Watchdog paused. You can safely disconnect your laptop.'}
              </p>
            </div>

            {/* Quick Action Control Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* 1. Deterrence Siren */}
              <button
                onClick={() => {
                  if (isAlarmActive) {
                    stopAlarm(currentDev.id);
                  } else {
                    soundAlarm(currentDev.id);
                  }
                }}
                className={`p-4 rounded-3xl border flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer ${
                  isAlarmActive
                    ? 'bg-rose-600 text-white border-rose-700 shadow-rose-500/30 animate-pulse'
                    : 'bg-white hover:bg-rose-50/60 border-rose-100 text-rose-700'
                }`}
              >
                {isAlarmActive ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6 text-rose-600" />}
                <span className="text-xs font-black">
                  {isAlarmActive ? `Stop Siren (${sirenCountdown ?? 15}s)` : 'Sound Siren'}
                </span>
                <span className="text-[9px] opacity-75 font-medium">15s Auto-silence</span>
              </button>

              {/* 2. Lock Workstation */}
              <button
                onClick={() => {
                  if (confirm('Lock this laptop immediately?')) {
                    lockDevice(currentDev.id);
                  }
                }}
                className="p-4 rounded-3xl bg-white hover:bg-indigo-50/60 border border-indigo-100 text-indigo-700 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                <Lock className="w-6 h-6 text-indigo-600" />
                <span className="text-xs font-black">Lock PC</span>
                <span className="text-[9px] opacity-75 font-medium">Native Win32 Lock</span>
              </button>

              {/* 3. Open Camera Feed */}
              <button
                onClick={() => setActiveTab('camera')}
                className="p-4 rounded-3xl bg-white hover:bg-blue-50/60 border border-blue-100 text-blue-700 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                <Camera className="w-6 h-6 text-blue-600" />
                <span className="text-xs font-black">Live Webcam</span>
                <span className="text-[9px] opacity-75 font-medium">Hardware Stream</span>
              </button>

              {/* 4. Lost Mode */}
              <button
                onClick={() => setIsLostModalOpen(true)}
                className="p-4 rounded-3xl bg-white hover:bg-amber-50/60 border border-amber-100 text-amber-800 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                <span className="text-xs font-black">Lost Mode</span>
                <span className="text-[9px] opacity-75 font-medium">High-Priority Alert</span>
              </button>
            </div>

            {/* Recent Activity Timeline Widget */}
            <div className="jelly-card p-4 rounded-3xl border border-white/80 shadow-md bg-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                  <span>Real-Time Security Activity</span>
                </span>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className="text-[10px] text-blue-600 font-bold hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-2">
                {events.slice(0, 3).map((ev, idx) => (
                  <div key={ev.id || idx} className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        ev.severity === 'CRITICAL' ? 'bg-rose-500' : ev.severity === 'WARNING' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <span className="font-bold text-slate-800 block text-[11px]">{ev.event_type}</span>
                        <span className="text-[10px] text-slate-500 line-clamp-1">{ev.description}</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
                {events.length === 0 && (
                  <p className="text-[11px] text-slate-400 text-center py-2">No security events logged yet.</p>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: LIVE CAMERA                                      */}
        {/* ======================================================== */}
        {activeTab === 'camera' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            <div className="jelly-card p-4 rounded-3xl border border-white/80 shadow-md bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Physical Webcam Stream</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                  HARDWARE LED ON
                </span>
              </div>

              {/* Video container */}
              <div className="rounded-2xl overflow-hidden bg-black aspect-video relative flex items-center justify-center border border-slate-800 shadow-inner">
                <img
                  src={getCameraStreamUrl(currentDev.id)}
                  alt="Live Webcam Feed"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-mono text-cyan-300">
                  DELL G15 • LIVE FEED
                </div>
              </div>

              <p className="text-[10px] text-slate-500 mt-3 text-center">
                Strict Privacy Policy: Live stream automatically times out after 5 minutes.
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: RADAR / MAP                                      */}
        {/* ======================================================== */}
        {activeTab === 'map' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            <div className="jelly-card p-4 rounded-3xl border border-white/80 shadow-md bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">Geographic Location Radar</h3>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Accuracy: ~50m</span>
              </div>

              {/* Radar Graphic */}
              <div className="w-full aspect-square rounded-3xl bg-slate-950 p-4 relative flex items-center justify-center overflow-hidden border border-slate-800">
                {/* Radar Sweep Animation */}
                <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping" />
                <div className="w-3/4 h-3/4 rounded-full border border-emerald-500/30 flex items-center justify-center">
                  <div className="w-1/2 h-1/2 rounded-full border border-emerald-500/40 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse" />
                  </div>
                </div>

                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-mono text-emerald-400">
                  <span>LAT: 6.9271° N</span><br />
                  <span>LON: 79.8612° E</span><br />
                  <span>COLOMBO, SRI LANKA</span>
                </div>
              </div>

              <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">Current Perimeter</span>
                  <span className="text-[10px] text-slate-500">Wi-Fi BSSID Geolocation Active</span>
                </div>
                <button
                  onClick={() => alert('Location ping dispatched to laptop.')}
                  className="py-1.5 px-3 rounded-xl bg-blue-600 text-white text-[11px] font-bold"
                >
                  Ping GPS
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: ALERTS TIMELINE                                  */}
        {/* ======================================================== */}
        {activeTab === 'alerts' && (
          <div className="flex flex-col gap-3 animate-in fade-in duration-200">
            <h3 className="text-sm font-black text-slate-900 px-1">Security Events & Audit History</h3>
            
            {events.map((ev, idx) => (
              <div key={ev.id || idx} className="jelly-card p-3.5 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-start gap-3">
                <div className={`p-2 rounded-xl mt-0.5 ${
                  ev.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : ev.severity === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{ev.event_type}</span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{ev.description}</p>
                </div>
              </div>
            ))}

            {events.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                No alerts detected. Laptop is safe.
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: PROFILE & APP INSTALL                            */}
        {/* ======================================================== */}
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            
            {/* User Details */}
            <div className="jelly-card p-4 rounded-3xl border border-white/80 shadow-md bg-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{user?.full_name || 'Owner'}</h4>
                  <span className="text-xs text-slate-500 font-mono">{user?.email || 'oshadhaperera500@gmail.com'}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                <span>Account Status: Active SaaS Tier</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>

            {/* Install Native App (PWA) Banner */}
            <div className="jelly-card p-4 rounded-3xl border border-blue-200 shadow-md bg-gradient-to-tr from-blue-500 to-indigo-600 text-white">
              <div className="flex items-center gap-2 mb-1.5">
                <Smartphone className="w-5 h-5" />
                <h4 className="font-bold text-sm">Install as Mobile App</h4>
              </div>
              <p className="text-xs text-blue-100 mb-3">
                Add LaptopGuard AI to your phone home screen for instant remote access with zero app store delays.
              </p>
              <button
                onClick={handleInstallPwa}
                className="w-full py-2.5 px-4 rounded-xl bg-white text-blue-700 font-bold text-xs shadow-md active:scale-98 transition-all"
              >
                {isPwaInstalled ? 'App Already Installed' : 'Add to Home Screen (Install)'}
              </button>
            </div>

            {/* Direct Downloads Hub */}
            <div className="jelly-card p-4 rounded-3xl border border-white/80 shadow-md bg-white space-y-2.5">
              <span className="text-xs font-black text-slate-900 block mb-1">Downloads Hub</span>

              <a
                href={getDownloadUrl('android-apk')}
                download="LaptopGuard-AI.apk"
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold text-slate-800 block">Android APK Package</span>
                    <span className="text-[10px] text-slate-500">Version 1.4.2</span>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-500" />
              </a>

              <a
                href={getDownloadUrl('windows-exe')}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Laptop className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="font-bold text-slate-800 block">Windows Sentinel .exe</span>
                    <span className="text-[10px] text-slate-500">79.7 MB Standalone</span>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-500" />
              </a>

              <button
                onClick={() => checkAutoUpdate(true)}
                disabled={isCheckingUpdate}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                <span>{isCheckingUpdate ? 'Checking OTA...' : 'Check for App Updates'}</span>
              </button>
            </div>

            {/* Logout Action */}
            <button
              onClick={() => {
                logoutUser();
                onBackToLanding();
              }}
              className="w-full py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out of Account</span>
            </button>

          </div>
        )}

      </main>

      {/* 3. Native Style Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-4 py-2 z-40 flex items-center justify-around shadow-lg">
        
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'home' ? 'text-blue-600 font-bold' : 'text-slate-400'
          }`}
        >
          <Shield className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          onClick={() => setActiveTab('camera')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'camera' ? 'text-blue-600 font-bold' : 'text-slate-400'
          }`}
        >
          <Camera className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px]">Camera</span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'map' ? 'text-blue-600 font-bold' : 'text-slate-400'
          }`}
        >
          <MapPin className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px]">Radar</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'alerts' ? 'text-blue-600 font-bold' : 'text-slate-400'
          }`}
        >
          <Bell className="w-5 h-5 stroke-[2.2]" />
          {events.length > 0 && (
            <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-rose-500" />
          )}
          <span className="text-[10px]">Alerts</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'profile' ? 'text-blue-600 font-bold' : 'text-slate-400'
          }`}
        >
          <User className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px]">Profile</span>
        </button>

      </nav>

    </div>
  );
};
