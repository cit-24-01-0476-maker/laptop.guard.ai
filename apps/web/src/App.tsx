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
import { AuthModal } from './components/Modals/AuthModal';
import { AutoUpdateBanner } from './components/AutoUpdateBanner';
import { IntroVideoModal } from './components/IntroVideoModal';
import { MasterAccessLock } from './components/MasterAccessLock';

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
  const { user, isAuthenticated, logoutUser, refreshAll } = useSecurity();
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

  // Master Access Lock (Owner PIN: 6728)
  const [isMasterUnlocked, setIsMasterUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('laptopguard_master_unlocked') === 'true';
  });

  const handleMasterRelock = () => {
    sessionStorage.removeItem('laptopguard_master_unlocked');
    setIsMasterUnlocked(false);
  };

  // ==========================================
  // MASTER ACCESS LOCK GATE (PIN: 6728)
  // Gating all Web & Mobile App interfaces
  // ==========================================
  if (!isMasterUnlocked) {
    return <MasterAccessLock onUnlock={() => setIsMasterUnlocked(true)} />;
  }

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
