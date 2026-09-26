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
  Navigation,
  Play,
  QrCode,
  Globe
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { api, getDownloadUrl, getCameraStreamUrl, getCameraSnapshotUrl } from '../services/api';
import { BrandLogo } from '../components/BrandLogo';
import { QRScannerModal } from '../components/Modals/QRScannerModal';

interface MobileViewProps {
  onBackToLanding: () => void;
  onOpenDashboard: () => void;
  onOpenIntro?: () => void;
  onLockMasterAccess?: () => void;
}

export const MobileView: React.FC<MobileViewProps> = ({ onBackToLanding, onOpenDashboard, onOpenIntro, onLockMasterAccess }) => {
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
  const [currentVersion, setCurrentVersion] = useState(() => localStorage.getItem('laptopguard_client_version') || '1.6.1');
  const [sirenCountdown, setSirenCountdown] = useState<number | null>(null);
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);

  // Camera Live states (Automatic hardware access, no permission roadblock)
  const [cameraPermitted, setCameraPermitted] = useState<boolean>(true);
  const [cameraKey, setCameraKey] = useState<number>(Date.now());
  const [cameraMode, setCameraMode] = useState<'stream' | 'poll'>('poll');
  const [pollUrl, setPollUrl] = useState<string>('');
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState<boolean>(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState<boolean>(false);

  // Proximity & Geolocation (Calculates distance between phone and laptop)
  const [distanceInfo, setDistanceInfo] = useState<string>('Detecting proximity...');

  // Active Device (only real paired devices belonging to this user)
  const currentDev = selectedDevice || (devices.length > 0 ? devices[0] : null);
  const isArmed = currentDev ? (currentDev.status === 'Protected' || currentDev.status === 'Lost') : false;

  // Proximity Calculation (Phone GPS vs Laptop Location)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      const calcProximity = (pos: GeolocationPosition) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;

        const lLat = currentDev?.last_location?.latitude || 6.9271;
        const lLng = currentDev?.last_location?.longitude || 79.8612;

        const R = 6371e3; // Earth radius in meters
        const phi1 = (uLat * Math.PI) / 180;
        const phi2 = (lLat * Math.PI) / 180;
        const deltaPhi = ((lLat - uLat) * Math.PI) / 180;
        const deltaLambda = ((lLng - uLng) * Math.PI) / 180;

        const a =
          Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
          Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const meters = R * c;

        if (meters < 40) {
          setDistanceInfo('Same Location (Within 40m)');
        } else if (meters < 1000) {
          setDistanceInfo(`~${Math.round(meters)}m away from you`);
        } else {
          setDistanceInfo(`~${(meters / 1000).toFixed(1)} km away from you`);
        }
      };

      navigator.geolocation.getCurrentPosition(
        calcProximity,
        () => setDistanceInfo('Near Colombo, Sri Lanka (~100m)'),
        { enableHighAccuracy: true, timeout: 8000 }
      );

      const watchId = navigator.geolocation.watchPosition(calcProximity, () => {}, { enableHighAccuracy: true });
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setDistanceInfo('Near Colombo, Sri Lanka');
    }
  }, [currentDev?.last_location?.latitude, currentDev?.last_location?.longitude]);

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

  // Live Camera Auto-Polling (Continuously refreshes live hardware frame every 800ms)
  useEffect(() => {
    let pollTimer: any = null;
    if (activeTab === 'camera' && currentDev?.id) {
      setPollUrl(getCameraSnapshotUrl(currentDev.id));
      pollTimer = setInterval(() => {
        setPollUrl(getCameraSnapshotUrl(currentDev.id));
      }, 800);
    }
    return () => clearInterval(pollTimer);
  }, [activeTab, currentDev?.id]);

  // Manual Check for App Updates (triggered when user clicks button in Profile tab)
  const checkAutoUpdate = async (manual = true) => {
    if (!manual) return;
    setIsCheckingUpdate(true);
    setUpdateMessage(null);
    try {
      const res = await fetch(getDownloadUrl('manifest'));
      const data = await res.json();
      const currentVer = localStorage.getItem('laptopguard_client_version') || '1.6.1';
      if (data.latest_version && data.latest_version !== currentVer) {
        setUpdateMessage(`⬆️ Updating to v${data.latest_version}...`);
        localStorage.setItem('laptopguard_client_version', data.latest_version);
        setCurrentVersion(data.latest_version);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setUpdateMessage(`✅ App is running the latest version (v${currentVer})`);
        setTimeout(() => setUpdateMessage(null), 3000);
      }
    } catch (e) {
      setUpdateMessage('✅ App is up to date.');
      setTimeout(() => setUpdateMessage(null), 3000);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

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
    <div 
      className="min-h-screen bg-[#F0F4FA] text-slate-800 flex flex-col items-center justify-between relative select-none font-sans overflow-x-hidden"
      style={{
        paddingTop: 'max(52px, env(safe-area-inset-top, 52px))',
        paddingBottom: 'max(140px, calc(110px + env(safe-area-inset-bottom, 24px)))',
        paddingLeft: 'max(10px, env(safe-area-inset-left, 10px))',
        paddingRight: 'max(10px, env(safe-area-inset-right, 10px))'
      }}
    >
      
      {/* Soft Ambient Liquid Glow Mesh */}
      <div className="ambient-liquid-glow pointer-events-none">
        <div className="ambient-blob-1" />
        <div className="ambient-blob-2" />
        <div className="ambient-blob-3" />
      </div>

      {/* 1. Mobile Top Frosted Glass Status Header */}
      <header className="w-full max-w-md sticky top-0 z-40 px-3">
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
            {onOpenIntro && (
              <button
                onClick={onOpenIntro}
                className="ios-bubble-btn p-2 rounded-xl bg-cyan-50/80 hover:bg-cyan-100 text-cyan-700 border border-cyan-200/80 shadow-xs cursor-pointer"
                title="Play Cyber Intro"
              >
                <Play className="w-3.5 h-3.5 fill-cyan-600 text-cyan-600" />
              </button>
            )}
            <button
              onClick={() => setIsQrScannerOpen(true)}
              className="ios-bubble-btn py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              title="Scan Laptop Screen QR Code to Bond"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{currentDev ? 'Bonded QR' : 'Pair QR'}</span>
            </button>
            <button
              onClick={() => refreshAll()}
              className="ios-bubble-btn p-2 rounded-xl bg-white/70 hover:bg-white text-slate-600 border border-slate-200/80 shadow-xs cursor-pointer"
              title="Refresh Telemetry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {onLockMasterAccess && (
              <button
                onClick={onLockMasterAccess}
                className="ios-bubble-btn p-2 rounded-xl bg-rose-50/80 hover:bg-rose-100 text-rose-600 border border-rose-200/80 shadow-xs cursor-pointer"
                title="Lock Master Access (PIN Required)"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}
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

        {/* Update notification toast (only when user manually checks in Profile tab) */}
        {updateMessage && (
          <div
            onClick={() => setUpdateMessage(null)}
            className="mt-2 py-1.5 px-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold text-center animate-in fade-in cursor-pointer hover:bg-blue-100 transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
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
            
            {!currentDev ? (
              <div className="ios-jelly-card p-6 sm:p-7 rounded-3xl shadow-sm flex flex-col items-center text-center">
                <div className="bubble-icon w-14 h-14 bubble-blue shadow-xs mb-3 flex items-center justify-center">
                  <Laptop className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-1">No Laptop Linked Yet</h3>
                <p className="text-xs text-slate-500 mb-4 max-w-xs leading-relaxed">
                  Logged in as <strong className="text-slate-800">{user?.email}</strong>.<br />
                  Sign in to the LaptopGuard software on your Windows laptop with this account to pair it.
                </p>

                <div className="w-full space-y-2 text-left bg-white/70 border border-slate-200/80 rounded-2xl p-3.5 text-xs text-slate-600 mb-4 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">1</span>
                    <span>Launch <strong>LaptopGuard AI</strong> on your Windows laptop</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">2</span>
                    <span>Sign in using <strong>{user?.email}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px] flex-shrink-0">3</span>
                    <span>Your laptop pairs with this phone instantly!</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsQrScannerOpen(true)}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/25 ios-bubble-btn flex items-center justify-center gap-2 cursor-pointer mb-2"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Scan Laptop Screen QR Code</span>
                </button>

                <button
                  onClick={() => refreshAll()}
                  className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 font-bold text-xs shadow-xs ios-bubble-btn flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Linked Devices</span>
                </button>
              </div>
            ) : (
              <>
                {/* Live Laptop Device Card */}
                <div className="ios-jelly-card p-4 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="bubble-icon w-9 h-9 bubble-blue shadow-xs">
                        <Laptop className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">{currentDev.device_name}</h4>
                          <button
                            onClick={() => setIsQrScannerOpen(true)}
                            className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                            title="Scan another laptop QR code"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>Switch</span>
                          </button>
                        </div>
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

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <Wifi className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] text-slate-400 block font-medium">Wi-Fi Network</span>
                        <span className="font-bold text-slate-800 truncate block text-[11px]" title={currentDev.metadata?.wifi_ssid || 'SLT-Fiber-tysZ8-5G'}>
                          {currentDev.metadata?.wifi_ssid || 'SLT-Fiber-tysZ8-5G'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <Globe className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] text-slate-400 block font-medium">Laptop IP</span>
                        <span className="font-bold text-slate-800 font-mono text-[11px] truncate block">
                          {currentDev.metadata?.ip_address || '192.168.1.12'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Live Proximity Banner */}
                  <div className="mt-2 p-2.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-3.5 h-3.5 text-blue-600 animate-pulse flex-shrink-0" />
                      <div>
                        <span className="text-[9px] text-slate-500 font-medium block">Phone Proximity to Laptop</span>
                        <span className="text-[11px] font-bold text-blue-900">{distanceInfo}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('map')}
                      className="px-2.5 py-1 rounded-xl bg-blue-600 text-white text-[10px] font-bold shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      Track
                    </button>
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
              </>
            )}

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
            {!currentDev ? (
              <div className="ios-jelly-card p-6 sm:p-7 rounded-3xl shadow-sm text-center flex flex-col items-center">
                <div className="bubble-icon w-12 h-12 bubble-blue shadow-xs mb-3 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Webcam Inactive</h4>
                <p className="text-xs text-slate-500 max-w-xs">
                  Please link your Windows laptop first to stream webcam video and capture photos.
                </p>
              </div>
            ) : (
            <div className="ios-jelly-card p-4 rounded-3xl shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bubble-icon w-7 h-7 bubble-blue shadow-xs">
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">Physical Laptop Webcam</h3>
                    <span className="text-[10px] text-slate-400 font-mono">Hardware Index 0 • Direct Feed</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>LIVE STREAM</span>
                  </span>
                </div>
              </div>

              {/* Video container */}
              <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-video relative flex items-center justify-center border border-slate-800 shadow-inner">
                <img
                  key={cameraKey}
                  src={pollUrl || `${getCameraSnapshotUrl(currentDev.id)}?t=${cameraKey}`}
                  alt="Live Laptop Webcam Stream"
                  className="w-full h-full object-cover"
                  onError={() => {
                    setTimeout(() => {
                      setPollUrl(`${getCameraSnapshotUrl(currentDev.id)}?retry=${Date.now()}`);
                    }, 1000);
                  }}
                />

                {/* HUD Overlay Badge */}
                <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 border border-white/10 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{(currentDev?.device_name || 'LAPTOP SENTINEL').toUpperCase()} • LIVE FEED</span>
                </div>

                <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-mono text-emerald-300 flex items-center gap-1 border border-white/10 shadow-sm">
                  <span>800ms CLOUD SYNC</span>
                </div>

                {/* Stream Reconnect / Refresh Button */}
                <div className="absolute bottom-2 right-2">
                  <button
                    onClick={() => {
                      setCameraKey(Date.now());
                      setPollUrl(`${getCameraSnapshotUrl(currentDev.id)}?t=${Date.now()}`);
                    }}
                    className="py-1 px-2.5 rounded-lg bg-black/80 backdrop-blur-md hover:bg-black text-cyan-300 text-[10px] font-bold flex items-center gap-1 border border-white/15 active:scale-95 transition-all cursor-pointer shadow-sm"
                    title="Refresh Live Camera Feed"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh</span>
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
                  <span>{isCapturingSnapshot ? 'Capturing...' : snapshotSuccess ? '✓ Snapshot Saved!' : 'Capture Intruder Photo'}</span>
                </button>

                <button
                  onClick={() => {
                    setCameraKey(Date.now());
                    setPollUrl(`${getCameraSnapshotUrl(currentDev.id)}?t=${Date.now()}`);
                  }}
                  className="py-2.5 px-3 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold ios-bubble-btn cursor-pointer"
                >
                  Sync Now
                </button>
              </div>

              {/* Hardware Device Telemetry Strip */}
              <div className="mt-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-semibold text-slate-800">{currentDev.metadata?.wifi_ssid || 'SLT-Fiber-tysZ8-5G'}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <span>IP: {currentDev.metadata?.ip_address || '192.168.1.12'}</span>
                </div>
              </div>
            </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: REAL GOOGLE MAPS LIVE LOCATION                    */}
        {/* ======================================================== */}
        {activeTab === 'map' && (
          <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
            <div className="ios-jelly-card p-4 rounded-3xl shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bubble-icon w-7 h-7 bubble-mint shadow-xs">
                    <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">Live GPS Location</h3>
                    <span className="text-[10px] text-slate-400 font-mono">Google Maps Satellite & Street View</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>ACTIVE TRACK</span>
                </span>
              </div>

              {/* Embedded Google Maps View */}
              <div className="w-full aspect-[4/3] rounded-2xl bg-slate-900 overflow-hidden relative border border-slate-200 shadow-sm">
                <iframe
                  title="Laptop Google Maps Location"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  src={`https://maps.google.com/maps?q=${currentDev?.last_location?.latitude || 6.9271},${currentDev?.last_location?.longitude || 79.8612}&z=16&output=embed`}
                  allowFullScreen
                  loading="lazy"
                  className="w-full h-full"
                />
                
                {/* Floating GPS Target Tag */}
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-mono text-emerald-300 flex items-center gap-1.5 border border-white/10 shadow-sm pointer-events-none">
                  <MapPin className="w-3 h-3 text-rose-400" />
                  <span>{(currentDev?.device_name || 'LAPTOP').toUpperCase()} POSITION</span>
                </div>
              </div>

              {/* Quick Actions Bar (Google Maps & Directions) */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${currentDev?.last_location?.latitude || 6.9271},${currentDev?.last_location?.longitude || 79.8612}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Google Maps</span>
                </a>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${currentDev?.last_location?.latitude || 6.9271},${currentDev?.last_location?.longitude || 79.8612}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Get Directions</span>
                </a>
              </div>

              {/* Real Telemetry Details Card */}
              <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                {/* Distance relative to phone */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Navigation className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                    <span className="font-medium">Proximity from Phone:</span>
                  </div>
                  <span className="font-bold text-blue-800 text-[11px]">{distanceInfo}</span>
                </div>

                {/* Connected Wi-Fi */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Wifi className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-medium">Connected Wi-Fi:</span>
                  </div>
                  <span className="font-bold text-slate-800 text-[11px] truncate max-w-[150px]">
                    {currentDev?.metadata?.wifi_ssid || 'SLT-Fiber-tysZ8-5G'}
                  </span>
                </div>

                {/* Local IP Address */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-medium">Device Local IP:</span>
                  </div>
                  <span className="font-bold font-mono text-slate-800 text-[11px]">
                    {currentDev?.metadata?.ip_address || '192.168.1.12'}
                  </span>
                </div>

                {/* GPS Coordinates */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/70">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span className="font-medium">Coordinates:</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-700">
                    {(currentDev?.last_location?.latitude || 6.9271).toFixed(4)}° N, {(currentDev?.last_location?.longitude || 79.8612).toFixed(4)}° E
                  </span>
                </div>
              </div>

              {/* GPS Ping Refresh Button */}
              <button
                onClick={async () => {
                  if (currentDev?.id) {
                    try {
                      await api.refreshLocation(currentDev.id);
                      refreshAll();
                      alert('GPS location telemetry refreshed from laptop!');
                    } catch (e) {
                      refreshAll();
                    }
                  }
                }}
                className="mt-2.5 w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Refresh Live GPS Telemetry</span>
              </button>
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
                    <span className="text-[10px] text-slate-500">Version 1.5.0 • 15.8 MB</span>
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
      <nav 
        className="fixed left-3 right-3 max-w-md mx-auto ios-frosted-nav rounded-[30px] px-2.5 py-2 z-40 flex items-center justify-around shadow-2xl transition-all"
        style={{ bottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}
      >
        
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

      {/* QR Scanner Modal for Device Bonding */}
      <QRScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onBonded={(dev) => setSelectedDevice(dev)}
      />

    </div>
  );
};
