import React, { useState, useEffect, useRef } from 'react';
import { Shield, Sparkles, Volume2, VolumeX, Play, ChevronRight, Check } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

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
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'laser') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.3);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'chime') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.15); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.3); // G5
        osc.frequency.setValueAtTime(1046.5, now + 0.45); // C6
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
      }
    } catch (e) {
      // Audio might be blocked by browser autoplay policy before gesture
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setProgress(0);
    setStage(0);

    const startTime = Date.now();
    const duration = 5000; // 5 seconds cinematic sequence

    playCyberSound('laser');

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct >= 20 && pct < 50) {
        setStage(1);
      } else if (pct >= 50 && pct < 80) {
        setStage(2);
      } else if (pct >= 80) {
        setStage(3);
      }

      if (pct >= 100) {
        clearInterval(interval);
        playCyberSound('chime');
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleFinish = () => {
    if (dontShowAgain) {
      localStorage.setItem('laptopguard_skip_intro', 'true');
    }
    onClose();
    if (onEnterApp) onEnterApp();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950 text-white select-none overflow-hidden font-sans">
      
      {/* 1. Cinematic Background Video / Particle Matrix Grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Deep Cyber Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-blue-700/20 via-cyan-500/25 to-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
        
        {/* Animated Cyber Grid Lines */}
        <div 
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `linear-gradient(#00F2FE 1px, transparent 1px), linear-gradient(90deg, #00F2FE 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            transform: 'perspective(500px) rotateX(60deg) translateY(100px)',
            transformOrigin: 'bottom center'
          }}
        />

        {/* Floating Cyber Particle Orbs */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-cyan-400 animate-ping opacity-60" />
        <div className="absolute top-1/3 right-1/4 w-3 h-3 rounded-full bg-blue-500 animate-pulse opacity-50" />
        <div className="absolute bottom-1/3 left-1/3 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-60" />
      </div>

      {/* 2. Top Controls (Mute & Skip) */}
      <div className="absolute top-4 sm:top-6 left-4 right-4 sm:left-6 sm:right-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-mono text-cyan-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>CYBER SENTINEL BOOTLOADER v1.5.0</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white transition-all cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
          <button
            onClick={handleFinish}
            className="px-4 py-2 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-xs font-bold text-slate-200 transition-all cursor-pointer flex items-center gap-1"
          >
            <span>Skip</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Center Cinematic Reveal Canvas */}
      <div className="relative z-20 flex flex-col items-center text-center px-4 max-w-lg w-full">
        
        {/* Holographic Glowing Cyber Shield Icon */}
        <div className="relative mb-6">
          {/* Pulsing Radar Ring */}
          <div className="absolute -inset-8 rounded-full border border-cyan-400/30 animate-ping opacity-40" />
          <div className="absolute -inset-4 rounded-full border border-blue-500/40 animate-pulse opacity-60" />
          
          {/* Master Cyber Shield Logo */}
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-tr from-slate-900 via-[#0B1E48] to-[#030E26] p-4 flex items-center justify-center border-2 border-cyan-400 shadow-2xl shadow-cyan-500/30">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_20px_rgba(0,242,254,0.6)]">
              <path
                d="M12 2L20 5.5C20 13.5 16.5 19 12 21.5C7.5 19 4 13.5 4 5.5L12 2Z"
                stroke="url(#introShieldGrad)"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M12 4L18 6.5C18 12.5 15.5 16.5 12 18.8C8.5 16.5 6 12.5 6 6.5L12 4Z"
                fill="url(#introInnerGrad)"
                opacity="0.85"
              />
              <circle cx="12" cy="11.5" r="3.2" fill="#00F2FE" />
              <circle cx="12" cy="11.5" r="1.5" fill="#FFFFFF" />
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
            <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 shadow-md shadow-emerald-400 animate-ping" />
          </div>
        </div>

        {/* Dynamic Telemetry Terminal Typing Sequence */}
        <div className="h-20 flex flex-col items-center justify-center mb-4">
          {stage === 0 && (
            <div className="animate-in fade-in duration-300 space-y-1">
              <span className="text-xs font-mono text-cyan-400 tracking-wider">
                [1/3] ENGAGING WIN32 HARDWARE WATCHDOG...
              </span>
              <p className="text-sm font-bold text-slate-300">
                500ms AC Power Interruption Sentinel Active
              </p>
            </div>
          )}

          {stage === 1 && (
            <div className="animate-in fade-in duration-300 space-y-1">
              <span className="text-xs font-mono text-cyan-400 tracking-wider">
                [2/3] SYNCHRONIZING REAL-TIME WSS TUNNEL...
              </span>
              <p className="text-sm font-bold text-slate-300">
                Authorized Webcam Verification & Instant Lock
              </p>
            </div>
          )}

          {stage >= 2 && (
            <div className="animate-in fade-in duration-300 space-y-1">
              <span className="text-xs font-mono text-emerald-400 tracking-wider flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>[3/3] SOVEREIGN DEFENSE SYSTEM ONLINE</span>
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center justify-center gap-2">
                <span>LAPTOPGUARD</span>
                <span className="px-2 py-0.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xl font-mono shadow-md shadow-blue-500/40">
                  AI
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Protect Your Laptop. Wherever You Go.
              </p>
            </div>
          )}
        </div>

        {/* Main CTA Button */}
        <div className="w-full mt-4 flex flex-col items-center gap-3">
          <button
            onClick={handleFinish}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-black tracking-wide shadow-xl shadow-cyan-500/25 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 group"
          >
            <span>ENTER SENTINEL</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-slate-200 transition-colors">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Don't show intro on startup</span>
          </label>
        </div>

      </div>

      {/* 4. Bottom Cinematic Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
        <div 
          className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>

    </div>
  );
};
