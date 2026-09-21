import React from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { DeviceCard } from '../components/DeviceCard';

interface DevicesViewProps {
  onSelectDevice: (deviceId: string) => void;
}

export const DevicesView: React.FC<DevicesViewProps> = ({ onSelectDevice }) => {
  const { devices, selectedDevice, setSelectedDevice, setIsPairingModalOpen } = useSecurity();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="jelly-pill px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/30 border border-blue-200/60 dark:border-blue-700/40">
              Fleet Protection
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Guarded Devices</h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Explicitly authorized hardware agents bound to your cryptographic identity
          </p>
        </div>

        <button
          onClick={() => setIsPairingModalOpen(true)}
          className="jelly-button flex items-center gap-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Pair New Laptop Agent</span>
        </button>
      </div>

      {/* Grid of Devices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {devices.map((device) => (
          <div
            key={device.id}
            className="cursor-pointer"
            onClick={() => {
              setSelectedDevice(device);
              onSelectDevice(device.id);
            }}
          >
            <DeviceCard
              device={device}
              isPrimary={selectedDevice?.id === device.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
