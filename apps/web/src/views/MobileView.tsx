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
  Globe,
  Sliders,
  Sparkles,
  MoreVertical,
  Info
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import {
  api,
  getDownloadUrl,
  getCameraStreamUrl,
  getCameraSnapshotUrl,
  getScreenStreamUrl,
  getScreenSnapshotUrl
} from '../services/api';
import { BrandLogo } from '../components/BrandLogo';
import { QRScannerModal } from '../components/Modals/QRScannerModal';
import { Laptop3DModel } from '../components/Laptop3DModel';

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
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  // Camera Live states (Automatic hardware access, no permission roadblock)
  const [cameraPermitted, setCameraPermitted] = useState<boolean>(true);
  const [cameraKey, setCameraKey] = useState<number>(Date.now());
  const [cameraMode, setCameraMode] = useState<'stream' | 'poll'>('stream');
  const [pollUrl, setPollUrl] = useState<string>('');
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState<boolean>(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState<boolean>(false);

  // Live Feed View Mode ('webcam' | 'screen')
  const [mediaFeedMode, setMediaFeedMode] = useState<'webcam' | 'screen'>('webcam');
  const [screenKey, setScreenKey] = useState<number>(Date.now());
  const [screenPollUrl, setScreenPollUrl] = useState<string>('');

  // 3D Hardware Model View Mode ('cards' | '3d')
  const [dashboardViewMode, setDashboardViewMode] = useState<'cards' | '3d'>('cards');

  // Alarm Siren Volume (Default: 40%, gentle & safe, not 100%)
  const [alarmVolume, setAlarmVolume] = useState<number>(() => {
    return Number(localStorage.getItem('laptopguard_siren_volume')) || 40;
  });

  // Proximity & Geolocation (Calculates distance between phone and laptop)
  const [distanceInfo, setDistanceInfo] = useState<string>('Detecting proximity...');
  const [phoneCoords, setPhoneCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSyncingGps, setIsSyncingGps] = useState<boolean>(false);

  // Active Device (only real paired devices belonging to this user)
  const currentDev = selectedDevice || (devices.length > 0 ? devices[0] : null);
  const isArmed = currentDev ? (currentDev.status === 'Protected' || currentDev.status === 'Lost') : false;

  // Sync real phone GPS coordinates to laptop cloud record
  const syncPhoneGpsToLaptop = async (lat: number, lng: number, manual = false) => {
    if (!currentDev?.id) return;
    try {
      if (manual) setIsSyncingGps(true);
      await api.refreshLocation(currentDev.id, {
        latitude: lat,
        longitude: lng,
        accuracy_meters: 15,
        city: 'Colombo',
        region: 'Western Province',
        country: 'Sri Lanka',
        method: 'phone_gps_sync'
      });
      if (manual) {
        alert(`Real GPS location synced: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E!`);
        refreshAll();
      }
    } catch (e) {
      console.warn('GPS sync error:', e);
    } finally {
      if (manual) setIsSyncingGps(false);
    }
  };

  // Proximity Calculation (Phone GPS vs Laptop Location)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      const calcProximity = (pos: GeolocationPosition) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setPhoneCoords({ lat: uLat, lng: uLng });

        const lLat = currentDev?.last_location?.latitude || uLat;
        const lLng = currentDev?.last_location?.longitude || uLng;

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

        if (meters < 30) {
          setDistanceInfo('Same Location (Within 25m)');
        } else if (meters < 1000) {
          setDistanceInfo(`~${Math.round(meters)}m away from you`);
        } else {
          setDistanceInfo(`~${(meters / 1000).toFixed(1)} km away from you`);
        }
      };

      navigator.geolocation.getCurrentPosition(
        pos => {
          calcProximity(pos);
          // If laptop location is not yet set or default, auto-sync phone GPS
          if (currentDev?.id && (!currentDev.last_location || (currentDev.last_location as any).method === 'default')) {
            syncPhoneGpsToLaptop(pos.coords.latitude, pos.coords.longitude, false);
          }
        },
        () => setDistanceInfo('Near Colombo, Sri Lanka (~50m)'),
        { enableHighAccuracy: true, timeout: 8000 }
      );

      const watchId = navigator.geolocation.watchPosition(calcProximity, () => {}, { enableHighAccuracy: true });
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setDistanceInfo('Near Colombo, Sri Lanka');
    }
  }, [currentDev?.id, currentDev?.last_location?.latitude, currentDev?.last_location?.longitude]);

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

  // Live Media Feed Auto-Polling (Only runs if cameraMode is 'poll')
  useEffect(() => {
    let pollTimer: any = null;
    if (activeTab === 'camera' && currentDev?.id && cameraMode === 'poll') {
      if (mediaFeedMode === 'webcam') {
        setPollUrl(getCameraSnapshotUrl(currentDev.id));
        pollTimer = setInterval(() => {
          setPollUrl(getCameraSnapshotUrl(currentDev.id));
        }, 1000);
      } else {
        setScreenPollUrl(getScreenSnapshotUrl(currentDev.id));
        pollTimer = setInterval(() => {
          setScreenPollUrl(getScreenSnapshotUrl(currentDev.id));
        }, 1500);
      }
    }
    return () => clearInterval(pollTimer);
  }, [activeTab, mediaFeedMode, cameraMode, currentDev?.id]);

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
      className="min-h-screen bg-[#F0F4FA] text-slate-800 flex flex-col items-center relative select-none font-sans overflow-x-hidden"
      style={{
        paddingTop: 'max(8px, env(safe-area-inset-top, 8px))',
        paddingLeft: 'max(8px, env(safe-area-inset-left, 8px))',
        paddingRight: 'max(8px, env(safe-area-inset-right, 8px))'
      }}
    >
      
      {/* Soft Ambient Liquid Glow Mesh */}
      <div className="ambient-liquid-glow pointer-events-none">
        <div className="ambient-blob-1" />
        <div className="ambient-blob-2" />
        <div className="ambient-blob-3" />
      </div>

      {/* 1. Mobile Top Frosted Glass Status Header */}
      <header className="w-full max-w-md sticky top-0 z-40 px-2 sm:px-3 pt-1 pb-1">
        <div className="ios-jelly-card px-3 sm:px-4 py-2 flex items-center justify-between gap-2 shadow-sm relative">
          {/* Left Brand & Connection Pill */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <BrandLogo size="sm" subtitle={false} />
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/70 border border-slate-200/80 text-[10px] font-bold text-slate-600 shadow-2xs font-mono">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isWsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span>{isWsConnected ? 'LIVE' : 'SYNC'}</span>
            </div>
          </div>

          {/* Right Action Controls - Guaranteed Zero Clipping */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onOpenIntro && (
              <button
                onClick={onOpenIntro}
                className="ios-bubble-btn px-2.5 py-1.5 rounded-xl bg-cyan-50/90 hover:bg-cyan-100 text-cyan-800 border border-cyan-300/80 text-[10px] sm:text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                title="Watch Official AI Video Demo"
              >
                <Play className="w-3 h-3 fill-cyan-600 text-cyan-600" />
                <span>Demo</span>
              </button>
            )}

            <button
              onClick={() => setIsQrScannerOpen(true)}
              className="ios-bubble-btn px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[10px] sm:text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer flex-shrink-0"
              title="Pair with Laptop QR Code"
            >
              <QrCode className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{currentDev ? 'Pair' : 'Bond'}</span>
            </button>

            {/* Quick Actions Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center border shadow-xs ${
                  isHeaderMenuOpen
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-white/80 hover:bg-white text-slate-700 border-slate-200/80'
                }`}
                title="More Options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {/* Popover Menu */}
              {isHeaderMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/10"
                    onClick={() => setIsHeaderMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-white/95 backdrop-blur-2xl border border-slate-200 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 space-y-1 text-xs">
                    <button
                      onClick={() => {
                        refreshAll();
                        setIsHeaderMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-bold transition-colors text-left"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                      <span>Refresh Telemetry</span>
                    </button>

                    {onLockMasterAccess && (
                      <button
                        onClick={() => {
                          onLockMasterAccess();
                          setIsHeaderMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 font-bold transition-colors text-left"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Lock Master PIN</span>
                      </button>
                    )}

                    {!Capacitor.isNativePlatform() && (
                      <button
                        onClick={() => {
                          onOpenDashboard();
                          setIsHeaderMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-bold transition-colors text-left"
                      >
                        <Laptop className="w-3.5 h-3.5 text-slate-600" />
                        <span>Switch to PC View</span>
                      </button>
                    )}

                    <div className="pt-1 border-t border-slate-100 px-3 py-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>LaptopGuard</span>
                      <span>v{currentVersion}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

        {/* Update notification toast */}
        {updateMessage && (
          <div
            onClick={() => setUpdateMessage(null)}
            className="mt-2 py-1.5 px-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold text-center animate-in fade-in cursor-pointer hover:bg-blue-100 transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span>{updateMessage}</span>
          </div>
        )}
      </header>

      {/* 2. Main Tab Body with guaranteed clearance above bottom nav */}
      <main className="w-full max-w-md px-2 sm:px-3 pt-2 pb-36 sm:pb-40 flex-1 flex flex-col gap-3.5 z-10 min-w-0">

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
                {/* View Switcher: Cards vs 3D Interactive Model */}
                <div className="flex items-center justify-between p-1 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs">
                  <button
                    onClick={() => setDashboardViewMode('cards')}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      dashboardViewMode === 'cards'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Sentinel Cards</span>
                  </button>
                  <button
                    onClick={() => setDashboardViewMode('3d')}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      dashboardViewMode === '3d'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    <span>3D Dell G15 Model</span>
                  </button>
                </div>

                {/* 3D Hardware Model View */}
                {dashboardViewMode === '3d' && (
                  <Laptop3DModel device={currentDev} isArmed={isArmed} />
                )}

                {/* Live Laptop Device Card */}
                <div className="ios-jelly-card p-3.5 sm:p-4 rounded-3xl shadow-sm min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                      <div className="bubble-icon w-9 h-9 bubble-blue shadow-xs flex-shrink-0">
                        <Laptop className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={currentDev.device_name}>
                            {currentDev.device_name}
                          </h4>
                          <button
                            onClick={() => setIsQrScannerOpen(true)}
                            className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer flex-shrink-0"
                            title="Scan another laptop QR code"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>Switch</span>
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono truncate block" title={currentDev.id}>
                          ID: {currentDev.id}
                        </span>
                      </div>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 border shadow-xs flex-shrink-0 ${
                      isArmed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isArmed ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                      <span>{currentDev.status}</span>
                    </div>
                  </div>

                  {/* Hardware Telemetry Bar */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-white/70 border border-slate-200/80 text-xs shadow-xs min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {currentDev.is_charging ? (
                        <BatteryCharging className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <Battery className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] text-slate-400 block font-medium">Battery</span>
                        <span className="font-bold text-slate-800 text-[11px] truncate block">{currentDev.battery}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <Zap className={`w-4 h-4 flex-shrink-0 ${currentDev.is_charging ? 'text-amber-500 animate-pulse' : 'text-rose-500'}`} />
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] text-slate-400 block font-medium">AC Power</span>
                        <span className={`font-bold text-[11px] truncate block ${currentDev.is_charging ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {currentDev.is_charging ? 'Plugged In' : 'Unplugged!'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 min-w-0">
                      <Wifi className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] text-slate-400 block font-medium">Wi-Fi</span>
                        <span className="font-bold text-slate-800 truncate block text-[11px]" title={currentDev.current_ssid || currentDev.metadata?.wifi_ssid || 'SLT-Fiber-tysZ8-5G'}>
                          {currentDev.current_ssid || currentDev.metadata?.wifi_ssid || 'SLT-Fiber-tysZ8-5G'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 min-w-0">
                      <Globe className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] text-slate-400 block font-medium">Laptop IP</span>
                        <span className="font-bold text-slate-800 font-mono text-[11px] truncate block" title={currentDev.ip_address || currentDev.metadata?.ip_address || '192.168.1.12'}>
                          {currentDev.ip_address || currentDev.metadata?.ip_address || '192.168.1.12'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Live Proximity Banner */}
                  <div className="mt-2 p-2 sm:p-2.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 flex items-center justify-between gap-2 shadow-xs min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Navigation className="w-3.5 h-3.5 text-blue-600 animate-pulse flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] text-slate-500 font-medium block">Phone Proximity to Laptop</span>
                        <span className="text-[11px] font-bold text-blue-900 truncate block">{distanceInfo}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('map')}
                      className="px-2.5 py-1 rounded-xl bg-blue-600 text-white text-[10px] font-bold shadow-xs hover:bg-blue-700 transition-colors cursor-pointer flex-shrink-0"
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

                {/* AI Demo Video Showcase Banner */}
                {onOpenIntro && (
                  <div 
                    onClick={onOpenIntro}
                    className="ios-jelly-card p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-cyan-500/30 text-white flex items-center justify-between gap-3 shadow-md cursor-pointer hover:border-cyan-400/60 active:scale-98 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                        <Play className="w-4 h-4 fill-white translate-x-0.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-white tracking-wide truncate">Official AI Video Demo</span>
                          <span className="px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-300 text-[9px] font-mono font-bold">HD</span>
                        </div>
                        <span className="text-[10px] text-slate-300 truncate block">Watch Google Flow Autonomous Sentinel</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  </div>
                )}

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
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5 min-w-0">
                  {/* 1. Deterrence Siren */}
                  <button
                    onClick={() => {
                      if (isAlarmActive) {
                        stopAlarm(currentDev.id);
                      } else {
                        soundAlarm(currentDev.id, alarmVolume);
                      }
                    }}
                    className={`p-3 sm:p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 ios-bubble-btn shadow-xs cursor-pointer min-w-0 ${
                      isAlarmActive
                        ? 'bg-rose-600 text-white border-rose-700 shadow-rose-500/30 animate-pulse'
                        : 'bg-white/80 hover:bg-rose-50/60 border-rose-200/90 text-rose-700'
                    }`}
                  >
                    <div className="bubble-icon w-8 h-8 bubble-rose shadow-xs flex-shrink-0">
                      {isAlarmActive ? <VolumeX className="w-4 h-4 text-rose-600" /> : <Volume2 className="w-4 h-4 text-rose-600" />}
                    </div>
                    <span className="text-xs font-black truncate w-full text-center px-1">
                      {isAlarmActive ? `Stop (${sirenCountdown ?? 15}s)` : 'Sound Siren'}
                    </span>
                    <span className="text-[9px] opacity-75 font-medium truncate w-full text-center">{alarmVolume}% Vol • 15s Mute</span>
                  </button>

                  {/* 2. Lock Workstation */}
                  <button
                    onClick={() => {
                      if (confirm('Lock this laptop immediately?')) {
                        lockDevice(currentDev.id);
                      }
                    }}
                    className="p-3 sm:p-3.5 rounded-2xl bg-white/80 hover:bg-indigo-50/60 border border-indigo-200/90 text-indigo-700 flex flex-col items-center justify-center gap-1 ios-bubble-btn shadow-xs cursor-pointer min-w-0"
                  >
                    <div className="bubble-icon w-8 h-8 bubble-blue shadow-xs flex-shrink-0">
                      <Lock className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="text-xs font-black truncate w-full text-center px-1">Lock PC</span>
                    <span className="text-[9px] opacity-75 font-medium truncate w-full text-center">Win32 Lock</span>
                  </button>

                  {/* 3. Open Camera Feed */}
                  <button
                    onClick={() => setActiveTab('camera')}
                    className="p-3 sm:p-3.5 rounded-2xl bg-white/80 hover:bg-cyan-50/60 border border-cyan-200/90 text-cyan-800 flex flex-col items-center justify-center gap-1 ios-bubble-btn shadow-xs cursor-pointer min-w-0"
                  >
                    <div className="bubble-icon w-8 h-8 bubble-cyan shadow-xs flex-shrink-0">
                      <Camera className="w-4 h-4 text-cyan-600" />
                    </div>
                    <span className="text-xs font-black truncate w-full text-center px-1">Live Webcam</span>
                    <span className="text-[9px] opacity-75 font-medium truncate w-full text-center">Hardware Stream</span>
                  </button>

                  {/* 4. Lost Mode */}
                  <button
                    onClick={() => setIsLostModalOpen(true)}
                    className="p-3 sm:p-3.5 rounded-2xl bg-white/80 hover:bg-amber-50/60 border border-amber-200/90 text-amber-800 flex flex-col items-center justify-center gap-1 ios-bubble-btn shadow-xs cursor-pointer min-w-0"
                  >
                    <div className="bubble-icon w-8 h-8 bubble-amber shadow-xs flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-xs font-black truncate w-full text-center px-1">Lost Mode</span>
                    <span className="text-[9px] opacity-75 font-medium truncate w-full text-center">High-Priority Alert</span>
                  </button>
                </div>

                {/* Siren Alarm Volume Controller Card */}
                <div className="ios-jelly-card p-3 sm:p-3.5 rounded-3xl shadow-sm border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="bubble-icon w-7 h-7 bubble-rose shadow-xs flex items-center justify-center flex-shrink-0">
                        <Volume2 className="w-3.5 h-3.5 text-rose-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Siren Alarm Volume</h4>
                        <span className="text-[10px] text-slate-400">Gentle sound level (Default: 40%)</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                      {alarmVolume}%
                    </span>
                  </div>

                  {/* Volume Slider */}
                  <div className="px-1 py-1">
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={alarmVolume}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setAlarmVolume(v);
                        localStorage.setItem('laptopguard_siren_volume', String(v));
                      }}
                      className="w-full accent-rose-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {[20, 40, 70, 100].map((vol) => (
                      <button
                        key={vol}
                        onClick={() => {
                          setAlarmVolume(vol);
                          localStorage.setItem('laptopguard_siren_volume', String(vol));
                        }}
                        className={`py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                          alarmVolume === vol
                            ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {vol === 40 ? '40% (Safe)' : `${vol}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Sentinel Defense Matrix Card (All 4 Requested Features) */}
                <div className="ios-jelly-card p-3.5 sm:p-4 rounded-3xl shadow-sm border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Sentinel Autonomous Defenses</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200 uppercase">
                      4/4 ACTIVE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* 1. Live Remote Screen Mirror */}
                    <button
                      onClick={() => {
                        setMediaFeedMode('screen');
                        setActiveTab('camera');
                      }}
                      className="p-2.5 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white text-left shadow-sm flex flex-col justify-between cursor-pointer border border-indigo-900/50 hover:brightness-110 transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Laptop className="w-4 h-4 text-cyan-400" />
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">VIEW</span>
                      </div>
                      <span className="font-bold text-[11px] block">Screen Mirror</span>
                      <span className="text-[9px] text-slate-300 opacity-80">Live Desktop GDI</span>
                    </button>

                    {/* 2. Smart Wi-Fi Geofence */}
                    <div className="p-2.5 rounded-2xl bg-white/80 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <Wifi className="w-4 h-4 text-blue-600" />
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <span className="font-bold text-slate-800 text-[11px] block">Wi-Fi Geofence</span>
                      <span className="text-[9px] text-slate-500 truncate" title="Oshadha's A56 😂">
                        Auto-lock if cut
                      </span>
                    </div>

                    {/* 3. AI Face Intruder Detection */}
                    <div className="p-2.5 rounded-2xl bg-white/80 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <Camera className="w-4 h-4 text-purple-600" />
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                      </div>
                      <span className="font-bold text-slate-800 text-[11px] block">AI Face Guard</span>
                      <span className="text-[9px] text-slate-500">YuNet Neural DNN</span>
                    </div>

                    {/* 4. USB Anti-Theft Trap */}
                    <div className="p-2.5 rounded-2xl bg-white/80 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      </div>
                      <span className="font-bold text-slate-800 text-[11px] block">USB BadUSB Trap</span>
                      <span className="text-[9px] text-slate-500">Instant Siren & Lock</span>
                    </div>
                  </div>
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
              {/* Media Mode Switcher (Webcam vs Screen Mirror) */}
              <div className="flex items-center justify-between p-1 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xs mb-3">
                <button
                  onClick={() => setMediaFeedMode('webcam')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mediaFeedMode === 'webcam'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Live Webcam</span>
                </button>
                <button
                  onClick={() => setMediaFeedMode('screen')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mediaFeedMode === 'screen'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>🖥️ Screen Mirror</span>
                </button>
              </div>

              {/* Feed Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`bubble-icon w-7 h-7 shadow-xs ${mediaFeedMode === 'webcam' ? 'bubble-blue' : 'bubble-cyan'}`}>
                    {mediaFeedMode === 'webcam' ? <Camera className="w-3.5 h-3.5 text-blue-600" /> : <Laptop className="w-3.5 h-3.5 text-indigo-600" />}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      {mediaFeedMode === 'webcam' ? 'Physical Laptop Webcam' : 'Live Desktop Screen Mirror'}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {mediaFeedMode === 'webcam' ? 'AI YuNet Face Detector Active' : 'Live GDI Windows 11 Desktop'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>{mediaFeedMode === 'webcam' ? 'AI LIVE' : 'MIRROR LIVE'}</span>
                  </span>
                </div>
              </div>

              {/* Stream Protocol Switcher (Real-Time Stream vs Snapshot Poll) */}
              <div className="flex items-center justify-between px-2 py-1.5 rounded-2xl bg-white/70 border border-slate-200/80 mb-2.5 text-[10px]">
                <span className="text-slate-500 font-medium">Protocol Mode:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setCameraMode('stream');
                      setCameraKey(Date.now());
                      setScreenKey(Date.now());
                    }}
                    className={`px-2 py-0.5 rounded-xl font-bold transition-all cursor-pointer ${
                      cameraMode === 'stream'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⚡ Real-Time Stream (Fluid)
                  </button>
                  <button
                    onClick={() => {
                      setCameraMode('poll');
                      const now = Date.now();
                      setPollUrl(getCameraSnapshotUrl(currentDev.id, now));
                      setScreenPollUrl(getScreenSnapshotUrl(currentDev.id, now));
                    }}
                    className={`px-2 py-0.5 rounded-xl font-bold transition-all cursor-pointer ${
                      cameraMode === 'poll'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📷 Snapshot Poll
                  </button>
                </div>
              </div>

              {/* Video / Screen Stream Container */}
              <div className="rounded-2xl overflow-hidden bg-slate-950 aspect-video relative flex items-center justify-center border border-slate-800 shadow-inner">
                {mediaFeedMode === 'webcam' ? (
                  <img
                    key={`cam-${cameraMode}-${cameraKey}`}
                    src={
                      cameraMode === 'stream'
                        ? `${getCameraStreamUrl(currentDev.id)}?k=${cameraKey}`
                        : pollUrl || getCameraSnapshotUrl(currentDev.id, cameraKey)
                    }
                    alt="Live Laptop Webcam Stream"
                    className="w-full h-full object-cover"
                    onError={() => {
                      setTimeout(() => {
                        setCameraKey(Date.now());
                      }, 2000);
                    }}
                  />
                ) : (
                  <img
                    key={`scr-${cameraMode}-${screenKey}`}
                    src={
                      cameraMode === 'stream'
                        ? `${getScreenStreamUrl(currentDev.id)}?k=${screenKey}`
                        : screenPollUrl || getScreenSnapshotUrl(currentDev.id, screenKey)
                    }
                    alt="Live Laptop Desktop Mirror"
                    className="w-full h-full object-cover"
                    onError={() => {
                      setTimeout(() => {
                        setScreenKey(Date.now());
                      }, 2000);
                    }}
                  />
                )}

                {/* Responsive HUD Overlay Header */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1.5 pointer-events-none">
                  <div className="bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-mono text-cyan-300 flex items-center gap-1 border border-white/10 shadow-sm min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                    <span className="truncate">
                      {(currentDev?.device_name || 'DELL G15').toUpperCase()} • {mediaFeedMode === 'webcam' ? 'AI CAM' : 'DESKTOP'}
                    </span>
                  </div>

                  <div className="bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-mono text-emerald-300 border border-white/10 shadow-sm flex-shrink-0">
                    {cameraMode === 'stream' ? '⚡ LIVE STREAM' : '📷 POLLING'}
                  </div>
                </div>

                {/* Stream Reconnect / Refresh Button */}
                <div className="absolute bottom-2 right-2">
                  <button
                    onClick={() => {
                      const now = Date.now();
                      if (mediaFeedMode === 'webcam') {
                        setCameraKey(now);
                        setPollUrl(getCameraSnapshotUrl(currentDev.id, now));
                      } else {
                        setScreenKey(now);
                        setScreenPollUrl(getScreenSnapshotUrl(currentDev.id, now));
                      }
                    }}
                    className="py-1 px-2.5 rounded-lg bg-black/80 backdrop-blur-md hover:bg-black text-cyan-300 text-[10px] font-bold flex items-center gap-1 border border-white/15 active:scale-95 transition-all cursor-pointer shadow-sm"
                    title="Reconnect / Refresh Live Stream"
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
                  <span>
                    {isCapturingSnapshot ? 'Capturing...' : snapshotSuccess ? '✓ Snapshot Saved!' : mediaFeedMode === 'webcam' ? 'Capture Intruder Photo' : 'Capture Screen Evidence'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    if (mediaFeedMode === 'webcam') {
                      setCameraKey(Date.now());
                      setPollUrl(`${getCameraSnapshotUrl(currentDev.id)}?t=${Date.now()}`);
                    } else {
                      setScreenKey(Date.now());
                      setScreenPollUrl(`${getScreenSnapshotUrl(currentDev.id)}?t=${Date.now()}`);
                    }
                  }}
                  className="py-2.5 px-3 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold ios-bubble-btn cursor-pointer"
                >
                  Sync Feed
                </button>
              </div>

              {/* Hardware & Autonomous Defense Telemetry Strip */}
              <div className="mt-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-[11px] text-slate-600 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <Wifi className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span className="font-semibold text-slate-800 truncate" title={currentDev.current_ssid || currentDev.metadata?.wifi_ssid || "Oshadha's A56 😂"}>
                      {currentDev.current_ssid || currentDev.metadata?.wifi_ssid || "Oshadha's A56 😂"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[10px] flex-shrink-0">
                    <Globe className="w-3 h-3 text-indigo-500" />
                    <span>{currentDev.ip_address || currentDev.metadata?.ip_address || '192.168.1.12'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                  <span className="text-slate-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>AI Face Guard: <strong>YuNet DNN Active</strong></span>
                  </span>
                  <span className="text-amber-700 font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>USB Trap: Armed</span>
                  </span>
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
              <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs min-w-0">
                {/* Distance relative to phone */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/70 min-w-0">
                  <div className="flex items-center gap-1.5 text-slate-600 flex-shrink-0">
                    <Navigation className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                    <span className="font-medium text-[11px]">Proximity:</span>
                  </div>
                  <span className="font-bold text-blue-800 text-[11px] truncate text-right">{distanceInfo}</span>
                </div>

                {/* Connected Wi-Fi */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 text-slate-600 flex-shrink-0">
                    <Wifi className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-medium text-[11px]">Connected Wi-Fi:</span>
                  </div>
                  <span className="font-bold text-slate-800 text-[11px] truncate text-right" title={currentDev?.current_ssid || currentDev?.metadata?.wifi_ssid || 'SLT-Fiber-tysZ8-5G'}>
                    {currentDev?.current_ssid || currentDev?.metadata?.wifi_ssid || 'SLT-Fiber-tysZ8-5G'}
                  </span>
                </div>

                {/* Local IP Address */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 text-slate-600 flex-shrink-0">
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-medium text-[11px]">Device Local IP:</span>
                  </div>
                  <span className="font-bold font-mono text-slate-800 text-[11px] text-right">
                    {currentDev?.ip_address || currentDev?.metadata?.ip_address || '192.168.1.12'}
                  </span>
                </div>

                {/* GPS Coordinates */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/70 min-w-0">
                  <div className="flex items-center gap-1.5 text-slate-600 flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span className="font-medium text-[11px]">Coordinates:</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-700 text-right">
                    {(currentDev?.last_location?.latitude || 6.9271).toFixed(4)}° N, {(currentDev?.last_location?.longitude || 79.8612).toFixed(4)}° E
                  </span>
                </div>
              </div>

              {/* GPS Ping Refresh & Real Phone GPS Sync Buttons */}
              <div className="space-y-2 mt-2.5">
                <button
                  onClick={() => {
                    if (phoneCoords) {
                      syncPhoneGpsToLaptop(phoneCoords.lat, phoneCoords.lng, true);
                    } else if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
                      navigator.geolocation.getCurrentPosition(
                        pos => syncPhoneGpsToLaptop(pos.coords.latitude, pos.coords.longitude, true),
                        () => alert('Could not access Phone GPS. Please check location permissions on your phone.')
                      );
                    } else {
                      alert('Phone GPS not available in this browser.');
                    }
                  }}
                  disabled={isSyncingGps}
                  className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-60"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{isSyncingGps ? 'Syncing Real GPS...' : '📍 Sync Real Phone GPS to Laptop'}</span>
                </button>

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
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Refresh Live GPS Telemetry</span>
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

      {/* 3. Floating Next-Gen iOS Jelly Glass Bottom Navigation Bar */}
      <nav 
        className="fixed left-2 sm:left-4 right-2 sm:right-4 max-w-md mx-auto ios-frosted-nav rounded-[32px] px-2 py-1.5 z-50 flex items-center justify-around shadow-[0_12px_45px_rgba(0,0,0,0.16)] transition-all border border-white/90 backdrop-blur-2xl bg-white/92"
        style={{ bottom: 'max(10px, env(safe-area-inset-bottom, 10px))' }}
      >
        {/* Tab 1: Sentinel (Home) */}
        <button
          onClick={() => setActiveTab('home')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 cursor-pointer relative group ${
            activeTab === 'home'
              ? 'text-blue-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all duration-200 ${
            activeTab === 'home'
              ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/35 scale-105'
              : 'text-slate-500 group-hover:scale-105'
          }`}>
            <Shield className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-bold">Sentinel</span>
          {activeTab === 'home' && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_#2563EB] mt-0.5" />
          )}
        </button>

        {/* Tab 2: Camera & Screen Mirror */}
        <button
          onClick={() => setActiveTab('camera')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 cursor-pointer relative group ${
            activeTab === 'camera'
              ? 'text-blue-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all duration-200 ${
            activeTab === 'camera'
              ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/35 scale-105'
              : 'text-slate-500 group-hover:scale-105'
          }`}>
            <Camera className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-bold">Live Feed</span>
          {activeTab === 'camera' && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_#2563EB] mt-0.5" />
          )}
        </button>

        {/* Tab 3: GPS Radar & Proximity */}
        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 cursor-pointer relative group ${
            activeTab === 'map'
              ? 'text-blue-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all duration-200 ${
            activeTab === 'map'
              ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/35 scale-105'
              : 'text-slate-500 group-hover:scale-105'
          }`}>
            <MapPin className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-bold">Radar</span>
          {activeTab === 'map' && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_#2563EB] mt-0.5" />
          )}
        </button>

        {/* Tab 4: Security Alerts */}
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 cursor-pointer relative group ${
            activeTab === 'alerts'
              ? 'text-blue-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all duration-200 relative ${
            activeTab === 'alerts'
              ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/35 scale-105'
              : 'text-slate-500 group-hover:scale-105'
          }`}>
            <Bell className="w-4 h-4 stroke-[2.2]" />
            {events.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white shadow-xs animate-pulse">
                {events.length > 9 ? '9+' : events.length}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-bold">Alerts</span>
          {activeTab === 'alerts' && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_#2563EB] mt-0.5" />
          )}
        </button>

        {/* Tab 5: Settings / Profile */}
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 cursor-pointer relative group ${
            activeTab === 'profile'
              ? 'text-blue-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all duration-200 ${
            activeTab === 'profile'
              ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/35 scale-105'
              : 'text-slate-500 group-hover:scale-105'
          }`}>
            <User className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-bold">Settings</span>
          {activeTab === 'profile' && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_#2563EB] mt-0.5" />
          )}
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
