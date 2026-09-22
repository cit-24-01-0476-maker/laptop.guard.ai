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

const checkIsAppMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform()) return true;
  const hash = window.location.hash;
  const searchParams = new URLSearchParams(window.location.search);
  if (
    hash === '#mobile' ||
    hash === '#app' ||
    searchParams.get('view') === 'mobile' ||
    searchParams.get('app') === 'true'
  ) {
    return true;
  }
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  if (
    window.innerWidth <= 768 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  ) {
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

  // ==========================================
  // 1. MOBILE APP MODE (Native APK or Mobile)
  // Bypasses the website completely!
  // ==========================================
  if (isAppMode) {
    // Unauthenticated: Dedicated Full-Screen Mobile Login Screen
    if (!isAuthenticated) {
      return (
        <MobileAuthView
          onSuccess={() => {
            refreshAll();
            setCurrentView('mobile');
          }}
        />
      );
    }

    // Authenticated Mobile App Dashboard
    if (currentView === 'mobile') {
      return (
        <MobileView
          onBackToLanding={handleLogout}
          onOpenDashboard={() => setCurrentView('dashboard')}
        />
      );
    }
  }

  // ==========================================
  // 2. DESKTOP WEB EXPERIENCE
  // ==========================================
  if (currentView === 'landing') {
    return (
      <>
        <LandingView
          onLaunchConsole={() => navigateToProtectedView('dashboard')}
          onOpenMobileView={() => navigateToProtectedView('mobile')}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
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
      <MobileView
        onBackToLanding={() => setCurrentView('landing')}
        onOpenDashboard={() => setCurrentView('dashboard')}
      />
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
      <AppContent />
    </SecurityProvider>
  );
}
