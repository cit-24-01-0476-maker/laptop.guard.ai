import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Camera,
  Mic,
  MapPin,
  FolderLock,
  Download,
  Trash2,
  AlertTriangle,
  History,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { api } from '../services/api';
import { AuditLogItem } from '../types';

export const PrivacyCenterView: React.FC = () => {
  const { selectedDevice, refreshAll } = useSecurity();
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [purgedMessage, setPurgedMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getAuditTrail().then(setAuditLogs).catch(() => {});
  }, []);

  const handleDeleteAllEvidence = async () => {
    if (!selectedDevice) return;
    if (confirm('Are you sure you want to permanently erase all stored evidence from the cloud?')) {
      const res = await api.deleteAllEvidence(selectedDevice.id);
      setPurgedMessage(res.message);
      setTimeout(() => setPurgedMessage(null), 3500);
      refreshAll();
    }
  };

  const handleDownloadData = async () => {
    const data = await api.exportUserData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laptopguard_privacy_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="bubble-icon w-12 h-12 bubble-mint flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="jelly-pill px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-900/30 border border-emerald-200/60 dark:border-emerald-700/40">
                Data Sovereignty
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Privacy & Trust Center</h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Strict owner authorization rules, non-covert guarantees, and cryptographically verified audit trails
            </p>
          </div>
        </div>
      </div>

      {purgedMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold animate-in fade-in shadow-sm">
          {purgedMessage}
        </div>
      )}

      {/* Permissions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Camera Permission Card */}
        <div className="jelly-card p-5 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="bubble-icon w-8 h-8 bubble-cyan flex items-center justify-center">
                <Camera className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">Camera Privacy</span>
            </div>
            <span className="jelly-pill px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/50">
              Authorized
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Active only during authorized live sessions. When active, laptop illuminates the physical camera LED.
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Never covert • 5-min session cap</span>
          </div>
        </div>

        {/* Microphone Permission Card */}
        <div className="jelly-card p-5 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="bubble-icon w-8 h-8 bubble-violet flex items-center justify-center">
                <Mic className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">Microphone</span>
            </div>
            <span className="jelly-pill px-2.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              Disabled
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Audio recording is disabled by default to prevent continuous background eavesdropping.
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <XCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Zero ambient eavesdropping</span>
          </div>
        </div>

        {/* Location Privacy */}
        <div className="jelly-card p-5 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="bubble-icon w-8 h-8 bubble-rose flex items-center justify-center">
                <MapPin className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">Location Radar</span>
            </div>
            <span className="jelly-pill px-2.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50">
              Accurate Radius
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Resolved via Wi-Fi triangulation and public IP egress. Accurate radius circle is displayed on map.
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
            <span>On-demand polling only</span>
          </div>
        </div>
      </div>

      {/* User Data Rights & Actions */}
      <div className="jelly-card p-6 rounded-3xl space-y-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">User Rights & Cryptographic Purge</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            You maintain full sovereignty over telemetry and evidence files. All captured snapshots can be exported or permanently erased.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            onClick={handleDownloadData}
            className="jelly-button flex items-center gap-2 py-2.5 px-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 hover:bg-white text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/60 dark:border-white/10 shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Download Account Data (GDPR JSON)</span>
          </button>

          <button
            onClick={handleDeleteAllEvidence}
            className="jelly-button flex items-center gap-2 py-2.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete All Stored Evidence</span>
          </button>
        </div>
      </div>

      {/* Audit Trail Log */}
      <div className="jelly-card p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-2.5 pb-2">
          <div className="bubble-icon w-8 h-8 bubble-cyan flex items-center justify-center shadow-sm">
            <History className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Sensitive Action Audit Trail</h3>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No audit records found.</p>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{log.action}</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {JSON.stringify(log.details)}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
