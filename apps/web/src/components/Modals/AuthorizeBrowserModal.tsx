import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertCircle, Loader2, X, KeySquare } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const AuthorizeBrowserModal: React.FC = () => {
  const { isAuthorizeBrowserModalOpen, setIsAuthorizeBrowserModalOpen, authorizeThisBrowser } = useSecurity();
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isAuthorizeBrowserModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMsg('Please enter your 4-digit security PIN.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const ok = await authorizeThisBrowser(pin.trim());
      if (ok) {
        setIsAuthorizeBrowserModalOpen(false);
      } else {
        setErrorMsg('Authorization failed. Please check your PIN.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid security PIN. Default is 6728.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl jelly-card p-6 sm:p-7 border border-white/80 dark:border-white/10 shadow-2xl relative">
        <button
          onClick={() => setIsAuthorizeBrowserModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          <div className="bubble-icon w-12 h-12 bubble-amber flex items-center justify-center shadow-sm">
            <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Authorize Controller</h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Step-Up Remote Security Authorization</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 leading-relaxed mb-4">
          This browser is currently <strong>Untrusted</strong> for remote hardware control. Enter your account Master PIN to grant this session authorization to trigger sirens, lock, and disarm your laptop.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
              Master Security PIN
            </label>
            <div className="relative">
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setErrorMsg(null);
                  setPin(e.target.value);
                }}
                placeholder="••••"
                className="w-full px-4 py-3 text-center tracking-[0.5em] font-mono text-xl font-black rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-slate-900 dark:text-white outline-none shadow-xs"
                autoFocus
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Account master PIN configured during registration (Default: 6728).
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAuthorizeBrowserModalOpen(false)}
              className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !pin}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authorizing...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authorize Browser</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
