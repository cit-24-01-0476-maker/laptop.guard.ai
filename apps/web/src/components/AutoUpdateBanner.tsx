import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

const CURRENT_CLIENT_VERSION = '1.5.1';

export const AutoUpdateBanner: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const applyUpdate = useCallback(() => {
    setIsUpdating(true);
    // Unregister service workers if any to force clean asset download
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
    // Set updated version locally
    if (updateAvailable) {
      localStorage.setItem('laptopguard_client_version', updateAvailable);
    }
    // Hard reload with cache bust
    setTimeout(() => {
      window.location.reload();
    }, 800);
  }, [updateAvailable]);

  const checkForUpdates = useCallback(async () => {
    try {
      // Fetch version.json with anti-cache query param
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) return;

      const data = await res.json();
      const serverVersion = data.version;
      const localVersion = localStorage.getItem('laptopguard_client_version') || CURRENT_CLIENT_VERSION;

      if (serverVersion && serverVersion !== localVersion) {
        setUpdateAvailable(serverVersion);
        // Automatically apply update after 2.5 seconds if user is idle
        const timer = setTimeout(() => {
          applyUpdate();
        }, 2500);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      // Offline or network glitch, ignore silently
    }
  }, [applyUpdate]);

  useEffect(() => {
    // Initial check on load
    checkForUpdates();

    // Check periodically every 60 seconds
    const interval = setInterval(checkForUpdates, 60000);

    // Also check automatically when tab becomes visible (user returns to app)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkForUpdates]);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[92%] sm:w-auto animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="ios-frosted-nav px-4 py-2.5 rounded-full shadow-2xl flex items-center justify-between gap-3 border border-blue-400/50 bg-white/90 text-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 block sm:inline">
              ✨ Update v{updateAvailable} Available!
            </span>
            <span className="text-[10px] text-slate-500 sm:ml-1.5 hidden sm:inline">
              Next-Gen UI & Cyber Icon live.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={applyUpdate}
            disabled={isUpdating}
            className="ios-bubble-btn px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-70"
          >
            <RefreshCw className={`w-3 h-3 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'Updating...' : 'Update Now'}</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="w-5 h-5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-xs cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
