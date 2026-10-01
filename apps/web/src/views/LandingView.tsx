import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Camera,
  Download,
  Eye,
  KeyRound,
  Laptop,
  Lock,
  MapPin,
  Radio,
  ShieldCheck,
  Smartphone,
  X
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { api, downloadOwnerRelease } from '../services/api';
import { BrandLogo } from '../components/BrandLogo';
import { SystemShowcase } from '../components/SystemShowcase';
import { OWNER_ACCESS_STORAGE_KEY } from '../config/ownerAccess';

interface LandingViewProps {
  onLaunchConsole: () => void;
  onOpenMobileView: () => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onOpenIntro?: () => void;
  onLockMasterAccess?: () => void;
}

type ProtectedAction = 'dashboard' | 'mobile' | 'windows' | 'android';

const features = [
  {
    icon: Lock,
    title: 'Hardware theft response',
    body: 'LaptopGuard watches charger disconnects, lock state, and security events so the owner can react before the device disappears.'
  },
  {
    icon: Camera,
    title: 'Owner-authorized visibility',
    body: 'Live webcam and screen views are guarded behind account login, trusted controller checks, and an owner key.'
  },
  {
    icon: MapPin,
    title: 'Real device location',
    body: 'The console reports the laptop location from the Windows device itself instead of showing decorative map data.'
  }
];

