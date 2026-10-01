import {
  Device,
  SecurityEvent,
  NotificationItem,
  CameraSession,
  EvidenceFile,
  AuditLogItem
} from '../types';
import { Capacitor } from '@capacitor/core';

export const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    const base = import.meta.env.VITE_API_URL.replace(/\/$/, '');
    return base.endsWith('/api/v1') ? base : `${base}/api/v1`;
  }
  if (import.meta.env.VITE_USE_LOCAL === 'true') {
    return 'http://127.0.0.1:8000/api/v1';
  }
  // Universal unified cloud backend across Vercel, APK, and Localhost
  return 'https://laptopguard-api.onrender.com/api/v1';
};

export const getDownloadUrl = (endpoint: string): string => {
  const clean = endpoint.replace(/^\//, '');
  if (clean === 'windows-agent' || clean === 'windows-zip') {
    return 'https://laptopguard-api.onrender.com/downloads/windows-agent';
  }
  if (clean === 'windows-setup' || clean === 'windows-exe') {
    return 'https://laptopguard-api.onrender.com/downloads/windows-setup';
  }
  if (clean === 'android-apk') {
    return 'https://laptopguard-api.onrender.com/downloads/android-apk';
  }
  if (clean === 'manifest') {
    return 'https://laptopguard-api.onrender.com/api/v1/downloads/manifest';
  }
  const base = getApiBaseUrl().replace(/\/api\/v1$/, '');
  return `${base}/api/v1/downloads/${clean}`;
};

export const getCameraStreamUrl = (deviceId: string): string => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('laptopguard_token') || '' : '';
  const cid = typeof window !== 'undefined' ? localStorage.getItem('laptopguard_controller_id') || '' : '';
  return `${getApiBaseUrl()}/camera/stream/${deviceId}?token=${encodeURIComponent(token)}&cid=${encodeURIComponent(cid)}`;
};

export const getCameraSnapshotUrl = (deviceId: string, ts?: number): string => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('laptopguard_token') || '' : '';
  const cid = typeof window !== 'undefined' ? localStorage.getItem('laptopguard_controller_id') || '' : '';
  return `${getApiBaseUrl()}/camera/snapshot/${deviceId}?t=${ts ?? Date.now()}&token=${encodeURIComponent(token)}&cid=${encodeURIComponent(cid)}`;
};

export const getScreenStreamUrl = (deviceId: string): string => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('laptopguard_token') || '' : '';
  const cid = typeof window !== 'undefined' ? localStorage.getItem('laptopguard_controller_id') || '' : '';
  return `${getApiBaseUrl()}/screen/stream/${deviceId}?token=${encodeURIComponent(token)}&cid=${encodeURIComponent(cid)}`;
};

export const getScreenSnapshotUrl = (deviceId: string, ts?: number): string => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('laptopguard_token') || '' : '';
  const cid = typeof window !== 'undefined' ? localStorage.getItem('laptopguard_controller_id') || '' : '';
  return `${getApiBaseUrl()}/screen/snapshot/${deviceId}?t=${ts ?? Date.now()}&token=${encodeURIComponent(token)}&cid=${encodeURIComponent(cid)}`;
};

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const token = localStorage.getItem('laptopguard_token');
    const controllerId = localStorage.getItem('laptopguard_controller_id');
    const authHeaders: Record<string, string> = {};
    if (token) {
      authHeaders['Authorization'] = `Bearer ${token}`;
    }
    if (controllerId) {
      authHeaders['X-Controller-ID'] = controllerId;
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

const resolveDownloadEndpoint = (artifact: 'windows-setup' | 'android-apk'): string =>
  artifact === 'windows-setup' ? '/downloads/windows-setup' : '/downloads/android-apk';

export async function downloadOwnerRelease(artifact: 'windows-setup' | 'android-apk', ownerKey: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}${resolveDownloadEndpoint(artifact)}`, {
    method: 'GET',
    headers: {
      'X-Owner-Key': ownerKey
    }
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Download failed' }));
    throw new Error(err.detail || `Download failed (${response.status})`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = artifact === 'windows-setup' ? 'LaptopGuard-Setup.exe' : 'LaptopGuard-AI.apk';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  // Auth
  verifyOwnerAccess: (ownerKey: string) =>
    fetchJson<{ status: string }>('/auth/owner-access/verify', {
      method: 'POST',
      body: JSON.stringify({ owner_key: ownerKey })
    }),
  login: (email: string, password: string) =>
    fetchJson<{ access_token: string; token_type: string; controller_id: string; is_controller_trusted: boolean; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  register: (email: string, password: string, full_name: string, secret_pin?: string) =>
    fetchJson<{ access_token: string; token_type: string; controller_id: string; is_controller_trusted: boolean; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name, secret_pin })
    }),
  getMe: () => fetchJson<any>('/auth/me'),

  // Secure One-Time Pairing
  claimPairingCode: (pairingCode: string) =>
    fetchJson<{
      pairing_request_id: string;
      device_id: string;
      device_name: string;
      manufacturer?: string;
      model?: string;
      os_version?: string;
      status: string;
      expires_in_seconds: number;
    }>('/pairing/claim', {
      method: 'POST',
      body: JSON.stringify({ pairing_code: pairingCode })
    }),
  getPairingStatus: (pairingRequestId: string) =>
    fetchJson<{
      pairing_request_id: string;
      status: string;
      claimed_by_email?: string;
      claimed_by_user_id?: string;
      expires_in_seconds: number;
    }>(`/pairing/status/${pairingRequestId}`),

  // Trusted Controllers & Step-Up Authorization
  getControllers: () => fetchJson<any[]>('/controllers'),
  authorizeController: (data: { controller_id?: string; controller_type?: string; display_name?: string; verification_code_or_pin: string }) =>
    fetchJson<any>('/controllers/authorize', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  revokeController: (controllerId: string) =>
    fetchJson<{ status: string; message: string }>(`/controllers/${controllerId}/revoke`, { method: 'POST' }),
  revokeAllControllers: () =>
    fetchJson<{ status: string; message: string }>('/controllers/revoke-all', { method: 'POST' }),

  // Devices
  getDevices: () => fetchJson<Device[]>('/devices'),
  getDevice: (id: string) => fetchJson<Device>(`/devices/${id}`),
  removeDevice: (deviceId: string) =>
    fetchJson<{ status: string; message: string }>(`/devices/${deviceId}/remove`, { method: 'POST' }),
  refreshLocation: (id: string, payload?: any) => fetchJson<any>(`/devices/${id}/refresh-location`, { method: 'POST', body: JSON.stringify(payload || {}) }),
  generatePairingToken: () => fetchJson<{ pairing_token: string; expires_at: string; qr_payload: any }>('/devices/generate-pairing-token', { method: 'POST' }),
  confirmPairing: (data: any) => fetchJson<{ status: string; device_id: string }>('/devices/confirm-pairing', { method: 'POST', body: JSON.stringify(data) }),
  bondDeviceWithQr: (deviceId: string, payload: any) =>
    fetchJson<{ status: string; message: string; device: Device }>(`/devices/${deviceId}/bond-with-qr`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

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
