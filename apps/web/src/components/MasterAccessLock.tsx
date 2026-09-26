import React, { useState, useEffect, useRef } from 'react';
import { Shield, ShieldAlert, Lock, Unlock, KeyRound, AlertTriangle, Delete, ArrowRight, CheckCircle2 } from 'lucide-react';

interface MasterAccessLockProps {
  onUnlock: () => void;
}

const CORRECT_PIN = '6728';

export const MasterAccessLock: React.FC<MasterAccessLockProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Synthesize sound effects
  const playSound = (type: 'tap' | 'error' | 'success') => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'tap') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.setValueAtTime(120, now + 0.15);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(1046.5, now + 0.22);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      }
    } catch (e) {
      // Audio autoplay policy
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length >= 6 || isSuccess) return;
    setError(null);
    playSound('tap');
    const newPin = pin + digit;
    setPin(newPin);

    const savedPin = localStorage.getItem('laptopguard_secret_pin') || CORRECT_PIN;
    if (newPin === savedPin || newPin === CORRECT_PIN) {
      validatePin(newPin);
    } else if (newPin.length >= Math.max(savedPin.length, 4) && (newPin.length === 6 || newPin.length === savedPin.length)) {
      validatePin(newPin);
    }
  };

  const handleDelete = () => {
    if (isSuccess) return;
    playSound('tap');
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    if (isSuccess) return;
    playSound('tap');
    setPin('');
    setError(null);
  };

  const validatePin = (inputPin: string) => {
    const savedPin = localStorage.getItem('laptopguard_secret_pin') || CORRECT_PIN;
    if (inputPin === savedPin || inputPin === CORRECT_PIN) {
      setIsSuccess(true);
      playSound('success');
      sessionStorage.setItem('laptopguard_master_unlocked', 'true');
      setTimeout(() => {
        onUnlock();
      }, 700);
    } else {
      playSound('error');
      setError('ACCESS DENIED • INVALID PASSCODE');
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 600);
    }
  };

  // Keyboard listener for desktop users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Enter') {
        validatePin(pin);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isSuccess]);

  return (
    <div 
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-[#070A12] text-white select-none overflow-hidden font-sans"
      style={{
        paddingTop: 'max(48px, env(safe-area-inset-top, 48px))',
        paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))',
        paddingLeft: 'max(16px, env(safe-area-inset-left, 16px))',
        paddingRight: 'max(16px, env(safe-area-inset-right, 16px))'
      }}
    >
      
      {/* Background Cyber Glow & Grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-cyan-600/10 rounded-full blur-[100px]" />
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(#F43F5E 1px, transparent 1px), linear-gradient(90deg, #F43F5E 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      {/* Main Lock Screen Card */}
      <div className={`relative z-10 w-full max-w-sm sm:max-w-md flex flex-col items-center justify-between p-6 sm:p-8 rounded-3xl bg-slate-900/90 border ${
        isSuccess 
          ? 'border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.25)]' 
          : error 
            ? 'border-rose-500/60 shadow-[0_0_50px_rgba(244,63,94,0.25)]' 
            : 'border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]'
      } backdrop-blur-2xl transition-all duration-300 ${isShaking ? 'animate-shake' : ''}`}>
        
        {/* Top Restricted Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/40 text-[10px] font-mono tracking-wider text-rose-300 shadow-sm mb-4">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>SYSTEM LOCKED • OWNER PIN REQUIRED</span>
        </div>

        {/* Lock Icon */}
        <div className="relative my-2">
          <div className={`w-20 h-20 sm:w-22 sm:h-22 rounded-3xl flex items-center justify-center border-2 transition-all duration-300 ${
            isSuccess
              ? 'bg-emerald-950/60 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/30'
              : error
                ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-lg shadow-rose-500/30'
                : 'bg-slate-800/80 border-slate-700 text-slate-200 shadow-md'
          }`}>
            {isSuccess ? (
              <Unlock className="w-10 h-10 animate-bounce text-emerald-400" />
            ) : (
              <Lock className="w-10 h-10 text-rose-400" />
            )}
          </div>
        </div>

        {/* Title */}
        <div className="text-center mt-3 mb-4">
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>LAPTOPGUARD</span>
            <span className="px-1.5 py-0.5 rounded-lg bg-rose-600 text-white text-sm font-mono">
              SECURE
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Enter your Secret Passcode or Master PIN to unlock console
          </p>
        </div>

        {/* Masked PIN Indicators */}
        <div className="flex items-center gap-3 my-3">
          {Array.from({ length: Math.max(4, pin.length) }).map((_, index) => {
            const hasDigit = pin.length > index;
            return (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  isSuccess
                    ? 'bg-emerald-400 shadow-[0_0_12px_#34D399] scale-110'
                    : error
                      ? 'bg-rose-500 shadow-[0_0_12px_#F43F5E] scale-110'
                      : hasDigit
                        ? 'bg-cyan-400 shadow-[0_0_10px_#22D3EE] scale-110'
                        : 'bg-slate-800 border-2 border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Status / Error Message */}
        <div className="h-6 flex items-center justify-center my-1">
          {error && (
            <span className="text-xs font-mono font-bold text-rose-400 animate-in fade-in flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </span>
          )}
          {isSuccess && (
            <span className="text-xs font-mono font-bold text-emerald-400 animate-in fade-in flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ACCESS GRANTED • UNLOCKING SYSTEM</span>
            </span>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] my-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              disabled={isSuccess}
              className="h-14 rounded-2xl bg-white/5 hover:bg-white/15 active:bg-white/25 active:scale-95 border border-white/10 text-xl font-mono font-bold text-white transition-all cursor-pointer flex items-center justify-center shadow-xs disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          
          {/* Clear button */}
          <button
            onClick={handleClear}
            disabled={isSuccess}
            className="h-14 rounded-2xl bg-white/5 hover:bg-rose-950/40 hover:border-rose-500/40 active:scale-95 border border-white/10 text-xs font-mono font-bold text-slate-400 hover:text-rose-300 transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
          >
            CLR
          </button>

          {/* 0 digit */}
          <button
            onClick={() => handleDigit('0')}
            disabled={isSuccess}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/15 active:bg-white/25 active:scale-95 border border-white/10 text-xl font-mono font-bold text-white transition-all cursor-pointer flex items-center justify-center shadow-xs disabled:opacity-50"
          >
            0
          </button>

          {/* Delete backspace */}
          <button
            onClick={handleDelete}
            disabled={isSuccess}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/15 active:scale-95 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-3 text-center">
          <p className="text-[10px] font-mono text-slate-500 tracking-wider">
            LAPTOPGUARD SOVEREIGN PROTOCOL • AUTHORIZED PERSONNEL ONLY
          </p>
        </div>

      </div>

    </div>
  );
};
