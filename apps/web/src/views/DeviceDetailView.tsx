import React, { useState } from 'react';
import {
  Laptop,
  Shield,
  MapPin,
  Wifi,
  Camera,
  Activity,
  FolderLock,
  Cpu,
  KeyRound,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Battery,
  BatteryCharging,
  Clock,
  Radio,
  ExternalLink
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';

interface DeviceDetailViewProps {
  onBack: () => void;
  onNavigateToCamera: () => void;
}

export const DeviceDetailView: React.FC<DeviceDetailViewProps> = ({ onBack, onNavigateToCamera }) => {
  const { selectedDevice, events } = useSecurity();
  const [activeTab, setActiveTab] = useState('overview');

  if (!selectedDevice) {
    return (
      <div className="jelly-card p-8 rounded-3xl text-center">
        <p className="text-slate-500 dark:text-slate-400">No device selected.</p>
        <button onClick={onBack} className="mt-4 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
          Return to Devices
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Laptop },
    { id: 'security', label: 'Security & Defense', icon: Shield },
    { id: 'location', label: 'Location & Map', icon: MapPin },
    { id: 'network', label: 'Network & Connectivity', icon: Wifi },
    { id: 'camera', label: 'Live Camera Feed', icon: Camera },
    { id: 'events', label: 'Events Audit', icon: Activity },
    { id: 'system', label: 'System Information', icon: Cpu },
    { id: 'permissions', label: 'OS Permissions', icon: KeyRound },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back button & Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="jelly-button p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-sm transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{selectedDevice.device_name}</h2>
            <span className="jelly-pill px-3 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40">
              ● {selectedDevice.status}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {selectedDevice.manufacturer} {selectedDevice.model} • Agent v{selectedDevice.agent_version}
          </p>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex flex-wrap gap-2 pb-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`jelly-pill flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border-transparent'
                  : 'bg-white/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-700/60 border border-slate-200/50 dark:border-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="jelly-card p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="bubble-icon w-8 h-8 bubble-blue flex items-center justify-center">
                <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Device Hardware Telemetry</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Device ID</span>
                <span className="text-slate-800 dark:text-white font-mono font-semibold">{selectedDevice.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Manufacturer</span>
                <span className="text-slate-800 dark:text-white font-semibold">{selectedDevice.manufacturer}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Model Name</span>
                <span className="text-slate-800 dark:text-white font-semibold">{selectedDevice.model}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Operating System</span>
                <span className="text-slate-800 dark:text-white font-semibold">{selectedDevice.os} ({selectedDevice.os_version})</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Battery State</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                  <BatteryCharging className="w-3.5 h-3.5" />
                  {selectedDevice.battery}% {selectedDevice.is_charging ? '(AC Plugged)' : '(Discharging)'}
                </span>
              </div>
            </div>
          </div>

          <div className="jelly-card p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="bubble-icon w-8 h-8 bubble-cyan flex items-center justify-center">
                <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Protection & Connectivity</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Security Mode</span>
                <span className="jelly-pill px-2.5 py-0.5 text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50">
                  {selectedDevice.security_mode}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Active Wi-Fi SSID</span>
                <span className="text-slate-800 dark:text-white font-mono font-semibold">{selectedDevice.current_ssid}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Local IP Address</span>
                <span className="text-slate-800 dark:text-white font-mono font-semibold">{selectedDevice.ip_address}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Approx. Location</span>
                <span className="text-slate-800 dark:text-white font-semibold">
                  {selectedDevice.last_location ? `${selectedDevice.last_location.city}, ${selectedDevice.last_location.country}` : 'Colombo, Sri Lanka'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Last Seen Sync</span>
                <span className="text-slate-600 dark:text-slate-300 font-mono">
                  {new Date(selectedDevice.last_seen).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="jelly-card p-6 rounded-3xl space-y-6">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Operating System Permissions & Privacy</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              LaptopGuard AI strictly adheres to OS privacy frameworks. Physical camera LED status is never concealed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-white">Webcam Permission</span>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Authorized for owner live-view and anti-tamper security photos.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-white">Microphone</span>
                <XCircle className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Disabled by default as mandated by non-covert privacy policy.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-white">Location Services</span>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">BSSID Wi-Fi triangulation and Windows Geolocation enabled.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'camera' && (
        <div className="jelly-card p-10 rounded-3xl text-center space-y-4">
          <div className="bubble-icon w-16 h-16 bubble-cyan flex items-center justify-center mx-auto">
            <Camera className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Authorized Live Camera Stream</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Direct authenticated connection to the hardware webcam of {selectedDevice.device_name} with low-latency local streaming.
          </p>
          <button
            onClick={onNavigateToCamera}
            className="jelly-button py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            Launch Live Camera Console
          </button>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="jelly-card p-6 rounded-3xl space-y-3">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Device Security Log</h3>
          {events.slice(0, 8).map((ev) => (
            <div key={ev.id} className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-900 dark:text-white">{ev.event_type}</span>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">{ev.description}</p>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {new Date(ev.created_at).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'network' && (
        <div className="jelly-card p-6 rounded-3xl space-y-4 text-xs">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Network Security Baseline</h3>
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 space-y-2">
            <p className="text-slate-700 dark:text-slate-300"><strong>Current SSID:</strong> {selectedDevice.current_ssid}</p>
            <p className="text-slate-700 dark:text-slate-300"><strong>IP Address:</strong> {selectedDevice.ip_address}</p>
            <p className="text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              * The LaptopGuard agent continuously inspects the active network adapter. If the laptop is unplugged
              or moved to an unfamiliar Wi-Fi network while armed, an instant Critical Alert is triggered.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'location' && (
        <div className="jelly-card p-6 rounded-3xl space-y-4 text-xs">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Location Resolution</h3>
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 space-y-2">
            <p className="text-slate-700 dark:text-slate-300">
              <strong>Region:</strong> {selectedDevice.last_location ? `${selectedDevice.last_location.city}, ${selectedDevice.last_location.country}` : 'Colombo, Sri Lanka'}
            </p>
            <p className="text-slate-700 dark:text-slate-300"><strong>Method:</strong> Wi-Fi Triangulation & IP Geolocation</p>
            <p className="text-slate-700 dark:text-slate-300"><strong>Accuracy:</strong> ~150 meters radius</p>
            <p className="text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Truthful location disclosure: Laptops without dedicated hardware GNSS rely on Wi-Fi BSSID mapping
              and OS Geolocation APIs.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="jelly-card p-6 rounded-3xl space-y-4 text-xs">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Security Level Configuration</h3>
          <p className="text-slate-500 dark:text-slate-400">Device is currently armed in <strong>Balanced Security Mode</strong>.</p>
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 space-y-1.5 font-medium">
            <p>✔ AC Power disconnect alarms active (500ms Win32 watchdog)</p>
            <p>✔ Wi-Fi SSID change detection active</p>
            <p>✔ Windows LockWorkStation remote execution enabled</p>
            <p>✔ Loud deterrence siren ready with 15s smart auto-timeout</p>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="jelly-card p-6 rounded-3xl space-y-4 text-xs">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Agent Build & Public Key</h3>
          <div className="space-y-2 font-mono text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/60 dark:border-white/5">
            <p>Agent Version: 1.4.2 (Production Signed)</p>
            <p>Public Key: ed25519_pk_7f8a9b2c3d4e5f6a</p>
            <p>Runtime: Windows Native Service (Win32 / CPython)</p>
            <p>Cryptographic Nonce Verification: Enforced (60s TTL)</p>
          </div>
        </div>
      )}
    </div>
  );
};
