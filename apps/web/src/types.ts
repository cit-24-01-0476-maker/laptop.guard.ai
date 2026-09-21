export type DeviceStatus =
  | 'Protected'
  | 'Disarmed'
  | 'Warning'
  | 'Offline'
  | 'Lost'
  | 'Camera Active'
  | 'Attention Required';

export type SecurityMode = 'Low' | 'Balanced' | 'High';

export type EventSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type CommandType =
  | 'ARM_DEVICE'
  | 'DISARM_DEVICE'
  | 'LOCK_DEVICE'
  | 'PLAY_ALARM'
  | 'STOP_ALARM'
  | 'REQUEST_LOCATION'
  | 'ENABLE_LOST_MODE'
  | 'DISABLE_LOST_MODE'
  | 'START_CAMERA_SESSION'
  | 'STOP_CAMERA_SESSION'
  | 'TAKE_SECURITY_SNAPSHOT';

export interface DeviceLocation {
  id: string;
  device_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  method: 'os_location' | 'wifi_triangulation' | 'ip_geolocation' | 'cached';
  city: string;
  region: string;
  country: string;
  recorded_at: string;
}

export interface Device {
  id: string;
  user_id: string;
  device_name: string;
  device_type: string;
  manufacturer: string;
  model: string;
  os: string;
  os_version: string;
  agent_version: string;
  device_public_key?: string;
  is_paired: boolean;
  status: DeviceStatus;
  security_mode: SecurityMode;
  battery: number;
  is_charging: boolean;
  current_ssid: string;
  ip_address: string;
  last_seen: string;
  created_at: string;
  last_location?: DeviceLocation;
}

export interface SecurityEvent {
  id: string;
  device_id: string;
  event_type: string;
  severity: EventSeverity;
  description: string;
  metadata_json?: string;
  location_id?: string;
  evidence_id?: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  device_id?: string;
  title: string;
  body: string;
  category: 'SECURITY' | 'CRITICAL' | 'DEVICE' | 'CAMERA' | 'SYSTEM';
  is_read: boolean;
  event_id?: string;
  created_at: string;
}

export interface CameraSession {
  id: string;
  session_id: string;
  device_id: string;
  user_id: string;
  status: 'INITIALIZING' | 'ACTIVE' | 'TERMINATED' | 'EXPIRED';
  started_at: string;
  expires_at: string;
  duration: number;
  ice_servers: Array<{ urls: string }>;
}

export interface EvidenceFile {
  id: string;
  device_id: string;
  file_type: 'PHOTO' | 'CLIP' | 'SNAPSHOT' | 'AUDIO';
  file_name: string;
  file_path: string;
  file_size: number;
  trigger_event: string;
  retention_days: number;
  is_encrypted: boolean;
  expires_at?: string;
  created_at: string;
}

export interface SecuritySettings {
  id: string;
  device_id: string;
  movement_detection: boolean;
  network_change_alert: boolean;
  power_disconnect_alert: boolean;
  failed_login_alert: boolean;
  location_updates: boolean;
  security_level: SecurityMode;
  auto_snapshot_on_alarm: boolean;
}

export interface AuditLogItem {
  id: string;
  device_id?: string;
  action: string;
  details: Record<string, any>;
  ip_address?: string;
  timestamp: string;
}
