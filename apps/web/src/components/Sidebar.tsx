import React from 'react';
import {
  LayoutDashboard,
  Laptop,
  MapPin,
  Camera,
  Activity,
  FolderLock,
  Bell,
  Sliders,
  ShieldCheck,
  User,
  Plus,
  Shield,
  LogOut
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { notifications, setIsPairingModalOpen, user, logoutUser } = useSecurity();
  const unreadAlerts = notifications.filter(n => !n.is_read).length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'devices', label: 'Devices', icon: Laptop },
    { id: 'map', label: 'Map Radar', icon: MapPin },
    { id: 'camera', label: 'Live Camera', icon: Camera, badge: 'Live' },
    { id: 'events', label: 'Security Events', icon: Activity },
    { id: 'evidence', label: 'Evidence Vault', icon: FolderLock },
    { id: 'notifications', label: 'Notifications', icon: Bell, count: unreadAlerts },
    { id: 'security-settings', label: 'Security', icon: Sliders },
    { id: 'privacy', label: 'Privacy Center', icon: ShieldCheck },
    { id: 'account', label: 'Account', icon: User },
  ];

  return (
    <aside className="w-64 jelly-card p-3.5 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-6.5rem)] shadow-sm">
      <div className="space-y-4">
        {/* Navigation links */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:scale-105'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 shadow-sm">
                    {item.badge}
                  </span>
                )}
                {item.count !== undefined && item.count > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Security Status, Pair Device & Account */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        {/* Subtle Security Badge */}
        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50/70 to-cyan-50/70 border border-blue-100/80 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-900 leading-tight">Protected Device</p>
            <p className="text-[10px] text-slate-500">Hardware Sentinel Active</p>
          </div>
        </div>

        {/* Quick Add Device Bubble Button */}
        <button
          onClick={() => setIsPairingModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-white hover:bg-blue-50/80 border border-slate-200/90 text-blue-600 hover:text-blue-700 font-bold text-xs tracking-wide transition-all shadow-sm hover:shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Pair New Device</span>
        </button>

        {/* User Profile Capsule & Sign Out */}
        {user && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                {user.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'ME'}
              </div>
              <div className="truncate text-left">
                <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{user.full_name || 'Account'}</p>
                <p className="text-[9px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                logoutUser();
                onNavigate('landing');
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Sign Out / Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
