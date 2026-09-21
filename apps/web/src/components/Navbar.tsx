import React, { useState } from 'react';
import { Shield, Bell, Moon, Sun, Search, VolumeX, Home, Smartphone, LogOut, ChevronDown, User as UserIcon } from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { api } from '../services/api';

interface NavbarProps {
  currentView: string;
  onNavigateHome?: () => void;
  onNavigateMobile?: () => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigateHome, onNavigateMobile, onOpenAuth, onLogout }) => {
  const {
    isWsConnected,
    theme,
    toggleTheme,
    notifications,
    refreshAll,
    isAlarmActive,
    selectedDevice,
    stopAlarm,
    user,
    isAuthenticated,
    logoutUser
  } = useSecurity();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    refreshAll();
  };

  const handleClearNotifications = async () => {
    await api.clearNotifications();
    refreshAll();
  };

  return (
    <header className="h-18 px-5 sm:px-6 jelly-card flex items-center justify-between shadow-sm">
      {/* 1. Left Brand */}
      <div
        onClick={onNavigateHome}
        className="flex items-center gap-3 cursor-pointer group"
        title="Go to Intro Website"
      >
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
          <Shield className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-tight text-lg text-slate-900 font-sans">
              LaptopGuard<span className="text-blue-600 font-mono text-sm ml-1 px-1.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200">AI</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 tracking-wider uppercase font-medium hidden sm:block">
            Protect Your Laptop. Wherever You Go.
          </p>
        </div>
      </div>

      {/* 2. Center Pill Search Bar (iOS Floating Bubble Style) */}
      <div className="hidden md:flex items-center gap-2.5 bg-white/70 hover:bg-white/95 focus-within:bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all border border-slate-200/90 rounded-full px-4 py-2 w-72 lg:w-96 shadow-sm">
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search devices, events or settings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none text-xs text-slate-700 placeholder-slate-400 focus:outline-none w-full"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-600">
            ×
          </button>
        )}
      </div>

      {/* 3. Right Controls */}
      <div className="flex items-center gap-3">
        {/* Live Sentinel Jelly Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50/90 border border-emerald-200/80 text-xs font-semibold text-emerald-700 shadow-sm">
          <span className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className="hidden sm:inline font-sans">
            {isWsConnected ? 'Cloud Guard Live' : 'Reconnecting...'}
          </span>
        </div>

        {/* Emergency Stop Siren Pill (Visible when alarm sounds) */}
        {isAlarmActive && selectedDevice && (
          <button
            onClick={() => stopAlarm(selectedDevice.id)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold border border-rose-400 shadow-lg shadow-rose-500/30 animate-pulse transition-all cursor-pointer"
            title="Siren is actively ringing! Click to silence immediately."
          >
            <VolumeX className="w-4 h-4" />
            <span>SILENCE SIREN</span>
          </button>
        )}

        {/* Home Landing Page & Mobile Remote Nav Buttons */}
        {onNavigateHome && (
          <button
            onClick={onNavigateHome}
            className="hidden md:flex items-center gap-1.5 py-1.5 px-3 rounded-2xl bg-white/80 hover:bg-white text-slate-700 text-xs font-bold border border-slate-200/80 shadow-sm cursor-pointer"
            title="Go to Intro / Landing Website"
          >
            <Home className="w-3.5 h-3.5 text-blue-600" />
            <span>Intro Site</span>
          </button>
        )}

        {onNavigateMobile && (
          <button
            onClick={onNavigateMobile}
            className="hidden sm:flex items-center gap-1.5 py-1.5 px-3 rounded-2xl bg-white/80 hover:bg-white text-slate-700 text-xs font-bold border border-slate-200/80 shadow-sm cursor-pointer"
            title="Open Phone Controller View"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            <span>Phone Remote</span>
          </button>
        )}

        {/* Theme Toggle Bubble */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-full bg-white/80 hover:bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-blue-600 shadow-sm transition-all"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Bubble Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-full bg-white/80 hover:bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-blue-600 shadow-sm transition-all relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl jelly-card shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2 border border-slate-200/80">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-sm text-slate-900">Security Alerts</h4>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:underline px-2 py-1 font-medium">
                    Mark Read
                  </button>
                  <button onClick={handleClearNotifications} className="text-xs text-rose-500 hover:underline px-2 py-1 font-medium">
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 py-3">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No active security notifications.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border text-xs transition-colors ${
                        n.is_read
                          ? 'bg-slate-50/70 border-slate-100 text-slate-500'
                          : 'bg-blue-50/80 border-blue-200/80 text-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-slate-900">{n.title}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="mt-1 leading-relaxed text-slate-600">{n.body}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Bubble Capsule & Dropdown */}
        <div className="relative">
          <div
            onClick={() => {
              if (isAuthenticated) {
                setShowUserDropdown(!showUserDropdown);
              } else if (onOpenAuth) {
                onOpenAuth();
              }
            }}
            className="flex items-center gap-2.5 pl-2 border-l border-slate-200/80 cursor-pointer group"
            title={isAuthenticated ? 'Open Account Menu' : 'Sign In'}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-bold text-xs text-white shadow-sm group-hover:scale-105 transition-transform">
              {user ? (user.full_name?.substring(0, 2).toUpperCase() || 'OP') : '👤'}
            </div>
            <div className="hidden lg:block text-left">
              <div className="flex items-center gap-1">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {user ? (user.full_name || 'My Account') : 'Sign In'}
                </p>
                {isAuthenticated && <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />}
              </div>
              <p className="text-[10px] text-blue-600 font-bold group-hover:underline">
                {isAuthenticated ? 'Active Sentinel' : 'Connect Cloud'}
              </p>
            </div>
          </div>

          {/* User Profile Dropdown Menu */}
          {showUserDropdown && isAuthenticated && (
            <div className="absolute right-0 mt-3 w-64 rounded-2xl jelly-card shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2 border border-slate-200/80">
              <div className="pb-3 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                  {user ? (user.full_name?.substring(0, 2).toUpperCase() || 'OP') : 'OP'}
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-xs text-slate-900 truncate">{user?.full_name || 'Owner'}</h4>
                  <p className="text-[10px] text-slate-500 truncate">{user?.email || 'user@laptopguard.ai'}</p>
                </div>
              </div>

              <div className="py-2 space-y-1">
                <div className="px-2 py-1.5 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-700 font-medium flex items-center justify-between">
                  <span>Cloud Tier</span>
                  <span className="font-bold uppercase text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-md">Pro SaaS</span>
                </div>

                {onOpenAuth && (
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenAuth();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-100/80 font-medium transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>Switch Account</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    logoutUser();
                    if (onLogout) onLogout();
                    else if (onNavigateHome) onNavigateHome();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 font-bold transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out / Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
