import React, { useState, useEffect } from 'react';
import { QrCode, Shield, CheckCircle2, Laptop, Copy, X, RefreshCw } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';
import { api } from '../../services/api';

export const PairingModal: React.FC = () => {
  const { isPairingModalOpen, setIsPairingModalOpen, refreshAll } = useSecurity();
  const [pairingToken, setPairingToken] = useState('pair_8f93a0d1e4c7b2');
  const [copied, setCopied] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isPairingModalOpen) {
      api.generatePairingToken()
        .then(res => setPairingToken(res.pairing_token))
        .catch(() => setPairingToken('pair_' + Math.random().toString(36).substring(2, 12)));
    }
  }, [isPairingModalOpen]);

  if (!isPairingModalOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(pairingToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateAgentPair = async () => {
    await api.confirmPairing({
      user_id: 'usr_owner_demo',
      device_name: 'Dell G15 5530',
      device_type: 'laptop',
      manufacturer: 'Dell',
      model: 'G15 5530',
      os: 'Windows',
      os_version: '11 Home',
      agent_version: '1.4.2'
    });
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setIsPairingModalOpen(false);
      refreshAll();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl jelly-card p-7 border border-white/80 dark:border-white/10 shadow-2xl relative">
        <button
          onClick={() => setIsPairingModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="bubble-icon w-12 h-12 bubble-blue flex items-center justify-center shadow-sm">
            <QrCode className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Pair New Laptop Guard Agent</h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cryptographic Identity Verification</p>
          </div>
        </div>

        {isSuccess ? (
          <div className="py-12 text-center space-y-3">
            <div className="bubble-icon w-16 h-16 bubble-mint flex items-center justify-center mx-auto shadow-sm animate-bounce">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white">Device Successfully Paired!</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ed25519 device key exchanged and active.</p>
          </div>
        ) : (
          <>
            {/* Steps Visual */}
            <div className="grid grid-cols-3 gap-2 mb-5 text-[11px] text-center">
              <div className="p-3 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold inline-flex items-center justify-center mb-1 text-xs">1</span>
                <p className="text-slate-700 dark:text-slate-300 font-bold">Install Agent</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold inline-flex items-center justify-center mb-1 text-xs">2</span>
                <p className="text-slate-700 dark:text-slate-300 font-bold">Scan QR Code</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold inline-flex items-center justify-center mb-1 text-xs">3</span>
                <p className="text-slate-700 dark:text-slate-300 font-bold">Confirm Link</p>
              </div>
            </div>

            {/* Stylized QR Code Canvas */}
            <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-white text-slate-900 shadow-inner border border-slate-200/80 mb-4">
              <div className="w-44 h-44 bg-slate-900 rounded-2xl p-3 flex items-center justify-center relative overflow-hidden shadow-md">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-white">
                  <rect x="0" y="0" width="30" height="30" fill="#3B82F6" />
                  <rect x="5" y="5" width="20" height="20" fill="#0B0F19" />
                  <rect x="10" y="10" width="10" height="10" fill="#3B82F6" />

                  <rect x="70" y="0" width="30" height="30" fill="#3B82F6" />
                  <rect x="75" y="5" width="20" height="20" fill="#0B0F19" />
                  <rect x="80" y="10" width="10" height="10" fill="#3B82F6" />

                  <rect x="0" y="70" width="30" height="30" fill="#3B82F6" />
                  <rect x="5" y="75" width="20" height="20" fill="#0B0F19" />
                  <rect x="10" y="80" width="10" height="10" fill="#3B82F6" />

                  <rect x="40" y="10" width="10" height="10" />
                  <rect x="55" y="15" width="8" height="8" />
                  <rect x="35" y="35" width="30" height="30" fill="#3B82F6" />
                  <rect x="42" y="42" width="16" height="16" fill="#0B0F19" />
                  <rect x="40" y="75" width="12" height="12" />
                  <rect x="65" y="55" width="10" height="10" />
                  <rect x="80" y="75" width="15" height="15" />
                </svg>
              </div>
              <p className="text-[11px] font-bold text-slate-700 mt-2.5">
                Scan with LaptopGuard Mobile App or Desktop Agent
              </p>
            </div>

            {/* Token Copy Box */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/80 dark:bg-slate-900/90 border border-slate-200/60 dark:border-white/10 mb-5">
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 truncate max-w-[280px]">
                {pairingToken}
              </span>
              <button
                onClick={handleCopy}
                className="jelly-button flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-bold text-slate-700 dark:text-white transition-all cursor-pointer"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsPairingModalOpen(false)}
                className="jelly-button flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleSimulateAgentPair}
                className="jelly-button flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer"
              >
                Simulate Agent Connect
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
