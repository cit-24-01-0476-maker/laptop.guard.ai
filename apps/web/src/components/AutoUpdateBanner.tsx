import React, { useEffect, useCallback, useRef } from 'react';

const CURRENT_CLIENT_VERSION = '1.6.1';

/**
 * Silent Auto-Updater: NO banner, NO "update available" message.
 * Detects new version from /version.json → silently clears caches → reloads.
 * User sees nothing — page just refreshes with newest code.
 */
export const AutoUpdateBanner: React.FC = () => {
  const hasApplied = useRef(false);

  const silentUpdate = useCallback((newVersion: string) => {
    if (hasApplied.current) return;
    hasApplied.current = true;

    // Unregister service workers to clear cached assets
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }

    // Store new version so we don't loop
    localStorage.setItem('laptopguard_client_version', newVersion);

    // Silent hard reload — user won't see any banner
    window.location.reload();
  }, []);

  const checkForUpdates = useCallback(async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) return;

      const data = await res.json();
      const serverVersion = data.version;
      const localVersion = localStorage.getItem('laptopguard_client_version') || CURRENT_CLIENT_VERSION;

      if (serverVersion && serverVersion !== localVersion) {
        // Silently apply update — no banner, no user interaction needed
        silentUpdate(serverVersion);
      }
    } catch {
      // Offline or network glitch — silently ignore
    }
  }, [silentUpdate]);

  useEffect(() => {
    // Check on load after a short delay (let app render first)
    const initialTimer = setTimeout(checkForUpdates, 2000);

    // Check periodically every 45 seconds
    const interval = setInterval(checkForUpdates, 45000);

    // Also check when tab becomes visible (user returns to app)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkForUpdates]);

  // Render nothing — completely invisible silent updater
  return null;
};
