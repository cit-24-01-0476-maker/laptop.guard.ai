import React, { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Device, SecurityEvent, NotificationItem, CameraSession } from '../types';
import { api } from '../services/api';
import { realtimeHub } from '../services/websocket';

interface SecurityContextType {
  devices: Device[];
  selectedDevice: Device | null;
  setSelectedDevice: (d: Device | null | ((prev: Device | null) => Device | null)) => void;
  events: SecurityEvent[];
  notifications: NotificationItem[];
  isWsConnected: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  activeCameraSession: CameraSession | null;
  setActiveCameraSession: (s: CameraSession | null) => void;
  
  // Controller State & Step-up
  isControllerTrusted: boolean;
  controllers: any[];
  isAuthorizeBrowserModalOpen: boolean;
  setIsAuthorizeBrowserModalOpen: (v: boolean) => void;
  authorizeThisBrowser: (pin: string) => Promise<boolean>;
  revokeController: (controllerId: string) => Promise<void>;

  // Modals
  isLockModalOpen: boolean;
  setIsLockModalOpen: (v: boolean) => void;
  isAlarmModalOpen: boolean;
  setIsAlarmModalOpen: (v: boolean) => void;
  isLostModalOpen: boolean;
  setIsLostModalOpen: (v: boolean) => void;
  isPairingModalOpen: boolean;
  setIsPairingModalOpen: (v: boolean) => void;
  criticalAlert: { title: string; body: string; deviceName: string; time: string } | null;
  dismissCriticalAlert: () => void;
  isAlarmActive: boolean;

  // Auth & Session
  user: any | null;
  isAuthenticated: boolean;
  loginUser: (userData: any, token: string, controllerId?: string, isTrusted?: boolean) => void;
  logoutUser: () => void;

