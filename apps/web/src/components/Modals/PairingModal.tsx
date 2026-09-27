import React, { useState, useEffect } from 'react';
import { ShieldCheck, Laptop, CheckCircle2, AlertCircle, Loader2, ArrowRight, X, Clock, KeyRound } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';
import { api } from '../../services/api';

export const PairingModal: React.FC = () => {
  const { isPairingModalOpen, setIsPairingModalOpen, refreshAll } = useSecurity();
  const [pairingCodeInput, setPairingCodeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Claimed state
  const [activeRequest, setActiveRequest] = useState<{
    pairing_request_id: string;
    device_id: string;
    device_name: string;
    manufacturer?: string;
    model?: string;
    status: string;
    expires_in_seconds: number;
  } | null>(null);

  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const [isSuccess, setIsSuccess] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isPairingModalOpen) {
      setPairingCodeInput('');
      setErrorMsg(null);
      setActiveRequest(null);
      setIsSuccess(false);
    }
  }, [isPairingModalOpen]);

  // Countdown timer when activeRequest is waiting
  useEffect(() => {
    if (!activeRequest || isSuccess) return;

    setRemainingSeconds(activeRequest.expires_in_seconds || 300);
    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMsg('PAIRING_CODE_EXPIRED: The 5-minute pairing code expired. Please generate a fresh code on your laptop.');
          setActiveRequest(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeRequest, isSuccess]);

  // Polling for laptop local approval
  useEffect(() => {
    if (!activeRequest || isSuccess) return;

    const pollInterval = setInterval(async () => {
      try {
        const statusData = await api.getPairingStatus(activeRequest.pairing_request_id);
        if (statusData.status === 'CONSUMED') {
          setIsSuccess(true);
          clearInterval(pollInterval);
          setTimeout(() => {
            setIsPairingModalOpen(false);
            refreshAll();
          }, 2000);
        } else if (statusData.status === 'DENIED') {
          setErrorMsg('The pairing request was DENIED on the laptop.');
          setActiveRequest(null);
          clearInterval(pollInterval);
        } else if (statusData.status === 'EXPIRED') {
          setErrorMsg('Pairing code expired before approval.');
          setActiveRequest(null);
          clearInterval(pollInterval);
        }
      } catch (err: any) {
        console.warn('Pairing status poll failed:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [activeRequest, isSuccess, setIsPairingModalOpen, refreshAll]);

  if (!isPairingModalOpen) return null;

  const formatCodeInput = (val: string) => {
    let clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.startsWith('LG')) {
      clean = clean.slice(2);
    }
    let p1 = clean.slice(0, 4);
    let p2 = clean.slice(4, 8);
    if (p2.length > 0) {
      return `LG-${p1}-${p2}`;
    } else if (p1.length > 0) {
      return `LG-${p1}`;
    }
    return clean ? `LG-${clean}` : '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setErrorMsg(null);
    setPairingCodeInput(formatCodeInput(raw));
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingCodeInput.trim()) {
      setErrorMsg('Please enter the pairing code displayed on your laptop.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const claimRes = await api.claimPairingCode(pairingCodeInput.trim());
      setActiveRequest(claimRes);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to claim pairing code. Please verify the code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl jelly-card p-6 sm:p-7 border border-white/80 dark:border-white/10 shadow-2xl relative">
        <button
          onClick={() => setIsPairingModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="bubble-icon w-12 h-12 bubble-blue flex items-center justify-center shadow-sm">
            <KeyRound className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Pair Protected Laptop</h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Zero-Trust Cryptographic Device Binding</p>
          </div>
        </div>

        {isSuccess ? (
          <div className="py-10 text-center space-y-3">
            <div className="bubble-icon w-16 h-16 bubble-mint flex items-center justify-center mx-auto shadow-sm animate-bounce">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white">Laptop Guard Protected!</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Device ownership confirmed locally. Your controller is now securely enrolled.
            </p>
          </div>
        ) : activeRequest ? (
          /* Waiting for Laptop Confirmation State */
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/40 flex items-center gap-3">
              <div className="bubble-icon w-10 h-10 bubble-blue flex-shrink-0">
                <Laptop className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  {activeRequest.device_name}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {activeRequest.manufacturer} {activeRequest.model} • Ready to Bind
                </p>
              </div>
              <div className="flex items-center gap-1 font-mono text-xs font-black text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-blue-200/60 shadow-xs">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(remainingSeconds)}</span>
              </div>
            </div>

            <div className="py-6 text-center space-y-3 bg-white/60 dark:bg-white/5 rounded-2xl border border-slate-200/60 p-4">
              <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs font-black uppercase tracking-wider">Awaiting Owner Confirmation</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                A confirmation dialog has appeared on your Windows laptop screen. Please click <strong className="text-blue-600 dark:text-blue-400">[APPROVE]</strong> on your laptop to permanently bind ownership.
              </p>
            </div>

            <button
              onClick={() => setActiveRequest(null)}
              className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            >
              Cancel & Enter Different Code
            </button>
          </div>
        ) : (
          /* Pairing Code Input Form */
          <form onSubmit={handleClaim} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Launch <strong>LaptopGuard Windows Sentinel</strong> on your laptop. Click <strong>Generate Pairing Code</strong> and type the 8-character single-use code below.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                One-Time Pairing Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={pairingCodeInput}
                  onChange={handleInputChange}
                  placeholder="LG-XXXX-XXXX"
                  maxLength={12}
                  className="w-full px-4 py-3.5 text-center font-mono text-lg font-black tracking-widest rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white uppercase outline-none shadow-xs"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Pairing codes expire automatically after 5 minutes and cannot be reused.
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
                onClick={() => setIsPairingModalOpen(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || pairingCodeInput.length < 8}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validating Code...</span>
                  </>
                ) : (
                  <>
                    <span>Claim Laptop</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
