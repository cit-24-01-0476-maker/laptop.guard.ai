import React from 'react';
import {
  Shield,
  ShieldCheck,
  Zap,
  Volume2,
  Lock,
  Camera,
  MapPin,
  Smartphone,
  Download,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  QrCode,
  Laptop,
  ArrowRight,
  Eye,
  Sliders
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { getDownloadUrl } from '../services/api';

interface LandingViewProps {
  onLaunchConsole: () => void;
  onOpenMobileView: () => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onLaunchConsole,
  onOpenMobileView,
  onOpenAuth,
  onLogout
}) => {
  const { user, isAuthenticated, logoutUser, selectedDevice, isAlarmActive } = useSecurity();

  const handleDownloadExe = () => {
    window.open(getDownloadUrl('windows-exe'), '_blank');
  };

  const handleDownloadWindows = () => {
    window.open(getDownloadUrl('windows-agent'), '_blank');
  };

  const handleDownloadAndroid = () => {
    const url = getDownloadUrl('android-apk');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'LaptopGuard-AI.apk';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-[#F1F5FB] text-slate-800 relative selection:bg-blue-600 selection:text-white font-sans">
      {/* Soft Ambient Liquid Glow Mesh */}
      <div className="ambient-liquid-glow pointer-events-none">
        <div className="ambient-blob-1" />
        <div className="ambient-blob-2" />
        <div className="ambient-blob-3" />
      </div>

      {/* Top Floating Glass Navigation Bar */}
      <header className="sticky top-4 z-50 w-full px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto">
        <div className="h-18 px-5 sm:px-8 jelly-card flex items-center justify-between shadow-sm">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Shield className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-lg text-slate-900">
                LaptopGuard<span className="text-blue-600 font-mono text-sm ml-1 px-1.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200">AI</span>
              </span>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase font-medium hidden sm:block">
                Sovereign Hardware Protection
              </p>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Core Features</a>
            <a href="#hardware" className="hover:text-blue-600 transition-colors">Hardware Sentinel</a>
            <a href="#mobile-app" className="hover:text-blue-600 transition-colors">Mobile Controller</a>
            <a href="#downloads" className="hover:text-blue-600 transition-colors">Downloads & APK</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-xs">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold flex items-center justify-center text-[10px]">
                    {user.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'ME'}
                  </div>
                  <span className="font-bold text-slate-800 hidden sm:inline">{user.full_name || user.email}</span>
                </div>
                <button
                  onClick={onLogout || logoutUser}
                  className="jelly-button py-2 px-3 rounded-2xl bg-white/80 hover:bg-rose-50 text-rose-600 hover:text-rose-700 text-xs font-bold border border-slate-200/80 hover:border-rose-200 shadow-sm cursor-pointer transition-all"
                  title="Sign Out"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              onOpenAuth && (
                <button
                  onClick={onOpenAuth}
                  className="jelly-button flex items-center gap-1.5 py-2 px-3.5 rounded-2xl bg-white/80 hover:bg-white text-blue-600 hover:text-blue-700 text-xs font-bold border border-blue-200/80 shadow-sm cursor-pointer"
                >
                  <span>Sign In / Register</span>
                </button>
              )
            )}

            <button
              onClick={onOpenMobileView}
              className="jelly-button hidden sm:flex items-center gap-1.5 py-2.5 px-4 rounded-2xl bg-white/80 hover:bg-white text-slate-700 text-xs font-bold border border-slate-200/80 shadow-sm cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span>Mobile Phone View</span>
            </button>

            <button
              onClick={onLaunchConsole}
              className="jelly-button flex items-center gap-2 py-2.5 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
            >
              <span>{isAuthenticated ? 'Open Dashboard' : 'Launch Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Headline & Call To Actions */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-600 text-xs font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>Next-Generation Laptop Defense System v1.4.2</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Protect Your Laptop.{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                Wherever You Go.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-2xl">
              Turn your Windows laptop into an intelligent anti-theft sentinel. Instant <strong>500ms AC charger disconnect detection</strong>, 15-second smart auto-silence siren, authorized live webcam verification, and real-time remote lock from any smartphone.
            </p>

            {/* CTA Button Group */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onLaunchConsole}
                className="jelly-button flex items-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-xl shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
              >
                <span>{isAuthenticated ? 'Open Sentinel Dashboard' : 'Launch Cloud Dashboard (Sign In)'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <a
                href="#downloads"
                className="jelly-button flex items-center gap-2 py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 text-sm font-bold border border-slate-200/90 shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Download Apps & APK</span>
              </a>

              <button
                onClick={onOpenMobileView}
                className="jelly-button flex items-center gap-2 py-3.5 px-5 rounded-2xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-sm font-bold border border-cyan-200 shadow-sm cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-cyan-600" />
                <span>Open Phone Remote</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="pt-4 grid grid-cols-3 gap-4 text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>500ms Hardware Watchdog</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>15s Smart Auto-Silence</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Non-Covert Privacy LED</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Liquid Glass Laptop & Live Telemetry Mockup */}
          <div className="lg:col-span-5 relative">
            <div className="jelly-card p-7 sm:p-8 rounded-[36px] shadow-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="text-xs font-bold text-slate-400 font-mono ml-2">Dell G15 5530 • Sri Lanka Sentinel</span>
                </div>
                <span className="jelly-pill px-3 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ● 100% ARMED
                </span>
              </div>

              {/* Center 3D Laptop Visual */}
              <div className="my-6 relative flex flex-col items-center">
                <div className="w-64 h-44 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-3 flex flex-col justify-between border border-slate-700 shadow-2xl relative">
                  {/* Laptop Screen */}
                  <div className="w-full h-32 rounded-xl bg-gradient-to-br from-blue-600 via-cyan-500 to-indigo-700 p-1 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-inner">
                    <div className="w-full h-full bg-blue-950/70 rounded-lg p-2 flex flex-col items-center justify-center text-white">
                      <Shield className="w-7 h-7 text-cyan-300 mb-1 animate-pulse" />
                      <span className="text-[11px] font-extrabold tracking-wide">LAPTOPGUARD AI ACTIVE</span>
                      <span className="text-[9px] text-cyan-200 font-mono">AC WATCHDOG: 500MS POLL</span>
                    </div>
                    <div className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  {/* Keyboard Base */}
                  <div className="w-full h-3 rounded bg-slate-700 flex items-center justify-center">
                    <div className="w-12 h-0.5 rounded bg-slate-500" />
                  </div>
                </div>
              </div>

              {/* Live Telemetry Chips */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Battery & AC Power</span>
                  <span className="text-slate-900 font-extrabold text-sm">99% (AC Plugged)</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Current Radar</span>
                  <span className="text-slate-900 font-extrabold text-sm">Colombo, Sri Lanka</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Smart Alarm State</span>
                  <span className="text-emerald-600 font-extrabold text-sm">Standby (15s Auto-Mute)</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Encrypted Tunnel</span>
                  <span className="text-blue-600 font-extrabold text-sm font-mono">WSS Active (60s Nonce)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Hardware Sentinel Features */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto border-t border-slate-200/60">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <span className="jelly-pill px-3 py-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200">
            Real Hardware Defense
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Engineered Specifically for Real Windows Laptops
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            No simulated mock data. LaptopGuard AI interacts directly with native Win32 hardware APIs, power status registers, and your physical webcam.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="jelly-card p-6 rounded-3xl space-y-4 hover:shadow-lg transition-all">
            <div className="bubble-icon w-12 h-12 bubble-amber flex items-center justify-center shadow-sm">
              <Zap className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">500ms AC Charger Watchdog</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If someone unplugs your laptop charger at a library, café, or office while armed, the sentinel detects the drop in power within 500 milliseconds and instantly triggers the siren and mobile alert.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="jelly-card p-6 rounded-3xl space-y-4 hover:shadow-lg transition-all">
            <div className="bubble-icon w-12 h-12 bubble-rose flex items-center justify-center shadow-sm">
              <Volume2 className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">15s Smart Auto-Silence Siren</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automatically unmutes and boosts your Windows speaker volume to 100% to draw public attention. Built with a smart 15-second auto-timeout so it never sounds endlessly, plus instant 1-touch mute.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="jelly-card p-6 rounded-3xl space-y-4 hover:shadow-lg transition-all">
            <div className="bubble-icon w-12 h-12 bubble-blue flex items-center justify-center shadow-sm">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Remote Workstation Lock</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Transmit a cryptographically signed instruction over WebSocket to immediately lock the Windows OS via native <code className="text-blue-600 font-mono">user32.LockWorkStation</code>.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="jelly-card p-6 rounded-3xl space-y-4 hover:shadow-lg transition-all">
            <div className="bubble-icon w-12 h-12 bubble-cyan flex items-center justify-center shadow-sm">
              <Camera className="w-6 h-6 text-cyan-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Non-Covert Physical Webcam Stream</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Live authorized video feed direct from your laptop's webcam. Privacy compliant: the hardware LED remains illuminated and sessions are limited to authorized owner requests.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="jelly-card p-6 rounded-3xl space-y-4 hover:shadow-lg transition-all">
            <div className="bubble-icon w-12 h-12 bubble-mint flex items-center justify-center shadow-sm">
              <MapPin className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">OpenStreetMap Geolocation Radar</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Continuous Wi-Fi BSSID triangulation and IP mapping displayed on clean CartoDB Voyager pastel light tiles, centered accurately on your real location in Sri Lanka.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="jelly-card p-6 rounded-3xl space-y-4 hover:shadow-lg transition-all">
            <div className="bubble-icon w-12 h-12 bubble-violet flex items-center justify-center shadow-sm">
              <Smartphone className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Mobile Phone Remote with OTA Updates</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Control your laptop from your Android phone or mobile browser. Over-The-Air (OTA) architecture ensures your mobile companion updates automatically whenever new backend features release.
            </p>
          </div>
        </div>
      </section>

      {/* Mobile Phone Remote & Over-The-Air Auto-Update Showcase */}
      <section id="mobile-app" className="py-16 px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto border-t border-slate-200/60">
        <div className="jelly-card p-8 sm:p-12 rounded-[36px] grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-bold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span>Over-The-Air (OTA) Auto-Update Engine</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Control Your Laptop From Your Phone. Always Up-to-Date.
            </h2>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Whether you are across the room or across the city, your phone acts as the command center for your laptop. Tap to arm before stepping away, mute sirens instantly, inspect live camera frames, or lock the machine.
            </p>

            <div className="space-y-3 text-xs font-semibold text-slate-700 pt-2">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold">✓</div>
                <span><strong>Instant OTA Updates:</strong> Every time we deploy new security features, your mobile controller auto-refreshes seamlessly.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold">✓</div>
                <span><strong>Installable Android APK & PWA:</strong> Download the standalone APK or install directly from your mobile browser in 1 click.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold">✓</div>
                <span><strong>Real-Time WebSocket Push:</strong> Receives battery drops, AC unplug alerts, and camera snapshots in under a second.</span>
              </div>
            </div>

            <div className="pt-3 flex flex-wrap items-center gap-4">
              <button
                onClick={onOpenMobileView}
                className="jelly-button py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25 cursor-pointer"
              >
                Launch Mobile Controller Simulator
              </button>
              <button
                onClick={handleDownloadAndroid}
                className="jelly-button py-3 px-6 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 text-xs font-bold shadow-sm cursor-pointer"
              >
                Download Android APK (v1.4.2)
              </button>
            </div>
          </div>

          {/* Simulated Mobile Phone Visual */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-72 sm:w-80 rounded-[44px] bg-slate-950 p-4 border-[6px] border-slate-800 shadow-2xl relative">
              {/* Phone Speaker Notch */}
              <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-3" />

              {/* Phone Screen Display */}
              <div className="w-full rounded-[32px] bg-[#F1F5FB] p-4 text-slate-800 space-y-3.5 shadow-inner">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-400">Dell G15 5530</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">ARMED</span>
                </div>

                {/* Status card */}
                <div className="p-3 rounded-2xl bg-white shadow-sm border border-slate-200/80">
                  <div className="flex justify-between items-center text-xs font-extrabold text-slate-900">
                    <span>Power Sentinel</span>
                    <span className="text-emerald-600">AC Plugged</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Battery: 99% • Sri Lanka</p>
                </div>

                {/* Mobile action buttons */}
                <div className="grid grid-cols-2 gap-2 text-center text-[11px] font-bold">
                  <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-sm">
                    🔊 Sound Siren
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm">
                    🔒 Lock Windows
                  </div>
                  <div className="p-2.5 rounded-xl bg-cyan-600 text-white shadow-sm">
                    📷 Live Camera
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-500 text-white shadow-sm">
                    🚨 Lost Mode
                  </div>
                </div>

                {/* Auto update banner pill */}
                <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3 h-3 text-indigo-600" />
                  <span>OTA Auto-Update Active (v1.4.2)</span>
                </div>
              </div>

              {/* Bottom Home Indicator Bar */}
              <div className="w-28 h-1 bg-slate-700 rounded-full mx-auto mt-3" />
            </div>
          </div>
        </div>
      </section>

      {/* Downloads Hub */}
      <section id="downloads" className="py-16 px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto border-t border-slate-200/60">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <span className="jelly-pill px-3 py-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200">
            Installation & Access
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Direct Downloads for Windows & Mobile
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Download the official software packages directly from this server. Zero third-party trackers, zero covert telemetry.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Card 1: Windows Desktop Agent */}
          <div className="jelly-card p-8 rounded-[32px] space-y-5 border border-slate-200/80 shadow-md">
            <div className="flex items-center justify-between">
              <div className="bubble-icon w-14 h-14 bubble-blue flex items-center justify-center shadow-sm">
                <Laptop className="w-7 h-7 text-blue-600" />
              </div>
              <span className="jelly-pill px-3 py-1 text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">
                v1.4.2 Signed
              </span>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">Windows Hardware Agent</h3>
              <p className="text-xs text-slate-500 mt-1">For Windows 10 & Windows 11 (64-bit)</p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Installs the native Win32 background sentinel on your laptop. Enables 500ms AC power polling, volume boost, and emergency LockWorkStation integration.
            </p>

            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Package:</span>
                <span className="font-mono font-bold text-slate-800">LaptopGuard-Windows-Agent-v1.4.2.zip</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Compatibility:</span>
                <span className="font-semibold text-slate-800">Dell, Lenovo, HP, ASUS, Acer</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDownloadExe}
                className="jelly-button flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download .exe (v1.4.2)</span>
              </button>
              <button
                onClick={handleDownloadWindows}
                className="jelly-button py-3.5 px-4 rounded-2xl bg-white/80 hover:bg-white border border-slate-200/90 text-slate-700 text-xs font-bold shadow-sm cursor-pointer"
                title="Download Portable .zip Package"
              >
                <span>.ZIP</span>
              </button>
            </div>
          </div>

          {/* Card 2: Android Mobile App APK */}
          <div className="jelly-card p-8 rounded-[32px] space-y-5 border border-slate-200/80 shadow-md">
            <div className="flex items-center justify-between">
              <div className="bubble-icon w-14 h-14 bubble-cyan flex items-center justify-center shadow-sm">
                <Smartphone className="w-7 h-7 text-cyan-600" />
              </div>
              <span className="jelly-pill px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                OTA Auto-Update
              </span>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">Android Mobile Companion</h3>
              <p className="text-xs text-slate-500 mt-1">Android 9.0+ & Progressive Web App</p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Remote command console for your smartphone. Features live webcam monitoring, one-touch siren silencing, and instant Over-The-Air auto-updating.
            </p>

            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Package:</span>
                <span className="font-mono font-bold text-slate-800">LaptopGuard-AI-Mobile-v1.4.2.apk</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Auto-Update:</span>
                <span className="font-semibold text-emerald-600">Enabled (Over-The-Air)</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDownloadAndroid}
                className="jelly-button flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 active:scale-[0.98] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Android APK</span>
              </button>
              <button
                onClick={onOpenMobileView}
                className="jelly-button py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                title="Open Phone Controller View"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto border-t border-slate-200/60 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-slate-800">LaptopGuard AI</span>
          <span>• Dedicated Hardware Anti-Theft & Surveillance Deterrence</span>
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
          <span className="font-mono text-[11px] text-slate-400">v1.4.2 Production Signed</span>
        </div>
      </footer>
    </div>
  );
};
