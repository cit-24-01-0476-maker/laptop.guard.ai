import React, { useState } from 'react';
import { Shield, Lock, Mail, User, ArrowRight, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useSecurity } from '../context/SecurityContext';

interface MobileAuthViewProps {
  onSuccess: () => void;
}

export const MobileAuthView: React.FC<MobileAuthViewProps> = ({ onSuccess }) => {
  const { loginUser } = useSecurity();
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(() => localStorage.getItem('laptopguard_last_email') || '');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMsg('Please enter email and password.');
      return;
    }

    setIsLoading(true);

    try {
      let res;
      if (isRegister) {
        res = await api.register(cleanEmail, cleanPassword, (fullName || cleanEmail.split('@')[0]).trim());
      } else {
        res = await api.login(cleanEmail, cleanPassword);
      }

      if (res && res.access_token) {
        localStorage.setItem('laptopguard_last_email', cleanEmail);
        loginUser(res.user, res.access_token);
        onSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('test@laptopguard.ai');
    setPassword('password123');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#0F172A] text-white flex flex-col items-center justify-between px-5 py-8 relative overflow-hidden font-sans select-none">
      
      {/* Dynamic Background Glow Rings */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* 1. App Top Branding */}
      <div className="w-full max-w-sm flex flex-col items-center text-center mt-4 z-10">
        <div className="relative mb-4">
          <div className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-[2px] shadow-xl shadow-blue-500/25">
            <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
              <Shield className="w-9 h-9 text-cyan-400 stroke-[2.2] animate-pulse" />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-[9px] font-black tracking-widest text-slate-950 uppercase border border-emerald-300/40">
            Sentinel
          </div>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-1.5 justify-center">
          <span>LAPTOPGUARD</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">AI</span>
        </h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Autonomous Mobile Laptop Security & Fleet Controller
        </p>
      </div>

      {/* 2. Full-Screen Auth Card */}
      <div className="w-full max-w-sm bg-slate-900/85 backdrop-blur-2xl border border-slate-700/60 rounded-3xl p-6 shadow-2xl z-10 my-auto">
        
        {/* Sign In / Sign Up Segmented Control */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-800/90 border border-slate-700/50 mb-5">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setErrorMsg(null); }}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              !isRegister
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setErrorMsg(null); }}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              isRegister
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="leading-tight">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Owner Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. Oshadha Perera"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Sentinel Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-98 transition-all cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Connecting Sentinel...</span>
              </span>
            ) : (
              <>
                <span>{isRegister ? 'Register & Launch App' : 'Sign In to Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo One-Click Fill button for quick testing */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Testing the app?</span>
          <button
            type="button"
            onClick={fillDemo}
            className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 active:scale-95 transition-all"
          >
            <Sparkles className="w-3 h-3" />
            <span>Quick Demo Fill</span>
          </button>
        </div>
      </div>

      {/* 3. Security Highlights Footer */}
      <div className="w-full max-w-sm text-center z-10">
        <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>End-to-End Encrypted</span>
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-cyan-400" />
            <span>Real-time Sentinel AI</span>
          </span>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          LaptopGuard AI Mobile Client • v1.4.2
        </p>
      </div>

    </div>
  );
};
