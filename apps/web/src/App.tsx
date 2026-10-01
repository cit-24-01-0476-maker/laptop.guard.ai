import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { SecurityProvider, useSecurity } from './context/SecurityContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { DevicesView } from './views/DevicesView';
import { DeviceDetailView } from './views/DeviceDetailView';
import { MapView } from './views/MapView';
import { LiveCameraView } from './views/LiveCameraView';
import { EventsView } from './views/EventsView';
import { EvidenceView } from './views/EvidenceView';
import { NotificationsView } from './views/NotificationsView';
import { PrivacyCenterView } from './views/PrivacyCenterView';
import { SecuritySettingsView } from './views/SecuritySettingsView';
import { AccountView } from './views/AccountView';
import { LandingView } from './views/LandingView';
import { MobileView } from './views/MobileView';
import { MobileAuthView } from './views/MobileAuthView';

import { LockConfirmModal } from './components/Modals/LockConfirmModal';
import { AlarmTriggerModal } from './components/Modals/AlarmTriggerModal';
import { LostModeModal } from './components/Modals/LostModeModal';
import { CriticalAlertModal } from './components/Modals/CriticalAlertModal';
import { PairingModal } from './components/Modals/PairingModal';
import { AuthorizeBrowserModal } from './components/Modals/AuthorizeBrowserModal';
import { AuthModal } from './components/Modals/AuthModal';
import { AutoUpdateBanner } from './components/AutoUpdateBanner';
import { IntroVideoModal } from './components/IntroVideoModal';
import { MasterAccessLock } from './components/MasterAccessLock';
import { OWNER_ACCESS_STORAGE_KEY } from './config/ownerAccess';
import { api } from './services/api';

