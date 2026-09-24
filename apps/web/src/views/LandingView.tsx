import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Volume2,
  VolumeX,
  Lock,
  Camera,
  MapPin,
  Smartphone,
  Download,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  Laptop,
  ArrowRight,
  Radio,
  Eye,
  Activity,
  Sparkles,
  Layers,
  Cpu,
  Play
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { getDownloadUrl } from '../services/api';
import { BrandLogo } from '../components/BrandLogo';

interface LandingViewProps {
  onLaunchConsole: () => void;
  onOpenMobileView: () => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onOpenIntro?: () => void;
  onLockMasterAccess?: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onLaunchConsole,
  onOpenMobileView,
  onOpenAuth,
  onLogout,
  onOpenIntro,
  onLockMasterAccess
}) => {
  const { user, isAuthenticated, logoutUser, selectedDevice, isAlarmActive } = useSecurity();

  // Interactive Live Simulator in the Hero Card
  const [simAcConnected, setSimAcConnected] = useState<boolean>(true);
  const [simAlarmActive, setSimAlarmActive] = useState<boolean>(false);
  const [simCountdown, setSimCountdown] = useState<number>(15);

  const toggleSimAc = () => {
    if (simAcConnected) {
      // Disconnect AC -> instant 500ms watchdog trigger
      setSimAcConnected(false);
      setSimAlarmActive(true);
      setSimCountdown(15);
    } else {
      // Reconnect AC -> disarmed/restored
      setSimAcConnected(true);
      setSimAlarmActive(false);
    }
  };

  useEffect(() => {
    let timer: any;
    if (simAlarmActive) {
      timer = setInterval(() => {
        setSimCountdown((prev) => {
          if (prev <= 1) {
            setSimAlarmActive(false);
            clearInterval(timer);
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [simAlarmActive]);

  const handleDownloadSetup = () => {
    window.location.href = getDownloadUrl('windows-setup');
  };

  const handleDownloadExe = () => {
    window.location.href = getDownloadUrl('windows-exe');
  };

  const handleDownloadWindows = () => {
    window.location.href = getDownloadUrl('windows-agent');
  };

  const handleDownloadAndroid = () => {
    window.location.href = getDownloadUrl('android-apk');
  };

  return (
    <div className="min-h-screen bg-[#F0F4FA] text-slate-800 relative selection:bg-blue-600 selection:text-white font-sans overflow-x-hidden">
      {/* Soft Ambient Liquid Glow Mesh with Live Gentle Floating Animation */}
      <div className="ambient-liquid-glow pointer-events-none">
        <div className="ambient-blob-1" />
        <div className="ambient-blob-2" />
        <div className="ambient-blob-3" />
      </div>

      {/* Top Floating iOS Frosted Glass Navigation Bar */}
      <header className="sticky top-3 sm:top-4 z-50 w-full px-3 sm:px-6 lg:px-8 max-w-[1920px] mx-auto">
        <div className="h-16 sm:h-18 px-4 sm:px-7 ios-jelly-card flex items-center justify-between shadow-sm">
          {/* Brand Logo */}
          <BrandLogo
            size="md"
            subtitle="Sovereign Hardware Protection"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Core Sentinel</a>
            <a href="#simulator" className="hover:text-blue-600 transition-colors">Live Simulation</a>
            <a href="#mobile-app" className="hover:text-blue-600 transition-colors">Mobile Remote</a>
            <a href="#downloads" className="hover:text-blue-600 transition-colors">Downloads & APK</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-white/70 border border-slate-200/80 text-xs shadow-xs">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                    {user.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'ME'}
                  </div>
                  <span className="font-bold text-slate-800 hidden sm:inline max-w-[100px] truncate">
                    {user.full_name || user.email}
                  </span>
                </div>
                <button
                  onClick={onLogout || logoutUser}
                  className="ios-bubble-btn py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-2xl bg-white/80 hover:bg-rose-50 text-rose-600 text-xs font-bold border border-slate-200/80 hover:border-rose-200 shadow-xs cursor-pointer transition-all"
                  title="Sign Out"
                >
                  <span className="hidden sm:inline">Sign Out</span>
                  <span className="sm:hidden">Exit</span>
                </button>
              </div>
            ) : (
              onOpenAuth && (
                <button
                  onClick={onOpenAuth}
                  className="ios-bubble-btn hidden sm:flex items-center gap-1.5 py-2 px-3.5 rounded-2xl bg-white/80 hover:bg-white text-blue-600 hover:text-blue-700 text-xs font-bold border border-blue-200/80 shadow-xs cursor-pointer"
                >
                  <span>Sign In</span>
                </button>
              )
            )}

            {onLockMasterAccess && (
              <button
                onClick={onLockMasterAccess}
                className="ios-bubble-btn p-2 sm:py-2.5 sm:px-3 rounded-2xl bg-rose-50/80 hover:bg-rose-100 text-rose-600 border border-rose-200/80 shadow-xs cursor-pointer flex items-center gap-1.5"
                title="Lock Master Access (PIN Required)"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-xs font-bold">Lock Access</span>
              </button>
            )}

            <button
              onClick={onOpenMobileView}
              className="ios-bubble-btn flex items-center gap-1.5 py-2 sm:py-2.5 px-3 sm:px-4 rounded-2xl bg-white/80 hover:bg-white text-slate-700 text-xs font-bold border border-slate-200/80 shadow-xs cursor-pointer"
              title="Open Mobile Phone View"
            >
              <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
              <span className="hidden xs:inline sm:inline">Mobile Phone</span>
            </button>

            <button
              onClick={onLaunchConsole}
              className="ios-bubble-btn sheen-glow flex items-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-3.5 sm:px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 cursor-pointer"
            >
              <span>{isAuthenticated ? 'Console' : 'Dashboard'}</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-8 sm:pt-12 pb-16 sm:pb-24 px-3 sm:px-6 lg:px-8 max-w-[1920px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Headline, Highlights & Actions */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Live Sentinel Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-blue-200/80 text-blue-600 text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sovereign Anti-Theft Sentinel v1.5.0 Active</span>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">• 500ms Watchdog</span>
            </div>

            {/* Hero Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
              Protect Your Laptop.{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                Wherever You Go.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base lg:text-lg text-slate-600 font-normal leading-relaxed max-w-2xl">
              Turn your Windows laptop into an intelligent anti-theft sentinel. Instant <strong>500ms AC charger disconnect watchdog</strong>, 15-second smart auto-silence siren, authorized live webcam verification, and real-time remote lock from any smartphone.
            </p>

            {/* Quick Action Jelly Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onLaunchConsole}
                className="ios-bubble-btn sheen-glow flex items-center gap-2 py-3 sm:py-3.5 px-5 sm:px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white text-xs sm:text-sm font-extrabold shadow-xl shadow-blue-500/25 cursor-pointer"
              >
                <span>{isAuthenticated ? 'Open Sentinel Dashboard' : 'Launch Dashboard'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleDownloadSetup}
                className="ios-bubble-btn flex items-center gap-2 py-3 sm:py-3.5 px-4 sm:px-5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-bold border border-slate-200/90 shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Windows Setup (.exe)</span>
              </button>

              <button
                onClick={handleDownloadAndroid}
                className="ios-bubble-btn flex items-center gap-2 py-3 sm:py-3.5 px-4 sm:px-5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-bold border border-emerald-200 shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Android App (.apk)</span>
              </button>

              {onOpenIntro && (
                <button
                  onClick={onOpenIntro}
                  className="ios-bubble-btn flex items-center gap-1.5 py-3 sm:py-3.5 px-4 rounded-2xl bg-cyan-50/80 hover:bg-cyan-100 text-cyan-800 text-xs sm:text-sm font-bold border border-cyan-200 shadow-xs cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-cyan-600 fill-cyan-600" />
                  <span>Watch Intro</span>
                </button>
              )}
            </div>

            {/* Hardware Trust Badges */}
            <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/40 border border-slate-200/50">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>500ms Hardware Watchdog</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/40 border border-slate-200/50">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>15s Smart Auto-Silence</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/40 border border-slate-200/50">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Non-Covert Privacy LED</span>
              </div>
            </div>

          </div>

          {/* Right Column: Next-Gen Translucent 3D Sentinel Card & Live Simulation */}
          <div id="simulator" className="lg:col-span-5 relative">
            <div className={`ios-jelly-card p-6 sm:p-7 rounded-[32px] sm:rounded-[36px] shadow-2xl relative overflow-hidden transition-all duration-300 ${
              simAlarmActive ? 'ring-2 ring-rose-500 shadow-rose-500/20' : ''
            }`}>
              
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="text-[11px] sm:text-xs font-bold text-slate-500 font-mono ml-1.5 truncate">
                    Dell G15 Sentinel • Sri Lanka
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 border ${
                  simAlarmActive
                    ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${simAlarmActive ? 'bg-rose-500' : 'bg-emerald-500 animate-ping'}`} />
                  <span>{simAlarmActive ? `SIREN ACTIVE (${simCountdown}s)` : '100% ARMED'}</span>
                </span>
              </div>

              {/* Center 3D Laptop Visual with Screen Glow */}
              <div className="my-5 relative flex flex-col items-center">
                {/* Ambient glow behind laptop */}
                <div className={`absolute inset-0 rounded-full filter blur-2xl transition-all duration-500 -z-10 ${
                  simAlarmActive ? 'bg-rose-500/30' : 'bg-cyan-400/20'
                }`} />

                <div className="w-60 sm:w-68 h-40 sm:h-44 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-3 flex flex-col justify-between border border-slate-700 shadow-2xl relative transition-all">
                  
                  {/* Laptop Screen Display */}
                  <div className={`w-full h-28 sm:h-32 rounded-xl p-1 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-inner transition-colors duration-300 ${
                    simAlarmActive
                      ? 'bg-gradient-to-br from-rose-600 via-red-500 to-amber-600 animate-pulse'
                      : 'bg-gradient-to-br from-blue-600 via-cyan-500 to-indigo-700'
                  }`}>
                    <div className="w-full h-full bg-slate-950/80 rounded-lg p-2 flex flex-col items-center justify-center text-white">
                      {simAlarmActive ? (
                        <>
                          <Volume2 className="w-8 h-8 text-rose-400 mb-1 animate-bounce" />
                          <span className="text-[11px] font-black text-rose-300 tracking-wider">
                            AC POWER SEVERED!
                          </span>
                          <span className="text-[9px] text-amber-300 font-mono mt-0.5">
                            500ms Watchdog Triggered Siren
                          </span>
                        </>
                      ) : (
                        <>
                          <Shield className="w-7 h-7 text-cyan-300 mb-1 animate-pulse" />
                          <span className="text-[11px] font-extrabold tracking-wide">
                            LAPTOPGUARD AI SENTINEL
                          </span>
                          <span className="text-[9px] text-cyan-200 font-mono mt-0.5">
                            AC WATCHDOG: 500MS POLL
                          </span>
                        </>
                      )}
                    </div>
                    
                    {/* Corner hardware ping beacon */}
                    <div className={`absolute top-1.5 right-2 w-2 h-2 rounded-full ${
                      simAlarmActive ? 'bg-rose-400 animate-ping' : 'bg-emerald-400 animate-ping'
                    }`} />
                  </div>

                  {/* Laptop Keyboard Base & Trackpad */}
                  <div className="w-full h-3 rounded bg-slate-700 flex items-center justify-center">
                    <div className="w-12 h-0.5 rounded bg-slate-500" />
                  </div>
                </div>

                {/* Interactive Simulation Switch Button */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={toggleSimAc}
                    className={`ios-bubble-btn px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-2 border shadow-sm transition-all cursor-pointer ${
                      simAcConnected
                        ? 'bg-white hover:bg-rose-50 text-rose-600 border-rose-200'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-emerald-500/25'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{simAcConnected ? 'Simulate Unplugging Charger' : 'Restore AC Charger (Plug in)'}</span>
                  </button>
                  {simAlarmActive && (
                    <button
                      onClick={() => setSimAlarmActive(false)}
                      className="ios-bubble-btn px-3 py-2 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                      <span>Mute</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Live Telemetry Bubble Chips */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-white/75 border border-slate-200/80 shadow-xs">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Battery & AC Power</span>
                  <span className={`font-extrabold text-xs sm:text-sm flex items-center gap-1 mt-0.5 ${
                    simAcConnected ? 'text-slate-900' : 'text-rose-600'
                  }`}>
                    {simAcConnected ? '99% (AC Plugged)' : '99% (UNPLUGGED!)'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/75 border border-slate-200/80 shadow-xs">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">GPS Radar Triangulation</span>
                  <span className="text-slate-900 font-extrabold text-xs sm:text-sm block mt-0.5 truncate">
                    Colombo, Sri Lanka
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/75 border border-slate-200/80 shadow-xs">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Siren Deterrent</span>
                  <span className={`font-extrabold text-xs sm:text-sm block mt-0.5 ${
                    simAlarmActive ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {simAlarmActive ? `Ringing (${simCountdown}s)` : 'Standby (15s Auto-Mute)'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/75 border border-slate-200/80 shadow-xs">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Encrypted Tunnel</span>
                  <span className="text-blue-600 font-extrabold text-xs sm:text-sm font-mono block mt-0.5">
                    WSS Live (60s Nonce)
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Core Hardware Sentinel Features */}
      <section id="features" className="py-14 sm:py-20 px-3 sm:px-6 lg:px-8 max-w-[1920px] mx-auto border-t border-slate-200/60">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <span className="jelly-pill px-3 py-1 text-xs font-bold text-blue-600 bg-blue-50/90 border border-blue-200 shadow-xs">
            Hardware Sovereign Defense
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Engineered Specifically for Real Windows Laptops
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            No simulated mock data. LaptopGuard AI interacts directly with native Win32 hardware APIs, power status registers, and your physical webcam.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {/* Feature 1 */}
          <div className="ios-jelly-card p-6 rounded-3xl space-y-3.5 hover:shadow-lg transition-all">
            <div className="bubble-icon w-12 h-12 bubble-amber shadow-xs">
              <Zap className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">500ms AC Charger Watchdog</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If someone unplugs your laptop charger at a library, café, or office while armed, the sentinel detects the drop in power within 500 milliseconds and instantly triggers the siren and mobile alert.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="ios-jelly-card p-6 rounded-3xl space-y-3.5 hover:shadow-lg transition-all">
            <div className="bubble-icon w-12 h-12 bubble-rose shadow-xs">
              <Volume2 className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">15s Smart Auto-Silence Siren</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automatically unmutes and boosts your Windows speaker volume to 100% to draw public attention. Built with a smart 15-second auto-timeout so it never sounds endlessly, plus instant 1-touch mute.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="ios-jelly-card p-6 rounded-3xl space-y-3.5 hover:shadow-lg transition-all">
            <div className="bubble-icon w-12 h-12 bubble-blue shadow-xs">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Remote Workstation Lock</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Transmit a cryptographically signed instruction over WebSocket to immediately lock the Windows OS via native <code className="text-blue-600 font-mono font-bold">user32.LockWorkStation</code>.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="ios-jelly-card p-6 rounded-3xl space-y-3.5 hover:shadow-lg transition-all">
            <div className="bubble-icon w-12 h-12 bubble-cyan shadow-xs">
              <Camera className="w-6 h-6 text-cyan-600" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Non-Covert Physical Webcam Stream</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Live authorized video feed direct from your laptop's webcam. Privacy compliant: the hardware LED remains illuminated and sessions are limited to authorized owner requests.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="ios-jelly-card p-6 rounded-3xl space-y-3.5 hover:shadow-lg transition-all">
            <div className="bubble-icon w-12 h-12 bubble-mint shadow-xs">
              <MapPin className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">OpenStreetMap Geolocation Radar</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Continuous Wi-Fi BSSID triangulation and IP mapping displayed on clean CartoDB Voyager pastel light tiles, centered accurately on your real location in Sri Lanka.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="ios-jelly-card p-6 rounded-3xl space-y-3.5 hover:shadow-lg transition-all">
            <div className="bubble-icon w-12 h-12 bubble-violet shadow-xs">
              <Smartphone className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Mobile Phone Remote with OTA Updates</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Control your laptop from your Android phone or mobile browser. Over-The-Air (OTA) architecture ensures your mobile companion updates automatically whenever new backend features release.
            </p>
          </div>
        </div>
      </section>

      {/* Mobile Phone Remote & Over-The-Air Auto-Update Showcase */}
      <section id="mobile-app" className="py-14 sm:py-20 px-3 sm:px-6 lg:px-8 max-w-[1920px] mx-auto border-t border-slate-200/60">
        <div className="ios-jelly-card p-6 sm:p-10 lg:p-12 rounded-[32px] sm:rounded-[40px] grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-bold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span>Over-The-Air (OTA) Auto-Update Engine</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Control Your Laptop From Your Phone. Always Up-to-Date.
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Whether you are across the room or across the city, your phone acts as the command center for your laptop. Tap to arm before stepping away, mute sirens instantly, inspect live camera frames, or lock the machine.
            </p>

            <div className="space-y-2.5 text-xs font-semibold text-slate-700 pt-1">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">✓</div>
                <span><strong>Instant OTA Updates:</strong> Every time we deploy new security features, your mobile controller auto-refreshes seamlessly.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">✓</div>
                <span><strong>Installable Android APK & PWA:</strong> Download the standalone APK or install directly from your mobile browser in 1 click.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">✓</div>
                <span><strong>Real-Time WebSocket Push:</strong> Receives battery drops, AC unplug alerts, and camera snapshots in under a second.</span>
              </div>
            </div>

            <div className="pt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={onOpenMobileView}
                className="ios-bubble-btn py-3 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25 cursor-pointer"
              >
                Launch Mobile Controller Simulator
              </button>
              <button
                onClick={handleDownloadAndroid}
                className="ios-bubble-btn py-3 px-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 text-xs font-bold shadow-xs cursor-pointer"
              >
                Download Android APK (v1.5.0)
              </button>
            </div>
          </div>

          {/* Simulated Mobile Phone Visual */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-68 sm:w-76 rounded-[44px] bg-slate-950 p-3.5 border-[6px] border-slate-800 shadow-2xl relative">
              {/* Phone Speaker Notch */}
              <div className="w-20 h-3.5 bg-slate-800 rounded-full mx-auto mb-2.5" />

              {/* Phone Screen Display */}
              <div className="w-full rounded-[30px] bg-[#F0F4FA] p-3.5 text-slate-800 space-y-3 shadow-inner">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-400">Dell G15 5530</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">ARMED</span>
                </div>

                {/* Status card */}
                <div className="p-3 rounded-2xl bg-white shadow-xs border border-slate-200/80">
                  <div className="flex justify-between items-center text-xs font-extrabold text-slate-900">
                    <span>Power Sentinel</span>
                    <span className="text-emerald-600">AC Plugged</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Battery: 99% • Sri Lanka</p>
                </div>

                {/* Mobile action buttons */}
                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold">
                  <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs">
                    🔊 Sound Siren
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
                    🔒 Lock Windows
                  </div>
                  <div className="p-2.5 rounded-xl bg-cyan-600 text-white shadow-xs">
                    📷 Live Camera
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-500 text-white shadow-xs">
                    🚨 Lost Mode
                  </div>
                </div>

                {/* Auto update banner pill */}
                <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3 h-3 text-indigo-600" />
                  <span>OTA Auto-Update Active (v1.5.0)</span>
                </div>
              </div>

              {/* Bottom Home Indicator Bar */}
              <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto mt-2.5" />
            </div>
          </div>

        </div>
      </section>

      {/* Downloads Hub */}
      <section id="downloads" className="py-14 sm:py-20 px-3 sm:px-6 lg:px-8 max-w-[1920px] mx-auto border-t border-slate-200/60">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <span className="jelly-pill px-3 py-1 text-xs font-bold text-blue-600 bg-blue-50/90 border border-blue-200 shadow-xs">
            Installation & Access Hub
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Direct Downloads for Windows & Mobile
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            Download the official software packages directly from this server. Zero third-party trackers, zero covert telemetry.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
          {/* Card 1: Windows Desktop Agent */}
          <div className="ios-jelly-card p-6 sm:p-8 rounded-[32px] space-y-5 border border-slate-200/80 shadow-md">
            <div className="flex items-center justify-between">
              <div className="bubble-icon w-12 sm:w-14 h-12 sm:h-14 bubble-blue shadow-xs">
                <Laptop className="w-6 sm:w-7 h-6 sm:h-7 text-blue-600" />
              </div>
              <span className="jelly-pill px-3 py-1 text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                v1.5.0 Signed
              </span>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">Windows Hardware Agent</h3>
              <p className="text-xs text-slate-500 mt-0.5">For Windows 10 & Windows 11 (64-bit)</p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Installs the native Win32 background sentinel on your laptop. Enables 500ms AC power polling, volume boost, and emergency LockWorkStation integration.
            </p>

            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Package Size:</span>
                <span className="font-mono font-bold text-slate-800">79.7 MB Standalone .exe</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Desktop Shortcut:</span>
                <span className="font-semibold text-emerald-600">Auto-Created on Install</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDownloadSetup}
                className="ios-bubble-btn sheen-glow flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Install Setup.exe</span>
              </button>
              <button
                onClick={handleDownloadExe}
                className="ios-bubble-btn py-3 px-3.5 rounded-2xl bg-white/80 hover:bg-white border border-slate-200/90 text-slate-700 text-xs font-bold shadow-xs cursor-pointer"
                title="Download Standalone Portable .exe"
              >
                <span>.EXE</span>
              </button>
              <button
                onClick={handleDownloadWindows}
                className="ios-bubble-btn py-3 px-3.5 rounded-2xl bg-white/80 hover:bg-white border border-slate-200/90 text-slate-700 text-xs font-bold shadow-xs cursor-pointer"
                title="Download Portable .zip Package"
              >
                <span>.ZIP</span>
              </button>
            </div>
          </div>

          {/* Card 2: Android Mobile App APK */}
          <div className="ios-jelly-card p-6 sm:p-8 rounded-[32px] space-y-5 border border-slate-200/80 shadow-md">
            <div className="flex items-center justify-between">
              <div className="bubble-icon w-12 sm:w-14 h-12 sm:h-14 bubble-cyan shadow-xs">
                <Smartphone className="w-6 sm:w-7 h-6 sm:h-7 text-cyan-600" />
              </div>
              <span className="jelly-pill px-3 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                OTA Auto-Update
              </span>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">Android Mobile Companion</h3>
              <p className="text-xs text-slate-500 mt-0.5">Android 9.0+ & Progressive Web App</p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Remote command console for your smartphone. Features live webcam monitoring, one-touch siren silencing, and instant Over-The-Air auto-updating.
            </p>

            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Package Size:</span>
                <span className="font-mono font-bold text-slate-800">15.8 MB APK</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Auto-Update:</span>
                <span className="font-semibold text-emerald-600">Enabled (Over-The-Air)</span>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={handleDownloadAndroid}
                className="ios-bubble-btn sheen-glow flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Android APK</span>
              </button>
              <button
                onClick={onOpenMobileView}
                className="ios-bubble-btn py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                title="Open Phone Controller View"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto border-t border-slate-200/60 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" subtitle={false} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
          <span className="hidden md:inline text-slate-400">• Sovereign Hardware Anti-Theft & Surveillance Defense</span>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={onLaunchConsole} className="hover:text-blue-600 font-semibold cursor-pointer">
            Cloud Console
          </button>
          <button onClick={onOpenMobileView} className="hover:text-blue-600 font-semibold cursor-pointer">
            Phone Remote
          </button>
          <a href="#downloads" className="hover:text-blue-600 font-semibold">
            Downloads
          </a>
          <span className="font-mono text-[11px] text-slate-400">v1.5.0 Production Signed</span>
        </div>
      </footer>
    </div>
  );
};
