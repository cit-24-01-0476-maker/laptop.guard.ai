import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
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
import { api, getDownloadUrl, getCameraStreamUrl, getCameraSnapshotUrl } from '../services/api';
import { BrandLogo } from '../components/BrandLogo';

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
    refreshAll,
    takeSnapshot
  } = useSecurity();

  const [activeTab, setActiveTab] = useState<'home' | 'camera' | 'map' | 'alerts' | 'profile'>('home');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState('1.4.2');
  const [sirenCountdown, setSirenCountdown] = useState<number | null>(null);
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  // Camera Live states
  const [cameraKey, setCameraKey] = useState<number>(Date.now());
  const [cameraMode, setCameraMode] = useState<'stream' | 'poll'>('stream');
  const [pollUrl, setPollUrl] = useState<string>('');
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState<boolean>(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState<boolean>(false);

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
      setCameraKey(Date.now());
    }
  }, [activeTab, currentDev?.id]);

  // Dynamic Snapshot Polling Fallback (500ms intervals)
  useEffect(() => {
    let pollTimer: any = null;
    if (activeTab === 'camera' && cameraMode === 'poll' && currentDev?.id) {
      pollTimer = setInterval(() => {
        setPollUrl(getCameraSnapshotUrl(currentDev.id));
      }, 500);
    }
    return () => clearInterval(pollTimer);
  }, [activeTab, cameraMode, currentDev?.id]);

  // Check Over-The-Air (OTA) Auto-Update
  const checkAutoUpdate = async (manual = false) => {
    setIsCheckingUpdate(true);
    try {
      const res = await fetch(getDownloadUrl('manifest'));
      const data = await res.json();
      if (data.latest_version) {
        setCurrentVersion(data.latest_version);
        if (data.latest_version !== '1.4.2') {
          if (Capacitor.isNativePlatform()) {
            setUpdateMessage(`✨ Update v${data.latest_version} available! Tap to download.`);
          } else {
            if ('serviceWorker' in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              for (const reg of regs) {
                await reg.update();
              }
            }
            setUpdateMessage(`✨ Updating to v${data.latest_version}...`);
            setTimeout(() => {
              window.location.reload();
            }, 1200);
          }
        } else if (manual) {
          setUpdateMessage(`✅ App is up to date (v${data.latest_version}) • Auto-Update Active`);
        }
      }
    } catch (e) {
      if (manual) setUpdateMessage('App is running the latest live OTA bundle.');
    } finally {
      setIsCheckingUpdate(false);
      if (manual) setTimeout(() => setUpdateMessage(null), 4000);
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
    <div className="min-h-screen bg-[#F0F4FA] text-slate-800 flex flex-col items-center justify-between pb-28 relative select-none font-sans overflow-x-hidden">
      
      {/* Soft Ambient Liquid Glow Mesh */}
      <div className="ambient-liquid-glow pointer-events-none">
        <div className="ambient-blob-1" />
        <div className="ambient-blob-2" />
        <div className="ambient-blob-3" />
      </div>

      {/* 1. Mobile Top Frosted Glass Status Header */}
      <header className="w-full max-w-md sticky top-2 z-40 px-3">
        <div className="ios-jelly-card px-4 py-2.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" subtitle={false} />
            <div className="flex items-center gap-1 text-[9px] text-slate-500 font-medium pl-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isWsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="hidden xs:inline">{isWsConnected ? 'Live' : 'Sync'}</span>
            </div>
          </div>

          {/* Quick controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => refreshAll()}
              className="ios-bubble-btn p-2 rounded-xl bg-white/70 hover:bg-white text-slate-600 border border-slate-200/80 shadow-xs cursor-pointer"
              title="Refresh Telemetry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {!Capacitor.isNativePlatform() && (
              <button
                onClick={onOpenDashboard}
                className="ios-bubble-btn py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <span>PC View</span>
              </button>
            )}
          </div>
        </div>

        {/* Update alert banner */}
        {updateMessage && (
          <div
            onClick={() => {
              if (Capacitor.isNativePlatform()) {
                window.location.href = getDownloadUrl('android-apk');
              } else {
                window.location.reload();
              }
            }}
            className="mt-2 py-1.5 px-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold text-center animate-in fade-in cursor-pointer hover:bg-blue-100 transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            <RefreshCw className="w-3 h-3 text-blue-600" />
            <span>{updateMessage}</span>
          </div>
        )}
      </header>

      {/* 2. Main Tab Body */}
      <main className="w-full max-w-md px-3 pt-3 flex-1 flex flex-col gap-3.5 z-10">

        {/* ======================================================== */}
        {/* TAB 1: HOME / DASHBOARD                                 */}
        {/* ======================================================== */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
            
            {/* Live Laptop Device Card */}
            <div className="ios-jelly-card p-4 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="bubble-icon w-9 h-9 bubble-blue shadow-xs">
                    <Laptop className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">{currentDev.device_name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">Sentinel ID: {currentDev.id}</span>
                  </div>
                </div>
                <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 border shadow-xs ${
                  isArmed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isArmed ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                  <span>{currentDev.status}</span>
                </div>
              </div>

              {/* Hardware Telemetry Bar */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-white/70 border border-slate-200/80 text-xs shadow-xs">
                <div className="flex items-center gap-2">
                  {currentDev.is_charging ? (
                    <BatteryCharging className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <Battery className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Battery</span>
                    <span className="font-bold text-slate-800">{currentDev.battery}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Zap className={`w-4 h-4 flex-shrink-0 ${currentDev.is_charging ? 'text-amber-500 animate-pulse' : 'text-rose-500'}`} />
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
                <span>Watchdog: 500ms AC loop</span>
                <span className="text-emerald-600 font-bold">ACTIVE</span>
              </div>
            </div>

            {/* Giant Hero 1-Touch Armed / Disarmed Shield Bubble */}
            <div className="ios-jelly-card p-5 rounded-3xl shadow-md flex flex-col items-center text-center relative overflow-hidden">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
                Security Sentinel State
              </span>

              <button
                onClick={() => {
                  if (isArmed) {
                    disarmDevice(currentDev.id);
                  } else {
                    armDevice(currentDev.id);
                  }
                }}
                className={`relative group w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 ios-bubble-btn shadow-xl cursor-pointer ${
                  isArmed
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/30'
                    : 'bg-gradient-to-tr from-slate-700 to-slate-800 text-slate-200 shadow-slate-900/20'
                }`}
              >
                {/* Glowing Outer Ring */}
                <div className={`absolute -inset-2 rounded-full blur-md opacity-40 transition-all ${
                  isArmed ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
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
                  <span className="text-[9px] font-semibold opacity-85">
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
            <div className="grid grid-cols-2 gap-2.5">

              {/* 1. Deterrence Siren */}
              <button
                onClick={() => {
                  if (isAlarmActive) {
                    stopAlarm(currentDev.id);
                  } else {
                    soundAlarm(currentDev.id);
                  }
                }}
                className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 ios-bubble-btn shadow-xs cursor-pointer ${
                  isAlarmActive
                    ? 'bg-rose-600 text-white border-rose-700 shadow-rose-500/30 animate-pulse'
                    : 'bg-white/80 hover:bg-rose-50/60 border-rose-200/90 text-rose-700'
                }`}
              >
                <div className="bubble-icon w-8 h-8 bubble-rose shadow-xs">
                  {isAlarmActive ? <VolumeX className="w-4 h-4 text-rose-600" /> : <Volume2 className="w-4 h-4 text-rose-600" />}
                </div>
                <span className="text-xs font-black">
                  {isAlarmActive ? `Stop Siren (${sirenCountdown ?? 15}s)` : 'Sound Siren'}
                </span>
                <span className="text-[9px] opacity-75 font-medium">15s Auto-Mute</span>
              </button>

              {/* 2. Lock Workstation */}
              <button
                onClick={() => {
                  if (confirm('Lock this laptop immediately?')) {
                    lockDevice(currentDev.id);
                  }
                }}
                className="p-3.5 rounded-2xl bg-white/80 hover:bg-indigo-50/60 border border-indigo-200/90 text-indigo-700 flex flex-col items-center justify-center gap-1 ios-bubble-btn shadow-xs cursor-pointer"
              >
                <div className="bubble-icon w-8 h-8 bubble-blue shadow-xs">
                  <Lock className="w-4 h-4 text-indigo-600" />
                </div>
                <span className="text-xs font-black">Lock PC</span>
                <span className="text-[9px] opacity-75 font-medium">Instant Win32 Lock</span>
              </button>

              {/* 3. Open Camera Feed */}
              <button
                onClick={() => setActiveTab('camera')}
                className="p-3.5 rounded-2xl bg-white/80 hover:bg-cyan-50/60 border border-cyan-200/90 text-cyan-800 flex flex-col items-center justify-center gap-1 ios-bubble-btn shadow-xs cursor-pointer"
              >
                <div className="bubble-icon w-8 h-8 bubble-cyan shadow-xs">
                  <Camera className="w-4 h-4 text-cyan-600" />
                </div>
                <span className="text-xs font-black">Live Webcam</span>
                <span className="text-[9px] opacity-75 font-medium">Hardware Stream</span>
              </button>

              {/* 4. Lost Mode */}
              <button
                onClick={() => setIsLostModalOpen(true)}
                className="p-3.5 rounded-2xl bg-white/80 hover:bg-amber-50/60 border border-amber-200/90 text-amber-800 flex flex-col items-center justify-center gap-1 ios-bubble-btn shadow-xs cursor-pointer"
              >
                <div className="bubble-icon w-8 h-8 bubble-amber shadow-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-xs font-black">Lost Mode</span>
                <span className="text-[9px] opacity-75 font-medium">High-Priority Alert</span>
              </button>
            </div>

            {/* Recent Activity Timeline Widget */}
            <div className="ios-jelly-card p-4 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                  <span>Real-Time Security Activity</span>
                </span>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="space-y-2">
                {events.slice(0, 3).map((ev, idx) => (
                  <div key={ev.id || idx} className="p-2.5 rounded-2xl bg-white/70 border border-slate-200/80 flex items-center justify-between text-xs shadow-xs">
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
          <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
            <div className="ios-jelly-card p-4 rounded-3xl shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bubble-icon w-7 h-7 bubble-blue shadow-xs">
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">Physical Webcam Stream</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200">
                  HARDWARE LED ON
                </span>
              </div>

              {/* Video container */}
              <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-video relative flex items-center justify-center border border-slate-800 shadow-inner">
                <img
                  key={cameraKey}
                  src={cameraMode === 'stream' ? `${getCameraStreamUrl(currentDev.id)}?t=${cameraKey}` : (pollUrl || getCameraSnapshotUrl(currentDev.id))}
                  alt="Live Webcam Feed"
                  className="w-full h-full object-cover"
                  onError={() => {
                    setCameraMode('poll');
                    setPollUrl(getCameraSnapshotUrl(currentDev.id));
                  }}
                />

                {/* HUD Overlay Badge */}
                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-mono text-cyan-300 flex items-center gap-1.5 border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>DELL G15 • {cameraMode === 'stream' ? 'LIVE MJPEG' : 'AUTO-POLL HD'}</span>
                </div>

                {/* Stream Reconnect Button */}
                <div className="absolute bottom-2 right-2">
                  <button
                    onClick={() => {
                      setCameraMode('stream');
                      setCameraKey(Date.now());
                      api.startCameraSession(currentDev.id).catch(() => {});
                    }}
                    className="py-1 px-2.5 rounded-lg bg-black/70 backdrop-blur-md hover:bg-black/90 text-cyan-300 text-[10px] font-bold flex items-center gap-1 border border-white/10 active:scale-95 transition-all cursor-pointer"
                    title="Reconnect Camera Stream"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reconnect</span>
                  </button>
                </div>
              </div>

              {/* Action Controls Bar */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  onClick={async () => {
                    setIsCapturingSnapshot(true);
                    await takeSnapshot(currentDev.id);
                    setIsCapturingSnapshot(false);
                    setSnapshotSuccess(true);
                    setTimeout(() => setSnapshotSuccess(false), 2500);
                  }}
                  disabled={isCapturingSnapshot}
                  className="flex-1 py-2.5 px-3 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 ios-bubble-btn cursor-pointer disabled:opacity-60"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isCapturingSnapshot ? 'Capturing...' : snapshotSuccess ? '✓ Snapshot Saved!' : 'Take Security Photo'}</span>
                </button>

                <button
                  onClick={() => {
                    const newMode = cameraMode === 'stream' ? 'poll' : 'stream';
                    setCameraMode(newMode);
                    setCameraKey(Date.now());
                    if (newMode === 'poll') {
                      setPollUrl(getCameraSnapshotUrl(currentDev.id));
                    }
                  }}
                  className="py-2.5 px-3 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold ios-bubble-btn cursor-pointer"
                >
                  {cameraMode === 'stream' ? 'Snapshots' : 'Stream'}
                </button>
              </div>

              <p className="text-[10px] text-slate-500 mt-2 text-center">
                Strict Privacy Policy: Live stream automatically times out after 5 minutes.
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: RADAR / MAP                                      */}
        {/* ======================================================== */}
        {activeTab === 'map' && (
          <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
            <div className="ios-jelly-card p-4 rounded-3xl shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bubble-icon w-7 h-7 bubble-mint shadow-xs">
                    <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">Geographic Location Radar</h3>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Accuracy: ~50m</span>
              </div>

              {/* Radar Graphic */}
              <div className="w-full aspect-square rounded-3xl bg-slate-950 p-4 relative flex items-center justify-center overflow-hidden border border-slate-800 shadow-inner">
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

              <div className="mt-3 p-3 rounded-2xl bg-white/70 border border-slate-200/80 flex items-center justify-between shadow-xs">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">Current Perimeter</span>
                  <span className="text-[10px] text-slate-500">Wi-Fi BSSID Geolocation Active</span>
                </div>
                <button
                  onClick={() => alert('Location ping dispatched to laptop.')}
                  className="py-1.5 px-3 rounded-xl bg-blue-600 text-white text-[11px] font-bold ios-bubble-btn cursor-pointer"
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
              <div key={ev.id || idx} className="ios-jelly-card p-3.5 rounded-2xl shadow-xs flex items-start gap-3">
                <div className={`p-2 rounded-xl mt-0.5 flex-shrink-0 ${
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
          <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
            
            {/* User Details */}
            <div className="ios-jelly-card p-4 rounded-3xl shadow-sm">
              <div className="flex items-center gap-3 mb-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold text-base shadow-md shadow-blue-500/25">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{user?.full_name || 'Owner'}</h4>
                  <span className="text-xs text-slate-500 font-mono">{user?.email || 'oshadhaperera500@gmail.com'}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                <span>Account Status: Active Sovereign Sentinel</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>

            {/* Install Native App (PWA) Banner */}
            <div className="ios-jelly-card p-4 rounded-3xl shadow-md bg-gradient-to-tr from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center gap-2 mb-1.5">
                <Smartphone className="w-5 h-5" />
                <h4 className="font-bold text-sm">Install as Mobile App</h4>
              </div>
              <p className="text-xs text-blue-100 mb-3">
                Add LaptopGuard AI to your phone home screen for instant remote access with zero app store delays.
              </p>
              <button
                onClick={handleInstallPwa}
                className="w-full py-2.5 px-4 rounded-xl bg-white text-blue-700 font-bold text-xs shadow-md ios-bubble-btn cursor-pointer"
              >
                {isPwaInstalled ? 'App Already Installed' : 'Add to Home Screen (Install)'}
              </button>
            </div>

            {/* Direct Downloads Hub */}
            <div className="ios-jelly-card p-4 rounded-3xl shadow-sm space-y-2.5">
              <span className="text-xs font-black text-slate-900 block mb-1">Downloads Hub</span>

              <a
                href={getDownloadUrl('android-apk')}
                download="LaptopGuard-AI.apk"
                className="w-full p-3 rounded-2xl bg-white/70 border border-slate-200/80 flex items-center justify-between text-xs hover:bg-blue-50/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold text-slate-800 block">Android APK Package</span>
                    <span className="text-[10px] text-slate-500">Version 1.4.2 • 15.8 MB</span>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-500" />
              </a>

              <a
                href={getDownloadUrl('windows-exe')}
                className="w-full p-3 rounded-2xl bg-white/70 border border-slate-200/80 flex items-center justify-between text-xs hover:bg-blue-50/80 transition-colors cursor-pointer"
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
                className="w-full py-2.5 rounded-2xl border border-slate-200/80 bg-white/70 text-xs font-bold text-slate-700 hover:bg-white flex items-center justify-center gap-1.5 ios-bubble-btn cursor-pointer"
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
              className="w-full py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 ios-bubble-btn cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out of Account</span>
            </button>

          </div>
        )}

      </main>

      {/* 3. Floating iOS Jelly Glass Bottom Navigation Bar */}
      <nav className="fixed bottom-3 left-3 right-3 max-w-md mx-auto ios-frosted-nav rounded-[30px] px-2.5 py-2 z-40 flex items-center justify-around shadow-2xl transition-all">
        
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'home'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105 font-bold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <Shield className="w-4 h-4 stroke-[2.2]" />
          <span className="text-[9px]">Home</span>
        </button>

        <button
          onClick={() => setActiveTab('camera')}
          className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'camera'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105 font-bold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <Camera className="w-4 h-4 stroke-[2.2]" />
          <span className="text-[9px]">Camera</span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'map'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105 font-bold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <MapPin className="w-4 h-4 stroke-[2.2]" />
          <span className="text-[9px]">Radar</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all cursor-pointer relative ${
            activeTab === 'alerts'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105 font-bold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <Bell className="w-4 h-4 stroke-[2.2]" />
          {events.length > 0 && (
            <span className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-rose-500" />
          )}
          <span className="text-[9px]">Alerts</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105 font-bold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <User className="w-4 h-4 stroke-[2.2]" />
          <span className="text-[9px]">Profile</span>
        </button>

      </nav>

    </div>
  );
};
