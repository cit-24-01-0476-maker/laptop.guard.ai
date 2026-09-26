import React from 'react';
import { User, KeyRound, Smartphone, ShieldCheck, LogOut, Laptop, CheckCircle2 } from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';

export const AccountView: React.FC = () => {
  const { user } = useSecurity();
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="jelly-pill px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/30 border border-blue-200/60 dark:border-blue-700/40">
              Identity Profile
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Account & Identity Security</h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Owner profile, cryptographic authentication keys, and active session tokens
          </p>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="jelly-card p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-blue-500/25">
            {(user?.full_name || user?.email || 'U').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {user?.full_name || user?.email?.split('@')[0] || 'Member'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email || 'Signed In'}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="jelly-pill text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50 uppercase">
                Device Fleet Owner
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                2FA Active
              </span>
            </div>
          </div>
        </div>

        <button className="jelly-button py-2.5 px-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 hover:bg-white border border-slate-200/60 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-white shadow-sm transition-all cursor-pointer">
          Edit Profile
        </button>
      </div>

      {/* Security Credentials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Two-Factor Authentication */}
        <div className="jelly-card p-6 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="bubble-icon w-8 h-8 bubble-cyan flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">Two-Factor Authentication</span>
            </div>
            <span className="jelly-pill px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/50">
              Enforced
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Hardware TOTP / Authenticator App is bound to your login identity. Sensitive actions such as remote lock
            and alarm require verified session tokens.
          </p>
        </div>

        {/* Change Password */}
        <div className="jelly-card p-6 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="bubble-icon w-8 h-8 bubble-violet flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">Master Password</span>
            </div>
            <button className="text-xs text-blue-600 dark:text-cyan-400 hover:underline font-bold">Change</button>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Encrypted with PBKDF2-SHA256 with salted key stretching. Last modified 30 days ago.
          </p>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="jelly-card p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Active Device Sessions</h3>
          <button className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-bold">
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out All Other Sessions</span>
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="bubble-icon w-10 h-10 bubble-blue flex items-center justify-center shadow-sm">
                <Laptop className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white">LaptopGuard Web Dashboard (Chrome / Windows 11)</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Current active session • IP 103.252.12.8</p>
              </div>
            </div>
            <span className="jelly-pill text-[10px] text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
              Online Now
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="bubble-icon w-10 h-10 bubble-cyan flex items-center justify-center shadow-sm">
                <Smartphone className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white">LaptopGuard Mobile (iOS App)</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Last accessed 1 hour ago • Colombo, Sri Lanka</p>
              </div>
            </div>
            <span className="jelly-pill text-[10px] text-slate-500 dark:text-slate-400 font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/10">
              Authorized
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