  // Actions
  armDevice: (deviceId: string) => Promise<void>;
  disarmDevice: (deviceId: string) => Promise<void>;
  lockDevice: (deviceId: string) => Promise<void>;
  unlockDevice: (deviceId: string, pin?: string) => Promise<void>;
  soundAlarm: (deviceId: string, volume?: number) => Promise<void>;
  stopAlarm: (deviceId: string) => Promise<void>;
  toggleAlarm: (deviceId: string) => Promise<void>;
  activateLostMode: (deviceId: string, contactMessage?: string) => Promise<void>;
  deactivateLostMode: (deviceId: string) => Promise<void>;
  requestLocation: (deviceId: string) => Promise<void>;
  takeSnapshot: (deviceId: string) => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType | null>(null);
const BONDED_DEVICE_ID_KEY = 'laptopguard_bonded_device_id';
const BONDED_DEVICE_CACHE_KEY = 'laptopguard_bonded_device_cache';

const cacheBondedDevice = (device: Device | null) => {
  if (!device?.id) return;
  localStorage.setItem(BONDED_DEVICE_ID_KEY, device.id);
  localStorage.setItem(BONDED_DEVICE_CACHE_KEY, JSON.stringify(device));
};

const readCachedBondedDevice = (): Device | null => {
  try {
    const cached = localStorage.getItem(BONDED_DEVICE_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('laptopguard_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = Boolean(user && localStorage.getItem('laptopguard_token'));

  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDeviceState] = useState<Device | null>(null);
  const setSelectedDevice = (d: Device | null | ((prev: Device | null) => Device | null)) => {
    if (typeof d === 'function') {
      setSelectedDeviceState((prev: Device | null) => {
        const next = d(prev);
        if (next?.id) {
          cacheBondedDevice(next);
        }
        return next;
      });
    } else {
      setSelectedDeviceState(d);
      if (d?.id) {
        cacheBondedDevice(d);
      }
    }
  };
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [activeCameraSession, setActiveCameraSession] = useState<CameraSession | null>(null);

  // Controller State
  const [isControllerTrusted, setIsControllerTrusted] = useState<boolean>(() => {
    return localStorage.getItem('laptopguard_controller_trusted') === 'true';
  });
  const [controllers, setControllers] = useState<any[]>([]);
  const [isAuthorizeBrowserModalOpen, setIsAuthorizeBrowserModalOpen] = useState(false);

  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [criticalAlert, setCriticalAlert] = useState<{ title: string; body: string; deviceName: string; time: string } | null>(null);
  const [isAlarmActive, setIsAlarmActive] = useState(false);

  const loginUser = (userData: any, token: string, controllerId?: string, isTrusted?: boolean) => {
    localStorage.setItem('laptopguard_token', token);
    localStorage.setItem('laptopguard_user', JSON.stringify(userData));
    if (controllerId) {
      localStorage.setItem('laptopguard_controller_id', controllerId);
    }
    const trusted = Boolean(isTrusted);
    localStorage.setItem('laptopguard_controller_trusted', trusted ? 'true' : 'false');
    setIsControllerTrusted(trusted);
    setUser(userData);
    if (userData && userData.id) {
      realtimeHub.connect(userData.id);
    }
    setTimeout(() => {
      refreshAll();
    }, 100);
  };

  const logoutUser = () => {
    localStorage.removeItem('laptopguard_token');
    localStorage.removeItem('laptopguard_user');
    localStorage.removeItem('laptopguard_controller_trusted');
    setUser(null);
    setDevices([]);
    setSelectedDevice(null);
    setEvents([]);
    setNotifications([]);
    setIsControllerTrusted(false);
    realtimeHub.disconnect();
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  };

  const refreshAll = async () => {
    const token = localStorage.getItem('laptopguard_token');
    if (!token) {
      setDevices([]);
      setSelectedDevice(null);
      setEvents([]);
      setNotifications([]);
      return;
    }

    try {
      const bondedId = localStorage.getItem(BONDED_DEVICE_ID_KEY);
      const cachedBonded = readCachedBondedDevice();
      const devList = await api.getDevices();
      setDevices(devList);

      if (bondedId) {
        const bonded = devList.find(d => d.id === bondedId);
        if (bonded) {
          setSelectedDevice(bonded);
        } else if (cachedBonded?.id === bondedId) {
          setSelectedDevice(cachedBonded);
        } else if (devList.length > 0) {
          setSelectedDevice(devList[0]);
        } else {
          setSelectedDevice(cachedBonded);
        }
      } else if (!selectedDevice && devList.length > 0) {
        setSelectedDevice(devList[0]);
      } else if (selectedDevice) {
        const updated = devList.find(d => d.id === selectedDevice.id);
        if (updated) setSelectedDevice(updated);
        else if (devList.length > 0) setSelectedDevice(devList[0]);
        else setSelectedDevice(null);
      }

      // Refresh Controllers Status
      try {
        const ctrlList = await api.getControllers();
        setControllers(ctrlList);
        const myCid = localStorage.getItem('laptopguard_controller_id');
        if (myCid) {
          const match = ctrlList.find(c => c.id === myCid);
          const isT = Boolean(match && match.is_trusted);
          setIsControllerTrusted(isT);
          localStorage.setItem('laptopguard_controller_trusted', isT ? 'true' : 'false');
        }
      } catch (_) {}

      const evList = await api.getEvents();
      setEvents(evList);

      const notifList = await api.getNotifications();
      setNotifications(notifList);
    } catch (e: any) {
      console.warn('Initial data load error:', e?.message || e);
      if (e?.message && (e.message.includes('401') || e.message.includes('Not authenticated'))) {
        logoutUser();
      }
    }
  };

  const authorizeThisBrowser = async (pin: string): Promise<boolean> => {
    let cid = localStorage.getItem('laptopguard_controller_id');
    if (!cid) {
      cid = 'ctrl_' + Math.random().toString(36).substring(2, 12);
      localStorage.setItem('laptopguard_controller_id', cid);
    }
    const res = await api.authorizeController({
      controller_id: cid,
      controller_type: Capacitor.isNativePlatform() ? 'MOBILE_APP' : 'WEB_BROWSER',
      display_name: Capacitor.isNativePlatform()
        ? 'LaptopGuard Mobile App'
        : 'Desktop Web Browser (' + (navigator.platform || 'Workstation') + ')',
      verification_code_or_pin: pin
    });
    if (res.is_trusted) {
      setIsControllerTrusted(true);
      localStorage.setItem('laptopguard_controller_trusted', 'true');
      setIsAuthorizeBrowserModalOpen(false);
      await refreshAll();
      return true;
    }
    return false;
  };

  const revokeController = async (controllerId: string) => {
    await api.revokeController(controllerId);
    await refreshAll();
  };

  useEffect(() => {
    refreshAll();
    if (user && user.id) {
      realtimeHub.connect(user.id);
    }

    const unsubscribe = realtimeHub.subscribe((data) => {
      if (data.type === 'WS_CONNECTED') setIsWsConnected(true);
      if (data.type === 'WS_DISCONNECTED') setIsWsConnected(false);
      if (data.type === 'DEVICE_STATUS_CHANGED') refreshAll();

      if (data.type === 'DEVICE_TELEMETRY_UPDATED') {
        setDevices(prev => prev.map(d => {
          if (d.id === data.device_id) {
            return {
              ...d,
              battery: data.battery,
              is_charging: data.is_charging,
              current_ssid: data.current_ssid,
                last_seen: data.last_seen,
                last_location: data.last_location || d.last_location,
              status: d.status === 'Offline' ? 'Protected' : d.status
            };
          }
          return d;
        }));
      }

      if (data.type === 'ALARM_STATE_CHANGED') {
        setIsAlarmActive(Boolean(data.is_alarm_active));
      }

      if (data.type === 'NEW_SECURITY_EVENT') {
        setEvents(prev => [data.event, ...prev]);
        if (data.notification) {
          setNotifications(prev => [data.notification, ...prev]);
        }
        if (data.event.severity === 'CRITICAL') {
          setIsAlarmActive(true);
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              const ctx = new AudioContextClass();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(900, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.4);
              gain.gain.setValueAtTime(0.4, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.6);
            }
          } catch (_) {}

          setCriticalAlert({
            title: `CRITICAL ALERT: ${data.event.event_type}`,
            body: data.event.description,
            deviceName: data.event.device_name || selectedDevice?.device_name || 'Guarded Laptop',
            time: new Date().toLocaleTimeString()
          });
        }
      }
    });

    const pollInterval = setInterval(() => {
      const token = localStorage.getItem('laptopguard_token');
      if (token) {
        refreshAll();
      }
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      unsubscribe();
    };
  }, []);

  const handleCommandWithPolicyCheck = async (fn: () => Promise<any>) => {
    try {
      await fn();
    } catch (err: any) {
      if (err?.message && (err.message.includes('CONTROLLER_NOT_TRUSTED') || err.message.includes('403'))) {
        setIsAuthorizeBrowserModalOpen(true);
      }
      throw err;
    }
  };

  const armDevice = async (deviceId: string) => {
    await handleCommandWithPolicyCheck(async () => {
      await api.dispatchCommand(deviceId, 'ARM_DEVICE');
      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status: 'Protected' } : d));
      refreshAll();
    });
  };

  const disarmDevice = async (deviceId: string) => {
    await handleCommandWithPolicyCheck(async () => {
      setIsAlarmActive(false);
      await api.dispatchCommand(deviceId, 'DISARM_DEVICE');
      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status: 'Disarmed' } : d));
      refreshAll();
    });
  };

  const lockDevice = async (deviceId: string) => {
    await handleCommandWithPolicyCheck(async () => {
      await api.dispatchCommand(deviceId, 'LOCK_DEVICE');
      refreshAll();
    });
  };

  const unlockDevice = async (deviceId: string, pin?: string) => {
    await handleCommandWithPolicyCheck(async () => {
      setIsAlarmActive(false);
      await api.dispatchCommand(deviceId, 'UNLOCK_WORKSTATION', { pin });
      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status: 'Protected' } : d));
      refreshAll();
    });
  };

  const soundAlarm = async (deviceId: string, volume: number = 40) => {
    await handleCommandWithPolicyCheck(async () => {
      setIsAlarmActive(true);
      await api.dispatchCommand(deviceId, 'PLAY_ALARM', { volume });
      refreshAll();
    });
  };

  const stopAlarm = async (deviceId: string) => {
    await handleCommandWithPolicyCheck(async () => {
      setIsAlarmActive(false);
      await api.dispatchCommand(deviceId, 'STOP_ALARM');
      refreshAll();
    });
  };

  const toggleAlarm = async (deviceId: string) => {
    if (isAlarmActive) {
      await stopAlarm(deviceId);
    } else {
      await soundAlarm(deviceId);
    }
  };

  const activateLostMode = async (deviceId: string, contactMessage?: string) => {
    await handleCommandWithPolicyCheck(async () => {
      await api.dispatchCommand(deviceId, 'ENABLE_LOST_MODE', { contact_message: contactMessage });
      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status: 'Lost' } : d));
      refreshAll();
    });
  };

  const deactivateLostMode = async (deviceId: string) => {
    await handleCommandWithPolicyCheck(async () => {
      setIsAlarmActive(false);
      await api.dispatchCommand(deviceId, 'DISABLE_LOST_MODE');
      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status: 'Protected' } : d));
      refreshAll();
    });
  };

  const requestLocation = async (deviceId: string) => {
    await handleCommandWithPolicyCheck(async () => {
      await api.dispatchCommand(deviceId, 'REQUEST_LOCATION');
      refreshAll();
    });
  };

  const takeSnapshot = async (deviceId: string) => {
    await handleCommandWithPolicyCheck(async () => {
      await api.dispatchCommand(deviceId, 'TAKE_PHOTO');
      refreshAll();
    });
  };

  const removeDevice = async (deviceId: string) => {
    await handleCommandWithPolicyCheck(async () => {
      await api.removeDevice(deviceId);
      setDevices(prev => prev.filter(d => d.id !== deviceId));
      if (selectedDevice?.id === deviceId) {
        setSelectedDevice(null);
      }
      refreshAll();
    });
  };

  const dismissCriticalAlert = () => setCriticalAlert(null);

  return (
    <SecurityContext.Provider
      value={{
        devices,
        selectedDevice,
        setSelectedDevice,
        events,
        notifications,
        isWsConnected,
        theme,
        toggleTheme,
        activeCameraSession,
        setActiveCameraSession,
        
        isControllerTrusted,
        controllers,
        isAuthorizeBrowserModalOpen,
        setIsAuthorizeBrowserModalOpen,
        authorizeThisBrowser,
        revokeController,

        isLockModalOpen,
        setIsLockModalOpen,
        isAlarmModalOpen,
        setIsAlarmModalOpen,
        isLostModalOpen,
        setIsLostModalOpen,
        isPairingModalOpen,
        setIsPairingModalOpen,
        criticalAlert,
        dismissCriticalAlert,
        isAlarmActive,

        user,
        isAuthenticated,
        loginUser,
        logoutUser,

        armDevice,
        disarmDevice,
        lockDevice,
        unlockDevice,
        soundAlarm,
        stopAlarm,
        toggleAlarm,
        activateLostMode,
        deactivateLostMode,
        requestLocation,
        takeSnapshot,
        removeDevice,
        refreshAll
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};
