import React, { useState } from 'react';
import { Sliders, Shield, Zap, Wifi, AlertTriangle, KeyRound, Check } from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';

export const SecuritySettingsView: React.FC = () => {
  const { selectedDevice } = useSecurity();
  const [securityLevel, setSecurityLevel] = useState<'Low' | 'Balanced' | 'High'>('Balanced');
  const [movementAlert, setMovementAlert] = useState(true);
  const [networkAlert, setNetworkAlert] = useState(true);
  const [powerAlert, setPowerAlert] = useState(true);
  const [failedLoginAlert, setFailedLoginAlert] = useState(true);
  const [autoSnapshotOnAlarm, setAutoSnapshotOnAlarm] = useState(true);
  const [retentionDays, setRetentionDays] = useState(7);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="jelly-pill px-2.5 py-0.5 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50/80 dark:bg-cyan-900/30 border border-cyan-200/60 dark:border-cyan-700/40">
              Agent Policies
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Security Defense Configuration</h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Configure automated alarm triggers, hardware watchdogs, and threat sensitivity
          </p>
        </div>

        <button
          onClick={handleSave}
          className="jelly-button flex items-center gap-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>{saved ? 'Saved Successfully!' : 'Save Configuration'}</span>
        </button>
      </div>

      {/* Security Levels Selector */}
      <div className="jelly-card p-6 rounded-3xl space-y-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Overall Security Level</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Determines how aggressively the laptop agent reports physical and environmental state changes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Low */}
          <div
            onClick={() => setSecurityLevel('Low')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${
              securityLevel === 'Low'
                ? 'bg-blue-50/80 dark:bg-blue-900/30 border-blue-500 text-slate-900 dark:text-white shadow-md'
                : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <span className="font-bold text-sm block mb-1">Low Defense</span>
            <p className="text-xs text-slate-500 dark:text-slate-300">Important alerts only. Reduces background telemetry.</p>
          </div>

          {/* Balanced */}
          <div
            onClick={() => setSecurityLevel('Balanced')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${
              securityLevel === 'Balanced'
                ? 'bg-blue-50/80 dark:bg-blue-900/30 border-blue-500 text-slate-900 dark:text-white shadow-md'
                : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-blue-600 dark:text-blue-400">Balanced (Default)</span>
              <span className="jelly-pill text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                Recommended
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-300">Movement, network change, power disconnect, and failed login alerts.</p>
          </div>

          {/* High */}
          <div
            onClick={() => setSecurityLevel('High')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${
              securityLevel === 'High'
                ? 'bg-blue-50/80 dark:bg-blue-900/30 border-blue-500 text-slate-900 dark:text-white shadow-md'
                : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <span className="font-bold text-sm block mb-1">High Sensitivity</span>
            <p className="text-xs text-slate-500 dark:text-slate-300">All supported signals, rapid location refreshes, and instant snapshot on tamper.</p>
          </div>
        </div>
      </div>

      {/* Sensor & Trigger Toggles */}
      <div className="jelly-card p-6 rounded-3xl space-y-4">
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Environmental Hardware Watchdogs</h3>

        <div className="space-y-3">
          {/* Power Disconnect */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5">
            <div className="flex items-center gap-3.5">
              <div className="bubble-icon w-10 h-10 bubble-amber flex items-center justify-center shadow-sm">
                <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Power Cable Disconnection Alert</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Trigger immediate warning when AC charger is unplugged while armed (500ms Win32 watchdog).</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={powerAlert}
              onChange={(e) => setPowerAlert(e.target.checked)}
              className="w-5 h-5 accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Network Change */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5">
            <div className="flex items-center gap-3.5">
              <div className="bubble-icon w-10 h-10 bubble-cyan flex items-center justify-center shadow-sm">
                <Wifi className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Wi-Fi Network / SSID Transition Alert</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Alert if the laptop connects to an unfamiliar hotspot or drops Wi-Fi.</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={networkAlert}
              onChange={(e) => setNetworkAlert(e.target.checked)}
              className="w-5 h-5 accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Movement Sensor */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5">
            <div className="flex items-center gap-3.5">
              <div className="bubble-icon w-10 h-10 bubble-rose flex items-center justify-center shadow-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Physical Movement / Accelerometer</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Report motion when supported; truthful hardware fallback active.</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={movementAlert}
              onChange={(e) => setMovementAlert(e.target.checked)}
              className="w-5 h-5 accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Failed Login */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5">
            <div className="flex items-center gap-3.5">
              <div className="bubble-icon w-10 h-10 bubble-violet flex items-center justify-center shadow-sm">
                <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Failed Windows Sign-In Alerts</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Notify after repeated incorrect password or PIN attempts.</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={failedLoginAlert}
              onChange={(e) => setFailedLoginAlert(e.target.checked)}
              className="w-5 h-5 accent-blue-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Retention Policy */}
      <div className="jelly-card p-6 rounded-3xl space-y-3">
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Evidence Retention Policy</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Automated deletion cycle for evidence stored in the encrypted cloud vault.</p>

        <div className="flex flex-wrap gap-3 pt-1">
          {[1, 7, 30, -1].map((days) => (
            <button
              key={days}
              onClick={() => setRetentionDays(days)}
              className={`jelly-pill px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                retentionDays === days
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border-transparent'
                  : 'bg-white/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-700/60 border border-slate-200/50 dark:border-white/10'
              }`}
            >
              {days === -1 ? 'Manual Purge Only' : `${days} Day${days > 1 ? 's' : ''}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
