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
  ExternalLink,
  Radio,
  Cpu,
  Clock,
  Volume2
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { DeviceCard } from '../components/DeviceCard';
import { QuickActions } from '../components/QuickActions';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { devices, selectedDevice, events, user, isAlarmActive } = useSecurity();

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
      
      {/* 1. Welcome Area with Live Telemetry Pulse & Abstract Liquid Glass Wave */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 px-1 relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50/90 border border-emerald-200/80 text-emerald-700 text-[10px] font-black tracking-wider uppercase shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sentinel Live • 500ms Watchdog</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              ID: {selectedDevice?.id || 'No Device Linked'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {timeGreeting}, <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent font-black">{userName}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Your hardware sentinels are armed with zero-delay power severance detection.
          </p>
        </div>

        {/* Live Sentinel Radar Telemetry Capsule */}
        <div className="flex items-center gap-3.5 ios-jelly-card px-4 py-2.5 shadow-sm">
          {/* Mini Rotating Radar Scanner */}
          <div className="relative w-10 h-10 rounded-full border border-blue-200/80 bg-blue-950/90 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
            {/* Concentric rings */}
            <div className="absolute inset-1.5 rounded-full border border-cyan-500/30" />
            <div className="absolute inset-3 rounded-full border border-cyan-500/40" />
            {/* Rotating sweep line */}
            <div className="absolute inset-0 radar-sweep-beam">
              <div className="w-1/2 h-1/2 bg-gradient-to-br from-cyan-400/50 to-transparent" />
            </div>
            {/* Ping dot */}
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-300 animate-ping" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-900">Perimeter Radar</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              Sri Lanka • Precision BSSID
            </p>
          </div>
        </div>
      </div>

      {/* 2. Four Floating iOS Jelly Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: Protected Devices */}
        <div className="ios-jelly-card p-4 sm:p-5 relative overflow-hidden transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="bubble-icon w-10 h-10 bubble-mint shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
              Active Defense
            </span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Protected Devices</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-sans">{protectedCount}</h3>
            <span className="text-[10px] sm:text-[11px] text-emerald-600 font-bold">100% Armed</span>
          </div>
        </div>

        {/* Card 2: Online Devices */}
        <div className="ios-jelly-card p-4 sm:p-5 relative overflow-hidden transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="bubble-icon w-10 h-10 bubble-cyan shadow-xs">
              <Wifi className="w-5 h-5 text-cyan-600" />
            </div>
            <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-xs">
              WSS Connected
            </span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Online Devices</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-sans">{onlineCount}</h3>
            <span className="text-[10px] sm:text-[11px] text-cyan-600 font-bold">Live Heartbeat</span>
          </div>
        </div>

        {/* Card 3: Security Alerts */}
        <div className="ios-jelly-card p-4 sm:p-5 relative overflow-hidden transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="bubble-icon w-10 h-10 bubble-amber shadow-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
              Watchdog Logs
            </span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Security Alerts</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-sans">{alertCount}</h3>
            <span className="text-[10px] sm:text-[11px] text-amber-600 font-bold">All Recorded</span>
          </div>
        </div>

        {/* Card 4: Lost Devices */}
        <div className="ios-jelly-card p-4 sm:p-5 relative overflow-hidden transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="bubble-icon w-10 h-10 bubble-rose shadow-xs">
              <AlertOctagon className="w-5 h-5 text-rose-500" />
            </div>
            <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 shadow-xs">
              {lostCount > 0 ? 'Urgent Tracking' : 'All Secured'}
            </span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Lost Devices</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-sans">{lostCount}</h3>
            <span className="text-[10px] sm:text-[11px] text-rose-500 font-bold">{lostCount > 0 ? 'Action Required' : '0 Lost'}</span>
          </div>
        </div>

      </div>

      {/* 3. Primary Guarded Device Card */}
      {selectedDevice ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Primary Guarded Device
              </h2>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <button
              onClick={() => onNavigate('device-detail')}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"
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

          {/* 4. Remote Security Actions Bar (iOS Jelly Bubble Buttons) */}
          <QuickActions
            onOpenLiveCamera={() => onNavigate('camera')}
            onOpenMap={() => onNavigate('map')}
          />
        </div>
      ) : (
        <div className="ios-jelly-card p-10 text-center text-slate-500">
          No paired devices available. Click "Pair New Device" in the sidebar to link your laptop.
        </div>
      )}

      {/* 5. Recent Security Timeline Card */}
      <div className="ios-jelly-card p-5 sm:p-7 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="bubble-icon w-8 h-8 bubble-blue shadow-xs">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Recent Security Timeline</h3>
              <p className="text-[11px] text-slate-500">Hardware watchdog and perimeter trigger logs</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('events')}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"
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
                  className="p-3 sm:p-3.5 rounded-2xl bg-white/70 hover:bg-white border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition-all shadow-xs hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className={`bubble-icon w-7 h-7 flex-shrink-0 ${bubbleClass}`}>
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