export const LandingView: React.FC<LandingViewProps> = ({
  onLaunchConsole,
  onOpenMobileView,
  onOpenAuth,
  onLogout,
  onOpenIntro,
  onLockMasterAccess
}) => {
  const { user, isAuthenticated, logoutUser } = useSecurity();
  const [pendingAction, setPendingAction] = useState<ProtectedAction | null>(null);
  const [keyValue, setKeyValue] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);
  const releaseLabel = useMemo(() => 'v2.0.2 private owner build', []);

  const completeAction = async (action: ProtectedAction, ownerKey?: string) => {
    if (action === 'dashboard') onLaunchConsole();
    if (action === 'mobile') onOpenMobileView();
    if (action === 'windows') await downloadOwnerRelease('windows-setup', ownerKey || keyValue);
    if (action === 'android') await downloadOwnerRelease('android-apk', ownerKey || keyValue);
  };

  const runProtectedAction = (action: ProtectedAction) => {
    if (sessionStorage.getItem(OWNER_ACCESS_STORAGE_KEY) === 'true') {
      void completeAction(action);
      return;
    }
    setPendingAction(action);
    setKeyValue('');
    setKeyError(null);
  };

  const verifyOwnerKey = async () => {
    if (!pendingAction) return;
    setIsVerifyingKey(true);
    setKeyError(null);
    try {
      await api.verifyOwnerAccess(keyValue);
    } catch (_) {
      setKeyError('Invalid owner key');
      setIsVerifyingKey(false);
      return;
    }
    sessionStorage.setItem(OWNER_ACCESS_STORAGE_KEY, 'true');
    const action = pendingAction;
    setPendingAction(null);
    try {
      await completeAction(action, keyValue);
      setKeyValue('');
    } catch (error: any) {
      setPendingAction(action);
      setKeyError(error?.message || 'Download failed');
    } finally {
      setIsVerifyingKey(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-950 font-sans selection:bg-cyan-500 selection:text-white">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <BrandLogo size="md" subtitle="Private Hardware Security" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
          <nav className="hidden items-center gap-6 text-xs font-bold text-slate-500 lg:flex">
            <a href="#system" className="hover:text-slate-950">System</a>
            <a href="#protection" className="hover:text-slate-950">Protection</a>
            <a href="#downloads" className="hover:text-slate-950">Private Downloads</a>
          </nav>
          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <button
                onClick={onLogout || logoutUser}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Sign Out
              </button>
            ) : (
              onOpenAuth && (
                <button
                  onClick={onOpenAuth}
                  className="hidden rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 sm:inline-flex"
                >
                  Owner Login
                </button>
              )
            )}
            <button
              onClick={() => runProtectedAction('dashboard')}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-lg shadow-slate-900/15 hover:bg-slate-800"
            >
              <KeyRound className="h-4 w-4" />
              Owner Console
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_24%,rgba(255,122,26,0.14),transparent_28%),radial-gradient(circle_at_88%_58%,rgba(139,44,255,0.13),transparent_32%),linear-gradient(120deg,rgba(14,165,233,0.07),transparent_38%,rgba(255,255,255,0.92))]" />
          <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-start gap-8 px-4 pb-12 pt-8 sm:px-6 sm:pb-14 sm:pt-10 lg:grid-cols-[0.96fr_1.04fr] lg:gap-8 lg:px-8 lg:pb-12 lg:pt-8">
            <div className="flex flex-col justify-start pt-2 lg:pt-8">
              <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-cyan-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                LaptopGuard AI {releaseLabel}
              </div>
              <h1 className="max-w-3xl text-4xl font-black leading-[1.02] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                Personal laptop security with an owner-only control room.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                A private anti-theft system for Windows laptops: charger watchdog, remote lock, live verification, event history, and mobile control. Public visitors can understand the product, but the actual console and installers stay behind an owner key.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={() => runProtectedAction('dashboard')}
                  className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-black text-white shadow-xl shadow-cyan-600/20 hover:bg-cyan-500"
                >
                  Unlock Private Console
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#system"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50"
                >
                  View Intro
                  <Eye className="h-4 w-4" />
                </a>
              </div>
            </div>

            <SystemShowcase />
          </div>
        </section>

        <section id="protection" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">What It Does</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Built for one owner, not the crowd.</h2>
            </div>
            {onOpenIntro && (
              <button
                onClick={onOpenIntro}
                className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-800 shadow-sm hover:bg-slate-50"
              >
                Play App Intro
                <Radio className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <feature.icon className="h-8 w-8 text-cyan-600" />
                <h3 className="mt-5 text-lg font-black text-slate-950">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="downloads" className="border-y border-slate-200 bg-slate-950 px-4 py-14 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Private Owner Downloads</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Latest Windows installer and Android APK are key protected.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                The public page is safe to share on LinkedIn. Installing the real owner tools requires the special owner key.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <Laptop className="h-9 w-9 text-cyan-300" />
                <h3 className="mt-5 text-xl font-black">Windows PC Sentinel</h3>
                <p className="mt-2 text-sm text-slate-300">Setup wizard for Windows 10/11. Installer also asks for the owner password before extraction.</p>
                <button
                  onClick={() => runProtectedAction('windows')}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-50"
                >
                  <Download className="h-4 w-4" />
                  Download Windows Setup
                </button>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <Smartphone className="h-9 w-9 text-emerald-300" />
                <h3 className="mt-5 text-xl font-black">Android Mobile Controller</h3>
                <p className="mt-2 text-sm text-slate-300">Latest APK with private app access gate and protected remote-control dashboard.</p>
                <button
                  onClick={() => runProtectedAction('android')}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300"
                >
                  <Download className="h-4 w-4" />
                  Download Android APK
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" subtitle={false} />
          <span>Private anti-theft software by LaptopGuard AI</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => runProtectedAction('mobile')} className="hover:text-slate-950">Phone View</button>
          {onLockMasterAccess && <button onClick={onLockMasterAccess} className="hover:text-slate-950">Lock Session</button>}
          <span>{releaseLabel}</span>
        </div>
      </footer>

      {pendingAction && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-black text-slate-950">Owner Key Required</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This area is private. Enter the special owner key to continue.
                </p>
              </div>
              <button
                onClick={() => setPendingAction(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <input
              value={keyValue}
              onChange={(event) => {
                setKeyValue(event.target.value);
                setKeyError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void verifyOwnerKey();
              }}
              autoFocus
              type="password"
              disabled={isVerifyingKey}
              className="mt-6 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none ring-cyan-500/20 focus:border-cyan-500 focus:ring-4"
              placeholder="Enter owner key"
            />
            {keyError && <p className="mt-3 text-xs font-black text-rose-600">{keyError}</p>}
            <button
              onClick={() => void verifyOwnerKey()}
              disabled={isVerifyingKey}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isVerifyingKey ? 'Verifying...' : 'Unlock'}
              <ShieldCheck className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
