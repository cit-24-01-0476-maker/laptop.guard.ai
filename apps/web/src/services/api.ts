import { Capacitor } from '@capacitor/core';
import {
  Device,
  SecurityEvent,
  NotificationItem,
  CameraSession,
  EvidenceFile,
  AuditLogItem
} from '../types';

export const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    const base = import.meta.env.VITE_API_URL.replace(/\/$/, '');
    return base.endsWith('/api/v1') ? base : `${base}/api/v1`;
  }
  if (Capacitor.isNativePlatform()) {
    return 'https://laptopguard-api.onrender.com/api/v1';
  }
  if (typeof window !== 'undefined') {
    const isDevPort = window.location.port === '3000';
    if ((isDevPort || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && !Capacitor.isNativePlatform()) {
      return `http://${window.location.hostname}:8000/api/v1`;
    }
    // Production Cloud Backend fallback
    return 'https://laptopguard-api.onrender.com/api/v1';
  }
  return 'https://laptopguard-api.onrender.com/api/v1';
};

export const getDownloadUrl = (endpoint: string): string => {
  const clean = endpoint.replace(/^\//, '');
  if (clean === 'windows-agent' || clean === 'windows-zip') {
    if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
      return '/LaptopGuard-Windows-Agent-v1.5.2.zip';
    }
    return 'https://laptopguard-api.onrender.com/downloads/windows-agent';
  }
  if (clean === 'windows-setup' || clean === 'windows-exe') {
    if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
      return '/LaptopGuard-Setup.exe';
    }
    return 'https://laptopguard-api.onrender.com/downloads/windows-setup';
  }
  if (clean === 'android-apk') {
    if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
      return '/LaptopGuard-AI.apk';
    }
    return 'https://laptopguard-api.onrender.com/downloads/android-apk';
  }
  if (clean === 'manifest') {
    return 'https://laptopguard-api.onrender.com/api/v1/downloads/manifest';
  }
  const base = getApiBaseUrl().replace(/\/api\/v1$/, '');
  return `${base}/api/v1/downloads/${clean}`;
};

export const getCameraStreamUrl = (deviceId: string): string => {
  return `${getApiBaseUrl()}/camera/stream/${deviceId}`;
};

export const getCameraSnapshotUrl = (deviceId: string): string => {
  return `${getApiBaseUrl()}/camera/snapshot/${deviceId}?t=${Date.now()}`;
};

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const token = localStorage.getItem('laptopguard_token');
    const authHeaders: Record<string, string> = {};
    if (token) {
      authHeaders['Authorization'] = `Bearer ${token}`;
    }

    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options?.headers || {})
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(err.detail || `HTTP Error ${res.status}`);
    }
    return await res.json();
  } catch (error: any) {
    console.warn(`API call ${endpoint} failed:`, error.message);
    throw error;
  }
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    fetchJson<{ access_token: string; token_type: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  register: (email: string, password: string, full_name: string) =>
    fetchJson<{ access_token: string; token_type: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name })
    }),
  getMe: () => fetchJson<any>('/auth/me'),
  // Devices
  getDevices: () => fetchJson<Device[]>('/devices'),
  getDevice: (id: string) => fetchJson<Device>(`/devices/${id}`),
  refreshLocation: (id: string, payload?: any) => fetchJson<any>(`/devices/${id}/refresh-location`, { method: 'POST', body: JSON.stringify(payload || {}) }),
  generatePairingToken: () => fetchJson<{ pairing_token: string; expires_at: string; qr_payload: any }>('/devices/generate-pairing-token', { method: 'POST' }),
  confirmPairing: (data: any) => fetchJson<{ status: string; device_id: string }>('/devices/confirm-pairing', { method: 'POST', body: JSON.stringify(data) }),

  // Remote Commands
  dispatchCommand: (deviceId: string, commandType: string, payload: any = {}) =>
    fetchJson<{ id: string; command_id: string; status: string }>(`/commands/${deviceId}`, {
      method: 'POST',
      body: JSON.stringify({ command_type: commandType, payload })
    }),

  // Security Events Timeline
  getEvents: (deviceId?: string, severity?: string) => {
    const params = new URLSearchParams();
    if (deviceId) params.append('device_id', deviceId);
    if (severity) params.append('severity', severity);
    return fetchJson<SecurityEvent[]>(`/events?${params.toString()}`);
  },

  // Notifications
  getNotifications: () => fetchJson<NotificationItem[]>('/notifications'),
  markNotificationRead: (id: string) => fetchJson<{ status: string }>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => fetchJson<{ status: string }>('/notifications/mark-all-read', { method: 'POST' }),
  clearNotifications: () => fetchJson<{ status: string }>('/notifications/clear', { method: 'DELETE' }),

  // Live Camera
  startCameraSession: (deviceId: string) =>
    fetchJson<CameraSession>('/camera/start', {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId })
    }),
  stopCameraSession: (sessionId: string) =>
    fetchJson<{ status: string; duration: number }>(`/camera/stop/${sessionId}`, { method: 'POST' }),

  // Evidence Vault
  getEvidence: (deviceId?: string, fileType?: string) => {
    const params = new URLSearchParams();
    if (deviceId) params.append('device_id', deviceId);
    if (fileType) params.append('file_type', fileType);
    return fetchJson<EvidenceFile[]>(`/evidence?${params.toString()}`);
  },
  deleteEvidence: (evidenceId: string) => fetchJson<{ status: string }>(`/evidence/${evidenceId}`, { method: 'DELETE' }),

  // Privacy Center & Audits
  getPrivacyStatus: (deviceId: string) => fetchJson<any>(`/privacy/status/${deviceId}`),
  deleteAllEvidence: (deviceId: string) => fetchJson<{ status: string; message: string }>(`/privacy/delete-all-evidence/${deviceId}`, { method: 'POST' }),
  getAuditTrail: () => fetchJson<AuditLogItem[]>('/privacy/audit-trail'),
  exportUserData: () => fetchJson<any>('/privacy/export-data'),
};