const OwnerPortalGate: React.FC<{ onUnlock: () => void; onBack: () => void }> = ({ onUnlock, onBack }) => {
  const [keyValue, setKeyValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const unlock = async () => {
    setIsVerifying(true);
    setError(null);
    try {
      await api.verifyOwnerAccess(keyValue);
    } catch (_) {
      setError('Invalid owner key');
      setIsVerifying(false);
      return;
    }
    sessionStorage.setItem(OWNER_ACCESS_STORAGE_KEY, 'true');
    setIsVerifying(false);
    onUnlock();
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950 p-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950">
          <LockConfirmModalIcon />
        </div>
        <h1 className="mt-5 text-2xl font-black">Private Owner Area</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          This dashboard is locked for the owner only. Enter the special key to continue.
        </p>
        <input
          value={keyValue}
          onChange={(event) => {
            setKeyValue(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void unlock();
          }}
          type="password"
          disabled={isVerifying}
          autoFocus
          placeholder="Owner key"
          className="mt-6 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white outline-none ring-cyan-400/20 placeholder:text-slate-500 focus:border-cyan-300 focus:ring-4"
        />
        {error && <p className="mt-3 text-xs font-black text-rose-300">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-slate-300 hover:bg-white/10"
          >
            Back
          </button>
          <button
            onClick={() => void unlock()}
            disabled={isVerifying}
            className="flex-1 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
          >
            {isVerifying ? 'Verifying...' : 'Unlock'}
          </button>
        </div>
      </div>
    </div>
  );
};

const LockConfirmModalIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="11" width="16" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

const checkIsAppMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  // 1. Running inside native Android / iOS Capacitor APK
  if (Capacitor.isNativePlatform()) return true;

  // 2. Explicit app query param or hash (configured in Capacitor server.url or direct app launch)
  const hash = window.location.hash;
  const searchParams = new URLSearchParams(window.location.search);
  if (
    hash === '#app' ||
    searchParams.get('app') === 'true' ||
    searchParams.get('mode') === 'app'
  ) {
    return true;
  }

  // 3. Standalone installed PWA mode
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  return false;
};

export const AppContent: React.FC = () => {
  const { user, isAuthenticated, logoutUser, refreshAll, isControllerTrusted, setIsAuthorizeBrowserModalOpen } = useSecurity();
  const [isAppMode, setIsAppMode] = useState<boolean>(checkIsAppMode);
  
  // Track device/viewport mode dynamically
  useEffect(() => {
    const handleCheck = () => {
      setIsAppMode(checkIsAppMode());
    };
    window.addEventListener('resize', handleCheck);
    window.addEventListener('hashchange', handleCheck);
    return () => {
      window.removeEventListener('resize', handleCheck);
      window.removeEventListener('hashchange', handleCheck);
    };
  }, []);

  const [currentView, setCurrentView] = useState<string>(() => {
    if (checkIsAppMode()) return 'mobile';
    return isAuthenticated ? 'dashboard' : 'landing';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [pendingTargetView, setPendingTargetView] = useState<string>('dashboard');
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('laptopguard_skip_intro');
  });

  const navigateToProtectedView = (targetView: string) => {
    if (isAuthenticated) {
      setCurrentView(targetView);
    } else {
      setPendingTargetView(targetView);
      setIsAuthModalOpen(true);
    }
  };

  const handleAuthSuccess = () => {
    refreshAll();
    if (isAppMode) {
      setCurrentView('mobile');
    } else {
      setCurrentView(pendingTargetView || 'dashboard');
    }
  };

  const handleLogout = () => {
    logoutUser();
    if (isAppMode) {
      setCurrentView('mobile');
    } else {
      setCurrentView('landing');
    }
  };

  // If App Mode is detected and view is set to landing, force mobile view
  useEffect(() => {
    if (isAppMode && currentView === 'landing') {
      setCurrentView('mobile');
    }
  }, [isAppMode, currentView]);

  // If user becomes authenticated on desktop and is on landing, can remain or go to dashboard
  useEffect(() => {
    if (!isAuthenticated && !isAppMode && currentView !== 'landing') {
      setCurrentView('landing');
      setIsAuthModalOpen(true);
    }
  }, [isAuthenticated, isAppMode, currentView]);

  // Master Access Lock (server-verified owner PIN)
  const [isMasterUnlocked, setIsMasterUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('laptopguard_master_unlocked') === 'true';
  });
  const [isOwnerPortalUnlocked, setIsOwnerPortalUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(OWNER_ACCESS_STORAGE_KEY) === 'true';
  });

  const handleMasterRelock = () => {
    sessionStorage.removeItem('laptopguard_master_unlocked');
    sessionStorage.removeItem(OWNER_ACCESS_STORAGE_KEY);
    setIsMasterUnlocked(false);
    setIsOwnerPortalUnlocked(false);
  };

  // ==========================================
  // 1. MOBILE APP MODE (Native APK or Mobile)
  // Bypasses the website completely!
  // ==========================================
  if (isAppMode) {
    // Unauthenticated: Dedicated Full-Screen Mobile Login Screen
    if (!isAuthenticated) {
      return (
        <>
          <IntroVideoModal isOpen={showIntro} onClose={() => setShowIntro(false)} />
          <MobileAuthView
            onSuccess={() => {
              refreshAll();
              setCurrentView('mobile');
            }}
          />
        </>
      );
    }

    // Authenticated: Security Passcode Gate
    if (!isMasterUnlocked) {
      return <MasterAccessLock onUnlock={() => setIsMasterUnlocked(true)} />;
    }

    // Authenticated Mobile App Dashboard
    if (currentView === 'mobile') {
      return (
        <>
          <IntroVideoModal isOpen={showIntro} onClose={() => setShowIntro(false)} />
          <MobileView
            onBackToLanding={handleLogout}
            onOpenDashboard={() => setCurrentView('dashboard')}
            onOpenIntro={() => setShowIntro(true)}
            onLockMasterAccess={handleMasterRelock}
          />
        </>
      );
    }
  }

  // ==========================================
  // 2. DESKTOP WEB EXPERIENCE
  // ==========================================
  if (currentView === 'landing') {
    return (
      <>
        <IntroVideoModal isOpen={showIntro} onClose={() => setShowIntro(false)} />
        <LandingView
          onLaunchConsole={() => navigateToProtectedView('dashboard')}
          onOpenMobileView={() => navigateToProtectedView('mobile')}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          onOpenIntro={() => setShowIntro(true)}
          onLockMasterAccess={handleMasterRelock}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  if (currentView === 'mobile') {
    if (!isAuthenticated) {
      return (
        <>
          <IntroVideoModal isOpen={showIntro} onClose={() => setShowIntro(false)} />
          <MobileAuthView
            onSuccess={() => {
              refreshAll();
              setCurrentView('mobile');
            }}
          />
        </>
      );
    }

    if (!isMasterUnlocked) {
      return <MasterAccessLock onUnlock={() => setIsMasterUnlocked(true)} />;
    }

    return (
      <>
        <IntroVideoModal isOpen={showIntro} onClose={() => setShowIntro(false)} />
        <MobileView
          onBackToLanding={() => setCurrentView('landing')}
          onOpenDashboard={() => setCurrentView('dashboard')}
          onOpenIntro={() => setShowIntro(true)}
          onLockMasterAccess={handleMasterRelock}
        />
      </>
    );
  }

  // Desktop Dashboard Views (Protected by Passcode)
  if (!isOwnerPortalUnlocked) {
    return (
      <OwnerPortalGate
        onUnlock={() => setIsOwnerPortalUnlocked(true)}
        onBack={() => setCurrentView('landing')}
      />
    );
  }

  // Desktop Dashboard Views (Protected by Passcode)
  if (!isMasterUnlocked) {
    return <MasterAccessLock onUnlock={() => setIsMasterUnlocked(true)} />;
  }

  // Desktop Dashboard Views
  const renderDashboardView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView onNavigate={(view) => setCurrentView(view)} />;
      case 'devices':
        return <DevicesView onSelectDevice={() => setCurrentView('device-detail')} />;
      case 'device-detail':
        return (
          <DeviceDetailView
            onBack={() => setCurrentView('devices')}
            onNavigateToCamera={() => setCurrentView('camera')}
          />
        );
      case 'map':
        return <MapView />;
      case 'camera':
        return <LiveCameraView />;
      case 'events':
        return <EventsView />;
      case 'evidence':
        return <EvidenceView />;
      case 'notifications':
        return <NotificationsView />;
      case 'privacy':
        return <PrivacyCenterView />;
      case 'security-settings':
        return <SecuritySettingsView />;
      case 'account':
        return <AccountView />;
      default:
        return <DashboardView onNavigate={(view) => setCurrentView(view)} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5FB] text-slate-800 relative selection:bg-blue-600 selection:text-white">
      {/* Soft Ambient Liquid Glow Mesh */}
      <div className="ambient-liquid-glow pointer-events-none">
        <div className="ambient-blob-1" />
        <div className="ambient-blob-2" />
        <div className="ambient-blob-3" />
      </div>

      {/* Top Floating Glass Navbar */}
      <div className="p-3 sm:p-4 lg:px-6 xl:px-8 z-30 w-full mx-auto max-w-[1920px]">
        <Navbar
          currentView={currentView}
          onNavigateHome={() => setCurrentView('landing')}
          onNavigateMobile={() => setCurrentView('mobile')}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          onLockMasterAccess={handleMasterRelock}
        />
      </div>

      {/* Untrusted Browser Security Warning Banner */}
      {isAuthenticated && !isControllerTrusted && currentView !== 'landing' && (
        <div className="mx-3 sm:mx-4 lg:mx-6 xl:mx-8 mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping flex-shrink-0" />
            <p className="font-medium">
              <strong className="font-extrabold">Untrusted Controller Session:</strong> This browser is in read-only observation mode. Remote security commands (Lock, Siren, Arm) require Step-Up Authorization.
            </p>
          </div>
          <button
            onClick={() => setIsAuthorizeBrowserModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold flex-shrink-0 cursor-pointer shadow-sm active:scale-95 transition-all text-[11px]"
          >
            Authorize This Browser Now
          </button>
        </div>
      )}

      {/* Main Floating Layout Container */}
      <div className="flex-1 flex w-full px-3 sm:px-4 lg:px-6 xl:px-8 pb-6 gap-5 z-10 max-w-[1920px] mx-auto">
        <Sidebar currentView={currentView} onNavigate={(view) => setCurrentView(view)} />

        <main className="flex-1 overflow-y-auto">
          {renderDashboardView()}
        </main>
      </div>

      {/* Global Modals */}
      <IntroVideoModal isOpen={showIntro} onClose={() => setShowIntro(false)} />
      <LockConfirmModal />
      <AlarmTriggerModal />
      <LostModeModal />
      <CriticalAlertModal
        onViewDevice={() => setCurrentView('device-detail')}
        onOpenLiveCamera={() => setCurrentView('camera')}
      />
      <PairingModal />
      <AuthorizeBrowserModal />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default function App() {
  return (
    <SecurityProvider>
      <AutoUpdateBanner />
      <AppContent />
    </SecurityProvider>
  );
}
