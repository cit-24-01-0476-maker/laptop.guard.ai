import React, { useState } from 'react';
import {
  Activity,
  Shield,
  Zap,
  Wifi,
  Lock,
  Volume2,
  AlertTriangle,
  Camera,
  MapPin,
  Clock,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';

export const EventsView: React.FC = () => {
  const { events, selectedDevice } = useSecurity();
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filteredEvents = events.filter((ev) => {
    if (filterSeverity === 'ALL') return true;
    return ev.severity === filterSeverity;
  });

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'ARMED':
      case 'DISARMED':
        return Shield;
      case 'POWER_DISCONNECT':
      case 'POWER_CONNECTED':
        return Zap;
      case 'WIFI_CHANGED':
        return Wifi;
      case 'REMOTE_LOCK':
        return Lock;
      case 'ALARM_TRIGGERED':
        return Volume2;
      case 'MOVEMENT_DETECTED':
        return AlertTriangle;
      case 'CAMERA_SESSION_STARTED':
      case 'SECURITY_SNAPSHOT_TAKEN':
        return Camera;
      default:
        return Activity;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Security Timeline & Audit</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable chronological record of monitored signals, lock events, and owner actions
          </p>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/80 border border-slate-200/80 text-xs shadow-sm">
          {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                filterSeverity === sev
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="jelly-card p-10 text-center text-slate-400 text-xs">
            No events match the selected filter.
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const Icon = getEventIcon(ev.event_type);
            const isCritical = ev.severity === 'CRITICAL';
            const isWarning = ev.severity === 'WARNING';
            const bubbleClass = isCritical ? 'bubble-rose' : isWarning ? 'bubble-amber' : 'bubble-mint';
            const badgeClass = isCritical
              ? 'bg-rose-50 text-rose-600 border-rose-200'
              : isWarning
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200';

            return (
              <div
                key={ev.id}
                className="jelly-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${bubbleClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                        {ev.event_type.replace(/_/g, ' ')}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                        {ev.severity}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {ev.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        {selectedDevice?.last_location ? `${selectedDevice.last_location.city}` : 'Colombo / Sri Lanka'}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                        ID: {ev.id}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="text-xs text-emerald-700 font-bold px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 shadow-sm">
                    Verified
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
