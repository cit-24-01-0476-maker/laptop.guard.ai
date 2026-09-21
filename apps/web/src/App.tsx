import React, { useState, useEffect } from 'react';
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

import { LockConfirmModal } from './components/Modals/LockConfirmModal';
import { AlarmTriggerModal } from './components/Modals/AlarmTriggerModal';
import { LostModeModal } from './components/Modals/LostModeModal';
import { CriticalAlertModal } from './components/Modals/CriticalAlertModal';
import { PairingModal } from './components/Modals/PairingModal';
import { AuthModal } from './components/Modals/AuthModal';

export const AppContent: React.FC = () => {
  const { user, isAuthenticated, logoutUser, refreshAll } = useSecurity();
  // Default to landing page (SaaS presentation website)
  const [currentView, setCurrentView] = useState<string>('landing');
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
    setCurrentView(pendingTargetView || 'dashboard');
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentView('landing');
  };

  // Enforce auth: If not authenticated and trying to view a protected view, redirect to landing & prompt login
  useEffect(() => {
    if (!isAuthenticated && currentView !== 'landing') {
      setCurrentView('landing');
      setIsAuthModalOpen(true);
    }
  }, [isAuthenticated, currentView]);

  // Render dedicated standalone views
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

  // Dashboard Sub-Views
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

      {/* Top Floating Glass Navbar (With Intro Site and Mobile Controller Quick Links) */}
      <div className="p-3 sm:p-4 lg:px-6 xl:px-8 z-30 w-full mx-auto max-w-[1920px]">
        <Navbar
          currentView={currentView}
          onNavigateHome={() => setCurrentView('landing')}
          onNavigateMobile={() => setCurrentView('mobile')}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Floating Layout Container (Full 16:9 Widescreen Optimized) */}
      <div className="flex-1 flex w-full px-3 sm:px-4 lg:px-6 xl:px-8 pb-6 gap-5 z-10 max-w-[1920px] mx-auto">
        {/* Left Floating Translucent Sidebar */}
        <Sidebar currentView={currentView} onNavigate={(view) => setCurrentView(view)} />

        {/* Center Page Content Area */}
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
        onSuccess={() => refreshAll()}
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
