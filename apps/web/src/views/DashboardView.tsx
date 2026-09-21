import React from 'react';
import {
  ShieldCheck,
  Wifi,
  AlertTriangle,
  AlertOctagon,
  Activity,
  ChevronRight,
  Shield,
  Zap,
  ExternalLink
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { DeviceCard } from '../components/DeviceCard';
import { QuickActions } from '../components/QuickActions';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { devices, selectedDevice, events, user } = useSecurity();

  // Metric counts
  const protectedCount = devices.filter(d => d.status === 'Protected').length;
  const onlineCount = devices.filter(d => d.status !== 'Offline').length;
  const alertCount = events.filter(e => e.severity === 'CRITICAL' || e.severity === 'WARNING').length;
  const lostCount = devices.filter(d => d.status === 'Lost').length;

  const recentEvents = events.slice(0, 5);

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const userName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Member';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Welcome Area with Abstract Liquid Wave Illustration */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 px-1 relative overflow-hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {timeGreeting}, <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent font-black">{userName}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Your devices are protected and secure.
          </p>
        </div>

        {/* Decorative Liquid Glass Wave (from Reference Image) */}
        <div className="hidden lg:block w-72 h-16 pointer-events-none opacity-80">
          <svg viewBox="0 0 300 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path
              d="M0 50C40 20 80 70 120 40C160 10 200 60 240 30C270 10 290 40 300 50V80H0V50Z"
              fill="url(#wave-grad-1)"
              opacity="0.35"
            />
            <path
              d="M0 60C50 30 100 80 150 45C200 15 250 65 300 40V80H0V60Z"
              fill="url(#wave-grad-2)"
              opacity="0.5"
            />
            <defs>
              <linearGradient id="wave-grad-1" x1="0" y1="0" x2="300" y2="80" gradientUnits="userSpaceOnUse">
                <stop stopColor="#93C5FD" />
                <stop offset="1" stopColor="#C4B5FD" />
              </linearGradient>
              <linearGradient id="wave-grad-2" x1="0" y1="0" x2="300" y2="80" gradientUnits="userSpaceOnUse">
                <stop stopColor="#67E8F9" />
                <stop offset="1" stopColor="#93C5FD" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* 2. Four Floating Jelly Summary Cards (Reference Layout) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Protected Devices */}
        <div className="jelly-card p-5 relative overflow-hidden transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bubble-mint flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active Defense
            </span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Protected Devices</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-3xl font-black text-slate-900 font-sans">{protectedCount}</h3>
            <span className="text-[11px] text-emerald-600 font-semibold">100% Armed</span>
          </div>
        </div>

        {/* Card 2: Online Devices */}
        <div className="jelly-card p-5 relative overflow-hidden transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bubble-cyan flex items-center justify-center shadow-sm">
              <Wifi className="w-5 h-5 text-cyan-600" />
            </div>
            <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
              WSS Connected
            </span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Online Devices</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-3xl font-black text-slate-900 font-sans">{onlineCount}</h3>
            <span className="text-[11px] text-cyan-600 font-semibold">Live Heartbeat</span>
          </div>
        </div>

        {/* Card 3: Security Alerts */}
        <div className="jelly-card p-5 relative overflow-hidden transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bubble-amber flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Pending Review
            </span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Security Alerts</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-3xl font-black text-slate-900 font-sans">{alertCount}</h3>
            <span className="text-[11px] text-amber-600 font-semibold">All Recorded</span>
          </div>
        </div>

        {/* Card 4: Lost Devices */}
        <div className="jelly-card p-5 relative overflow-hidden transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bubble-rose flex items-center justify-center shadow-sm">
              <AlertOctagon className="w-5 h-5 text-rose-500" />
            </div>
            <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
              {lostCount > 0 ? 'Urgent Tracking' : 'All Secured'}
            </span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Lost Devices</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-3xl font-black text-slate-900 font-sans">{lostCount}</h3>
            <span className="text-[11px] text-rose-500 font-semibold">{lostCount > 0 ? 'Action Required' : '0 Lost'}</span>
          </div>
        </div>
      </div>

      {/* 3. Primary Guarded Device Card */}
      {selectedDevice ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Primary Guarded Device</h2>
            <button
              onClick={() => onNavigate('device-detail')}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold"
            >
              <span>Manage Device Specifications</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <DeviceCard
            device={selectedDevice}
            isPrimary={true}
            onSelectDetails={() => onNavigate('device-detail')}
          />

          {/* 4. Remote Security Actions Bar (7 Bubble Buttons) */}
          <QuickActions
            onOpenLiveCamera={() => onNavigate('camera')}
            onOpenMap={() => onNavigate('map')}
          />
        </div>
      ) : (
        <div className="jelly-card p-10 text-center text-slate-500">
          No paired devices available. Click "Pair New Device" in the sidebar to link your laptop.
        </div>
      )}

      {/* 5. Recent Security Timeline Card (Reference Layout) */}
      <div className="jelly-card p-6 sm:p-7 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bubble-blue flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Recent Security Timeline</h3>
              <p className="text-[11px] text-slate-500">Latest activity signals from your devices</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('events')}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold"
          >
            <span>View Full Timeline ({events.length})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 pt-1">
          {recentEvents.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No security incidents recorded.</p>
          ) : (
            recentEvents.map((ev) => {
              const isCritical = ev.severity === 'CRITICAL';
              const isWarning = ev.severity === 'WARNING';
              const bubbleClass = isCritical ? 'bubble-rose' : isWarning ? 'bubble-amber' : 'bubble-mint';
              const textBadgeClass = isCritical
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : isWarning
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200';

              return (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-2xl bg-white/60 hover:bg-white border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition-all shadow-sm hover:shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${bubbleClass}`}>
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">{ev.event_type}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${textBadgeClass}`}>
                          {ev.severity}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5">{ev.description}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 self-end sm:self-center">
                    {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
