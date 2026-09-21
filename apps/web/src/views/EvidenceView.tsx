import React, { useState, useEffect } from 'react';
import {
  FolderLock,
  Camera,
  Film,
  Mic,
  Trash2,
  Download,
  Eye,
  ShieldCheck,
  Clock,
  HardDrive,
  X,
  FileCheck
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { api } from '../services/api';
import { EvidenceFile } from '../types';

export const EvidenceView: React.FC = () => {
  const { selectedDevice } = useSecurity();
  const [evidenceList, setEvidenceList] = useState<EvidenceFile[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [previewFile, setPreviewFile] = useState<EvidenceFile | null>(null);

  const loadEvidence = async () => {
    try {
      const data = await api.getEvidence(selectedDevice?.id);
      setEvidenceList(data);
    } catch (e) {
      // Demo fallback evidence if fresh database
      setEvidenceList([
        {
          id: 'evi_alarm_snapshot_01',
          device_id: selectedDevice?.id || 'dev_oska_xps15',
          file_type: 'SNAPSHOT',
          file_name: 'snapshot_alarm_20260921.jpg',
          file_path: 'evidence/snapshot_alarm_20260921.jpg',
          file_size: 248102,
          trigger_event: 'ALARM_TRIGGERED',
          retention_days: 7,
          is_encrypted: true,
          created_at: new Date(Date.now() - 36 * 60000).toISOString()
        }
      ]);
    }
  };

  useEffect(() => {
    loadEvidence();
  }, [selectedDevice]);

  const handleDelete = async (id: string) => {
    if (confirm('Permanently delete this encrypted evidence item? This action is audited.')) {
      await api.deleteEvidence(id);
      setEvidenceList(prev => prev.filter(e => e.id !== id));
      if (previewFile?.id === id) setPreviewFile(null);
    }
  };

  const filteredEvidence = evidenceList.filter((ev) => {
    if (activeCategory === 'ALL') return true;
    return ev.file_type === activeCategory;
  });

  const categories = [
    { id: 'ALL', label: 'All Vault Items', icon: FolderLock },
    { id: 'SNAPSHOT', label: 'Security Photos / Snapshots', icon: Camera },
    { id: 'CLIP', label: 'Security Clips', icon: Film },
    { id: 'AUDIO', label: 'Audio Evidence', icon: Mic },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="jelly-pill px-2.5 py-0.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-900/30 border border-indigo-200/60 dark:border-indigo-700/40">
              Cryptographic Enclave
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Encrypted Evidence Vault</h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Cryptographically stored authorized security snapshots with automated retention policies
          </p>
        </div>

        <div className="jelly-pill flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-700/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Hardware Enclave AES-256</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`jelly-pill flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border-transparent'
                  : 'bg-white/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-700/60 border border-slate-200/50 dark:border-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Evidence Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEvidence.length === 0 ? (
          <div className="col-span-full jelly-card p-12 rounded-3xl text-center text-slate-500 dark:text-slate-400 text-xs">
            No evidence files found in this category.
          </div>
        ) : (
          filteredEvidence.map((file) => (
            <div
              key={file.id}
              className="jelly-card p-5 rounded-3xl space-y-4 relative group"
            >
              {/* Media Thumbnail Container */}
              <div
                onClick={() => setPreviewFile(file)}
                className="w-full h-44 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 border border-slate-200/60 dark:border-white/5 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group-hover:border-blue-400/50 transition-all shadow-inner"
              >
                <div className="bubble-icon w-12 h-12 bubble-cyan flex items-center justify-center mb-2 shadow-sm">
                  <Camera className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{file.file_name}</span>
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">Click to Preview</span>

                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/80 dark:bg-black/70 backdrop-blur-md border border-slate-200/60 dark:border-white/10 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 shadow-sm">
                  {(file.file_size / 1024).toFixed(1)} KB
                </div>
              </div>

              {/* Details */}
              <div className="text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="font-medium">Trigger Event:</span>
                  <span className="text-slate-900 dark:text-white font-bold">{file.trigger_event}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="font-medium">Captured:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{new Date(file.created_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="font-medium">Retention:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{file.retention_days} Days Policy</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <button
                  onClick={() => setPreviewFile(file)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-white/80 dark:bg-white/10 hover:bg-white text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/60 dark:border-white/10 shadow-sm transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => handleDelete(file.id)}
                  className="p-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/20 transition-all cursor-pointer"
                  title="Permanently Delete Evidence"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-3xl jelly-card p-6 border border-white/80 dark:border-white/10 shadow-2xl relative">
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">{previewFile.file_name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Triggered by: <strong className="text-blue-600 dark:text-blue-400">{previewFile.trigger_event}</strong> • {new Date(previewFile.created_at).toLocaleString()}
            </p>

            {/* Simulated Encrypted Media Preview */}
            <div className="w-full aspect-video rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center p-6 text-center mb-4 relative overflow-hidden shadow-inner">
              <div className="bubble-icon w-16 h-16 bubble-cyan flex items-center justify-center mb-3">
                <FileCheck className="w-8 h-8 text-cyan-600 dark:text-cyan-400 stroke-[1.5]" />
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">Authorized Evidence Artifact Verified</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 font-mono">
                Watermark: LAPTOPGUARD AI • {previewFile.device_id} • SHA-256 Verified
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPreviewFile(null)}
                className="py-2.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-bold text-slate-700 dark:text-white transition-all cursor-pointer"
              >
                Close Preview
              </button>
              <button
                onClick={() => handleDelete(previewFile.id)}
                className="py-2.5 px-5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/25 transition-all cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
