import React, { useState } from 'react';
import { Bell, Check, Trash2, ShieldAlert, Laptop, Camera, AlertOctagon, Info } from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { api } from '../services/api';

export const NotificationsView: React.FC = () => {
  const { notifications, refreshAll } = useSecurity();
  const [filterCategory, setFilterCategory] = useState('ALL');

  const filtered = notifications.filter((n) => {
    if (filterCategory === 'ALL') return true;
    return n.category === filterCategory;
  });

  const handleMarkRead = async (id: string) => {
    await api.markNotificationRead(id);
    refreshAll();
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    refreshAll();
  };

  const handleClear = async () => {
    await api.clearNotifications();
    refreshAll();
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'CRITICAL':
        return { icon: AlertOctagon, bubble: 'bubble-rose', color: 'text-rose-600 dark:text-rose-400' };
      case 'CAMERA':
        return { icon: Camera, bubble: 'bubble-cyan', color: 'text-cyan-600 dark:text-cyan-400' };
      case 'DEVICE':
        return { icon: Laptop, bubble: 'bubble-blue', color: 'text-blue-600 dark:text-blue-400' };
      case 'SECURITY':
        return { icon: ShieldAlert, bubble: 'bubble-amber', color: 'text-amber-600 dark:text-amber-400' };
      default:
        return { icon: Info, bubble: 'bubble-mint', color: 'text-emerald-600 dark:text-emerald-400' };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="jelly-pill px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/30 border border-blue-200/60 dark:border-blue-700/40">
              Live Alerts Dispatch
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Notification Center</h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Security dispatch notifications, environmental warnings, and device telemetry updates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            className="jelly-button flex items-center gap-1.5 py-2 px-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/10 text-blue-600 dark:text-blue-400 text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark All Read</span>
          </button>
          <button
            onClick={handleClear}
            className="jelly-button flex items-center gap-1.5 py-2 px-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Inbox</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {['ALL', 'CRITICAL', 'SECURITY', 'DEVICE', 'CAMERA', 'SYSTEM'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`jelly-pill px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              filterCategory === cat
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border-transparent'
                : 'bg-white/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-700/60 border border-slate-200/50 dark:border-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="jelly-card p-12 rounded-3xl text-center text-slate-500 dark:text-slate-400 text-xs">
            No notifications in this category.
          </div>
        ) : (
          filtered.map((n) => {
            const config = getCategoryConfig(n.category);
            const Icon = config.icon;
            return (
              <div
                key={n.id}
                className={`jelly-card p-4 rounded-2xl flex items-start justify-between gap-4 transition-all ${
                  n.is_read ? 'opacity-70 bg-white/50 dark:bg-slate-900/40' : 'bg-white/90 dark:bg-slate-900/90 shadow-md'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`bubble-icon w-10 h-10 ${config.bubble} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{n.title}</h4>
                      <span className="jelly-pill text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-white/10">
                        {n.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{n.body}</p>
                    <span className="text-[10px] font-medium text-slate-400 mt-1.5 block">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-400 dark:hover:text-cyan-400 flex-shrink-0 transition-colors cursor-pointer"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
