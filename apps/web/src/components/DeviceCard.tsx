import React from 'react';
import {
  BatteryCharging,
  Battery,
  Wifi,
  MapPin,
  Camera,
  ShieldCheck,
  Clock,
  ChevronRight,
  Shield
} from 'lucide-react';
import { Device } from '../types';

interface DeviceCardProps {
  device: Device;
  onSelectDetails?: () => void;
  isPrimary?: boolean;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, onSelectDetails, isPrimary = false }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Protected':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/90 shadow-sm shadow-emerald-500/10';
      case 'Disarmed':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Warning':
      case 'Attention Required':
        return 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm';
      case 'Lost':
        return 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse shadow-sm';
      case 'Camera Active':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200 animate-pulse shadow-sm';
      case 'Offline':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div
      onClick={onSelectDetails}
      className="jelly-card p-6 sm:p-7 relative overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-lg group"
    >
      {/* Top Banner Row: Laptop visual + Title + Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-5">
          {/* 3D-styled Sleek Laptop Visual with Soft Ambient Cyan Glow */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-blue-400/20 rounded-2xl filter blur-xl -z-10 group-hover:bg-blue-400/30 transition-all" />
            <div className="w-24 h-20 sm:w-28 sm:h-22 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-2.5 flex flex-col justify-between border border-slate-700 shadow-xl shadow-slate-900/10">
              {/* Laptop Screen */}
              <div className="w-full h-11 sm:h-13 rounded-lg bg-gradient-to-br from-blue-600 via-cyan-500 to-indigo-700 p-1 flex items-center justify-center relative overflow-hidden shadow-inner">
                <div className="w-full h-full bg-blue-950/60 rounded flex items-center justify-center">
                  <Shield className="w-4 h-4 text-cyan-300 animate-pulse" />
                </div>
                <div className="absolute top-0.5 right-1 w-1 h-1 rounded-full bg-cyan-300" />
              </div>
              {/* Laptop Keyboard Deck Base */}
              <div className="w-full h-2 rounded bg-slate-700 flex items-center justify-center">
                <div className="w-5 h-0.5 rounded bg-slate-500" />
              </div>
            </div>
          </div>

          {/* Device Title & Details */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                {device.device_name}
              </h3>
              {isPrimary && (
                <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 shadow-sm">
                  PRIMARY
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {device.manufacturer} {device.model} • {device.os} {device.os_version || ''}
            </p>
          </div>
        </div>

        {/* Protection Status Badge */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${getStatusBadge(device.status)}`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{device.status}</span>
          </span>
        </div>
      </div>

      {/* 4 Floating Mini Info Cards (Reference Layout) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        {/* 1. Battery */}
        <div className="p-3.5 rounded-2xl bg-white/70 hover:bg-white border border-slate-200/80 shadow-sm transition-all">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-7 h-7 rounded-xl bubble-mint flex items-center justify-center flex-shrink-0">
              {device.is_charging ? (
                <BatteryCharging className="w-4 h-4 text-emerald-600" />
              ) : (
                <Battery className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <span className="text-slate-400 text-[11px] font-semibold">Battery</span>
          </div>
          <p className="text-sm font-extrabold text-slate-900 pl-1">
            {device.battery}%{' '}
            <span className="text-[11px] font-medium text-slate-500">
              {device.is_charging ? '(Charging)' : '(On Battery)'}
            </span>
          </p>
        </div>

        {/* 2. Wi-Fi Network */}
        <div className="p-3.5 rounded-2xl bg-white/70 hover:bg-white border border-slate-200/80 shadow-sm transition-all">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-7 h-7 rounded-xl bubble-cyan flex items-center justify-center flex-shrink-0">
              <Wifi className="w-4 h-4 text-cyan-600" />
            </div>
            <span className="text-slate-400 text-[11px] font-semibold">Wi-Fi Network</span>
          </div>
          <p className="text-sm font-extrabold text-slate-900 pl-1 truncate" title={device.current_ssid || 'No Connection'}>
            {device.current_ssid || 'Connected'}
          </p>
        </div>

        {/* 3. Approx. Location */}
        <div className="p-3.5 rounded-2xl bg-white/70 hover:bg-white border border-slate-200/80 shadow-sm transition-all">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-7 h-7 rounded-xl bubble-rose flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-slate-400 text-[11px] font-semibold">Approx. Location</span>
          </div>
          <p className="text-sm font-extrabold text-slate-900 pl-1 truncate">
            {device.last_location ? `${device.last_location.city}` : 'Colombo / Sri Lanka'}
          </p>
        </div>

        {/* 4. Live Camera */}
        <div className="p-3.5 rounded-2xl bg-white/70 hover:bg-white border border-slate-200/80 shadow-sm transition-all">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-7 h-7 rounded-xl bubble-violet flex items-center justify-center flex-shrink-0">
              <Camera className="w-4 h-4 text-violet-600" />
            </div>
            <span className="text-slate-400 text-[11px] font-semibold">Live Camera</span>
          </div>
          <p className="text-sm font-extrabold text-emerald-600 pl-1">
            Authorized & Ready
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Last sync: {new Date(device.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
        <div className="flex items-center gap-1 text-blue-600 font-bold hover:underline">
          <span>Manage Device Specifications</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
