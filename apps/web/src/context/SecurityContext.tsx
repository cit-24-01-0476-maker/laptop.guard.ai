import React, { createContext, useContext, useEffect, useState } from 'react';
import { Device, SecurityEvent, NotificationItem, CameraSession } from '../types';
import { api } from '../services/api';
import { realtimeHub } from '../services/websocket';

interface SecurityContextType {
  devices: Device[];
  selectedDevice: Device | null;
  setSelectedDevice: (d: Device | null) => void;
  events: SecurityEvent[];
  notifications: NotificationItem[];
  isWsConnected: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  activeCameraSession: CameraSession | null;
  setActiveCameraSession: (s: CameraSession | null) => void;
  
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
  loginUser: (userData: any, token: string) => void;
  logoutUser: () => void;

  // Actions
  armDevice: (deviceId: string) => Promise<void>;
  disarmDevice: (deviceId: string) => Promise<void>;
  lockDevice: (deviceId: string) => Promise<void>;
  unlockDevice: (deviceId: string, pin?: string) => Promise<void>;
  soundAlarm: (deviceId: string) => Promise<void>;
  stopAlarm: (deviceId: string) => Promise<void>;
  toggleAlarm: (deviceId: string) => Promise<void>;
  activateLostMode: (deviceId: string, contactMessage?: string) => Promise<void>;
  deactivateLostMode: (deviceId: string) => Promise<void>;
  requestLocation: (deviceId: string) => Promise<void>;
  takeSnapshot: (deviceId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType | null>(null);

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
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [activeCameraSession, setActiveCameraSession] = useState<CameraSession | null>(null);

  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [criticalAlert, setCriticalAlert] = useState<{ title: string; body: string; deviceName: string; time: string } | null>(null);
  const [isAlarmActive, setIsAlarmActive] = useState(false);

  const loginUser = (userData: any, token: string) => {
    localStorage.setItem('laptopguard_token', token);
    localStorage.setItem('laptopguard_user', JSON.stringify(userData));
    setUser(userData);
    if (userData && userData.id) {
      realtimeHub.connect(userData.id);
    }
    // Immediately fetch devices and data for the logged-in user
    setTimeout(() => {
      refreshAll();
    }, 100);
  };

  const logoutUser = () => {
    localStorage.removeItem('laptopguard_token');
    localStorage.removeItem('laptopguard_user');
    setUser(null);
    setDevices([]);
    setSelectedDevice(null);
    setEvents([]);
    setNotifications([]);
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
      const devList = await api.getDevices();
      setDevices(devList);
      if (!selectedDevice && devList.length > 0) {
        setSelectedDevice(devList[0]);
      } else if (selectedDevice) {
        const updated = devList.find(d => d.id === selectedDevice.id);
        if (updated) setSelectedDevice(updated);
        else if (devList.length > 0) setSelectedDevice(devList[0]);
        else setSelectedDevice(null);
      }

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

  useEffect(() => {
    refreshAll();
    if (user && user.id) {
      realtimeHub.connect(user.id);
    } else {
      realtimeHub.connect('usr_owner_demo');
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
              status: d.status === 'Offline' ? 'Protected' : d.status
            };
          }
          return d;
        }));
        setSelectedDevice(prev => {
          if (prev && prev.id === data.device_id) {
            return {
              ...prev,
              battery: data.battery,
              is_charging: data.is_charging,
              current_ssid: data.current_ssid,
              last_seen: data.last_seen,
              status: prev.status === 'Offline' ? 'Protected' : prev.status
            };
          }
          return prev;
        });
      }

      if (data.type === 'DEVICE_STATUS_CHANGED') {
        setDevices(prev => prev.map(d => {
          if (d.id === data.device_id) {
            return { ...d, status: data.status as any };
          }
          return d;
        }));
        setSelectedDevice(prev => {
          if (prev && prev.id === data.device_id) {
            return { ...prev, status: data.status as any };
          }
          return prev;
        });
      }

      if (data.type === 'DEVICE_CLAIMED') {
        refreshAll();
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
            deviceName: data.event.device_name || 'Dell G15 Laptop',
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

  const armDevice = async (deviceId: string) => {
    await api.dispatchCommand(deviceId, 'ARM_DEVICE');
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status: 'Protected' } : d));
    refreshAll();
  };

  const disarmDevice = async (deviceId: string) => {
    setIsAlarmActive(false);
    await api.dispatchCommand(deviceId, 'DISARM_DEVICE');
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status: 'Disarmed' } : d));
    refreshAll();
  };

  const lockDevice = async (deviceId: string) => {
    await api.dispatchCommand(deviceId, 'LOCK_DEVICE');
    refreshAll();
  };

  const unlockDevice = async (deviceId: string, pin?: string) => {
    setIsAlarmActive(false);
    await api.dispatchCommand(deviceId, 'UNLOCK_WORKSTATION', { pin });
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status: 'Protected' } : d));
    refreshAll();
  };

  const soundAlarm = async (deviceId: string) => {
    setIsAlarmActive(true);
    await api.dispatchCommand(deviceId, 'PLAY_ALARM');
    refreshAll();
  };

  const stopAlarm = async (deviceId: string) => {
    setIsAlarmActive(false);
    await api.dispatchCommand(deviceId, 'STOP_ALARM');
    refreshAll();
  };

  const toggleAlarm = async (deviceId: string) => {
    if (isAlarmActive) {
      await stopAlarm(deviceId);
    } else {
      await soundAlarm(deviceId);
    }
  };

  const activateLostMode = async (deviceId: string, contactMessage?: string) => {
    await api.dispatchCommand(deviceId, 'ENABLE_LOST_MODE', { contact_message: contactMessage });
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status: 'Lost' } : d));
    refreshAll();
  };

  const deactivateLostMode = async (deviceId: string) => {
    setIsAlarmActive(false);
    await api.dispatchCommand(deviceId, 'DISABLE_LOST_MODE');
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status: 'Protected' } : d));
    refreshAll();
  };

  const requestLocation = async (deviceId: string) => {
    await api.dispatchCommand(deviceId, 'REQUEST_LOCATION');
    refreshAll();
  };

  const takeSnapshot = async (deviceId: string) => {
    await api.dispatchCommand(deviceId, 'TAKE_SECURITY_SNAPSHOT');
    refreshAll();
  };

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
        isLockModalOpen,
        setIsLockModalOpen,
        isAlarmModalOpen,
        setIsAlarmModalOpen,
        isLostModalOpen,
        setIsLostModalOpen,
        isPairingModalOpen,
        setIsPairingModalOpen,
        criticalAlert,
        dismissCriticalAlert: () => setCriticalAlert(null),
        isAlarmActive,
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
        user,
        isAuthenticated,
        loginUser,
        logoutUser,
        refreshAll
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) throw new Error('useSecurity must be used within SecurityProvider');
  return context;
};
