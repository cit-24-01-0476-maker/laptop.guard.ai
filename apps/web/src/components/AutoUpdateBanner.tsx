import React, { useEffect, useCallback } from 'react';

const CURRENT_CLIENT_VERSION = '1.6.1';

/**
 * Robust Silent Auto-Updater:
 * - NO banners, NO spinners, NO repeated reloads
 * - Strict session guard prevents more than 1 reload per app session
 * - Automatically keeps localStorage in sync with CURRENT_CLIENT_VERSION
 */
export const AutoUpdateBanner: React.FC = () => {
  const silentUpdate = useCallback((newVersion: string) => {
    // Session-level circuit breaker: NEVER reload more than once per app run
    if (sessionStorage.getItem('laptopguard_update_applied')) {
      return;
    }
    sessionStorage.setItem('laptopguard_update_applied', 'true');
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
    window.location.reload();
  }, []);

  const checkForUpdates = useCallback(async () => {
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
      const serverVersion = data.version;
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

  return null;
};
