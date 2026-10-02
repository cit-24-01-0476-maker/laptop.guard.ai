import React, { useEffect, useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';

const CURRENT_CLIENT_VERSION = '2.0.4';

/**
 * Robust Silent Auto-Updater:
 * - NO banners, NO spinners, NO repeated reloads
 * - Strict session guard prevents more than 1 reload per app session
 * - Automatically keeps localStorage in sync with CURRENT_CLIENT_VERSION
 */
export const AutoUpdateBanner: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('Checking secure update...');

  const silentUpdate = useCallback((newVersion: string) => {
    // Session-level circuit breaker: NEVER reload more than once per app run
    if (sessionStorage.getItem('laptopguard_update_applied')) {
      return;
    }
    sessionStorage.setItem('laptopguard_update_applied', 'true');
    setIsUpdating(true);
    setProgress(18);
    setPhase(`Downloading web controller v${newVersion}...`);
    localStorage.setItem('laptopguard_client_version', newVersion);

    // Unregister service workers if any
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      }).catch(() => {});
    }

    // Single graceful reload with cache bust
    setTimeout(() => {
      setProgress(72);
      setPhase('Installing update and restarting...');
    }, 450);
    setTimeout(() => {
      setProgress(100);
      window.location.reload();
    }, 1100);
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      return;
    }
    // If already updated in this session, do nothing
    if (sessionStorage.getItem('laptopguard_update_applied')) {
      return;
    }

    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) return;

      const data = await res.json();
      const serverVersion = data.latest_version || data.version;
      const currentStored = localStorage.getItem('laptopguard_client_version');

      // If no stored version or stored version is outdated, check against CURRENT_CLIENT_VERSION first
      if (!currentStored) {
        localStorage.setItem('laptopguard_client_version', CURRENT_CLIENT_VERSION);
        return;
      }

      // Only reload if server version is genuinely newer than CURRENT_CLIENT_VERSION
      if (serverVersion && serverVersion !== CURRENT_CLIENT_VERSION && serverVersion !== currentStored) {
        silentUpdate(serverVersion);
      }
    } catch {
      // Network glitch or offline — do nothing
    }
  }, [silentUpdate]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      return;
    }

    // Ensure localStorage has at least CURRENT_CLIENT_VERSION
    const currentStored = localStorage.getItem('laptopguard_client_version');
    if (!currentStored || currentStored < CURRENT_CLIENT_VERSION) {
      localStorage.setItem('laptopguard_client_version', CURRENT_CLIENT_VERSION);
    }

    // Check once 5 seconds after app has fully loaded and stabilized
    const initialTimer = setTimeout(checkForUpdates, 5000);

    // Check at relaxed intervals (every 10 minutes)
    const interval = setInterval(checkForUpdates, 600000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [checkForUpdates]);

  if (!isUpdating) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/80 p-4 text-slate-950 backdrop-blur-xl">
      <div className="w-full max-w-sm rounded-[32px] border border-white/20 bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white shadow-lg shadow-blue-500/30">
          <span className="h-7 w-7 rounded-full border-4 border-white/40 border-t-white animate-spin" />
        </div>
        <h3 className="text-lg font-black">LaptopGuard Auto Update</h3>
        <p className="mt-1 text-xs font-semibold text-slate-500">{phase}</p>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${Math.max(5, progress)}%` }}
          />
        </div>
        <p className="mt-4 text-[11px] leading-5 text-slate-500">
          Pairing, account session, and trusted controller data stay saved.
        </p>
      </div>
    </div>
  );
};
