import React, { useState, useEffect, useRef } from 'react';
import { Shield, Sparkles, Volume2, VolumeX, Play, Pause, ChevronRight, Check, Radio } from 'lucide-react';

interface IntroVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnterApp?: () => void;
}

export const IntroVideoModal: React.FC<IntroVideoModalProps> = ({
  isOpen,
  onClose,
  onEnterApp
}) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Synthesize futuristic cyber audio chimes using Web Audio API
  const playCyberSound = (type: 'beep' | 'laser' | 'chime') => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'laser') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.25);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'chime') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
        osc.frequency.setValueAtTime(1046.5, now + 0.36); // C6
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.start(now);
        osc.stop(now + 0.7);
      }
    } catch (e) {
      // Audio might be blocked by browser autoplay policy before user gesture
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setProgress(0);
    setStage(0);
    setIsPaused(false);

    playCyberSound('laser');
  }, [isOpen]);

  // Video playback timer
  useEffect(() => {
    if (!isOpen || isPaused) return;

    const duration = 5200; // 5.2 seconds sequence
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(100, prev + step);

        if (next >= 25 && next < 55) {
          setStage(1);
        } else if (next >= 55) {
          setStage(2);
        }

        if (next >= 100) {
          clearInterval(interval);
          playCyberSound('chime');
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isOpen, isPaused]);

  const handleFinish = () => {
    if (dontShowAgain) {
      localStorage.setItem('laptopguard_skip_intro', 'true');
    }
    onClose();
    if (onEnterApp) onEnterApp();
  };

  const handleReplay = () => {
    setProgress(0);
    setStage(0);
    setIsPaused(false);
    playCyberSound('laser');
  };

  if (!isOpen) return null;

  const currentSeconds = ((progress / 100) * 5.2).toFixed(1);

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl text-white select-none overflow-hidden font-sans"
      style={{
        paddingTop: 'max(56px, env(safe-area-inset-top, 56px))',
        paddingBottom: 'max(36px, env(safe-area-inset-bottom, 36px))',
        paddingLeft: 'max(16px, env(safe-area-inset-left, 16px))',
        paddingRight: 'max(16px, env(safe-area-inset-right, 16px))'
      }}
    >
      
      {/* 
        CINEMATIC VIDEO FRAME CONTAINER 
        Guaranteed to fit 100% of any screen aspect ratio (20:9 phones, 16:9 PCs, iPads)
        with zero edge cut-off or clipping.
      */}
      <div className="relative w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-full flex flex-col justify-between rounded-3xl bg-gradient-to-b from-slate-900/95 via-[#070F22]/98 to-slate-950/98 border border-cyan-500/40 shadow-[0_0_50px_rgba(0,242,254,0.18)] overflow-hidden p-4 sm:p-6 mx-auto my-auto">
        
        {/* Animated Cyber Grid Matrix inside video frame */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(#00F2FE 1px, transparent 1px), linear-gradient(90deg, #00F2FE 1px, transparent 1px)`,
              backgroundSize: '36px 36px',
              transform: 'perspective(400px) rotateX(50deg) translateY(60px)',
              transformOrigin: 'bottom center'
            }}
          />
        </div>

        {/* Ambient Radial Cyber Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-80 sm:h-80 bg-cyan-500/15 rounded-full blur-[80px] pointer-events-none" />

        {/* 1. TOP VIDEO PLAYER HUD BAR */}
        <div className="relative z-30 flex items-center justify-between gap-2 pb-3 border-b border-white/10">
          {/* Cyber Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/70 border border-cyan-400/40 text-[10px] font-mono text-cyan-300 shadow-xs flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wider">SENTINEL AI</span>
          </div>

          {/* Video Timestamp */}
          <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] font-mono text-slate-300">
            <span>00:0{Math.floor(parseFloat(currentSeconds))}</span>
            <span className="text-slate-500"> / 00:05</span>
          </div>

          {/* Video Control Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Play/Pause */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-slate-200 cursor-pointer"
              title={isPaused ? 'Resume Video' : 'Pause Video'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" /> : <Pause className="w-3.5 h-3.5" />}
            </button>

            {/* Mute/Unmute */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-slate-200 cursor-pointer"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
            </button>

            {/* Skip Button */}
            <button
              onClick={handleFinish}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-0.5 active:scale-95"
            >
              <span>Skip</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2. CENTER CINEMATIC STAGE */}
        <div className="relative z-20 flex flex-col items-center justify-center py-4 sm:py-6 text-center overflow-hidden">
          
          {/* Holographic 3D Cyber Shield with Laser Scanner */}
          <div className="relative my-2 sm:my-3">
            {/* Pulsing Orbital Rings (Contained, non-overflowing) */}
            <div className="absolute -inset-3 rounded-full border border-cyan-400/30 animate-ping opacity-30 pointer-events-none" />
            <div className="absolute -inset-1.5 rounded-full border border-blue-500/40 animate-pulse opacity-50 pointer-events-none" />

            {/* Shield Canvas */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-slate-900 via-[#0B1E48] to-[#030E26] p-3 flex items-center justify-center border-2 border-cyan-400 shadow-xl shadow-cyan-500/25 overflow-hidden">
              
              {/* Laser Scanning Beam Sweep */}
              <div 
                className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_12px_#00F2FE]"
                style={{
                  top: `${(progress * 1.5) % 100}%`,
                  transition: 'top 0.08s linear'
                }}
              />

              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_16px_rgba(0,242,254,0.7)]">
                <path
                  d="M12 2L20 5.5C20 13.5 16.5 19 12 21.5C7.5 19 4 13.5 4 5.5L12 2Z"
                  stroke="url(#introShieldGrad)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 4L18 6.5C18 12.5 15.5 16.5 12 18.8C8.5 16.5 6 12.5 6 6.5L12 4Z"
                  fill="url(#introInnerGrad)"
                  opacity="0.88"
                />
                <circle cx="12" cy="11.5" r="3" fill="#00F2FE" />
                <circle cx="12" cy="11.5" r="1.4" fill="#FFFFFF" />
                <path d="M12 6.5V8.5M12 14.5V16.5M7 11.5H9M15 11.5H17" stroke="#38BDF8" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
                <defs>
                  <linearGradient id="introShieldGrad" x1="4" y1="2" x2="20" y2="21.5" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#00F2FE" />
                    <stop offset="0.5" stopColor="#38BDF8" />
                    <stop offset="1" stopColor="#8B5CF6" />
                  </linearGradient>
                  <linearGradient id="introInnerGrad" x1="6" y1="4" x2="18" y2="18.8" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0284C7" />
                    <stop offset="1" stopColor="#0B1E48" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Online Beacon */}
              <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900 shadow-md shadow-emerald-400 animate-pulse" />
            </div>
          </div>

          {/* 3-Step Telemetry Pipeline Indicators */}
          <div className="flex items-center gap-1.5 sm:gap-2 my-2 sm:my-3">
            <div className={`px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-mono tracking-wider transition-all border ${
              stage >= 0 ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 font-bold' : 'bg-white/5 border-white/10 text-slate-500'
            }`}>
              01 SENSORS
            </div>
            <div className="w-2 h-0.5 bg-white/20" />
            <div className={`px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-mono tracking-wider transition-all border ${
              stage >= 1 ? 'bg-blue-500/20 border-blue-400/60 text-blue-300 font-bold' : 'bg-white/5 border-white/10 text-slate-500'
            }`}>
              02 WSS TUNNEL
            </div>
            <div className="w-2 h-0.5 bg-white/20" />
            <div className={`px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-mono tracking-wider transition-all border ${
              stage >= 2 ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300 font-bold' : 'bg-white/5 border-white/10 text-slate-500'
            }`}>
              03 AI ARMED
            </div>
          </div>

          {/* Dynamic Diagnostic Readout (Protected height, zero clipping) */}
          <div className="min-h-[70px] sm:min-h-[80px] flex flex-col items-center justify-center px-2">
            {stage === 0 && (
              <div className="animate-in fade-in duration-300 space-y-1">
                <span className="text-[11px] sm:text-xs font-mono text-cyan-400 tracking-wider">
                  [INITIALIZING WATCHDOG SENTINEL...]
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-200">
                  500ms AC Disconnect Detection Ready
                </p>
              </div>
            )}

            {stage === 1 && (
              <div className="animate-in fade-in duration-300 space-y-1">
                <span className="text-[11px] sm:text-xs font-mono text-blue-400 tracking-wider">
                  [ESTABLISHING QUANTUM WSS STREAM...]
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-200">
                  Authorized Webcam & Motion Sentinel Armed
                </p>
              </div>
            )}

            {stage >= 2 && (
              <div className="animate-in fade-in duration-300 space-y-1">
                <span className="text-[10px] sm:text-xs font-mono text-emerald-400 tracking-wider flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>SOVEREIGN DEFENSE PROTOCOL ACTIVE</span>
                </span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
                  <span>LAPTOPGUARD</span>
                  <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-base sm:text-lg font-mono shadow-md shadow-blue-500/30">
                    AI
                  </span>
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium">
                  Protect Your Laptop. Wherever You Go.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* 3. BOTTOM SCRUBBER & ACTION CONTROLS */}
        <div className="relative z-30 pt-3 border-t border-white/10 space-y-3">
          
          {/* High-Tech Scrubber Progress Bar */}
          <div className="w-full">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
              <span>INITIALIZING DEFENSE CORE</span>
              <span className="text-cyan-400 font-bold">{progress}%</span>
            </div>
            <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 rounded-full transition-all duration-75 shadow-[0_0_8px_#00F2FE]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <label className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 cursor-pointer hover:text-slate-200 transition-colors order-2 sm:order-1">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
              />
              <span>Don't show on startup</span>
            </label>

            <button
              onClick={handleFinish}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold tracking-wide shadow-lg shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 order-1 sm:order-2"
            >
              <span>ENTER APP</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
