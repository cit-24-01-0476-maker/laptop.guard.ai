-- =============================================================================
-- LaptopGuard AI - Production Relational Database Schema
-- "Protect Your Laptop. Wherever You Go."
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner',
    two_factor_enabled BOOLEAN NOT NULL DEFAULT 0,
    two_factor_secret TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'laptop',
    manufacturer TEXT,
    model TEXT,
    os TEXT NOT NULL DEFAULT 'Windows',
    os_version TEXT,
    agent_version TEXT NOT NULL DEFAULT '1.0.0',
    device_public_key TEXT,
    pairing_token TEXT,
    pairing_token_expires_at TIMESTAMP,
    is_paired BOOLEAN NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Protected', -- Protected, Disarmed, Warning, Offline, Lost, Camera Active, Attention Required
    security_mode TEXT NOT NULL DEFAULT 'Balanced', -- Low, Balanced, High
    battery INTEGER DEFAULT 100,
    is_charging BOOLEAN DEFAULT 1,
    current_ssid TEXT,
    ip_address TEXT,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS device_sessions (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    session_token TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    disconnected_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS device_locations (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy_meters REAL DEFAULT 200.0,
    method TEXT DEFAULT 'ip_geolocation', -- os_location, wifi_triangulation, ip_geolocation, cached
    city TEXT,
    region TEXT,
    country TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- POWER_DISCONNECT, WIFI_CHANGED, FAILED_LOGIN, MOVEMENT_DETECTED, REMOTE_LOCK, ALARM_TRIGGERED, LOST_MODE_ENABLED, ARMED, DISARMED
    severity TEXT NOT NULL DEFAULT 'INFO', -- INFO, WARNING, CRITICAL
    description TEXT NOT NULL,
    metadata_json TEXT DEFAULT '{}',
    location_id TEXT,
    evidence_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES device_locations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_id TEXT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'SECURITY', -- SECURITY, CRITICAL, DEVICE, CAMERA, SYSTEM
    is_read BOOLEAN NOT NULL DEFAULT 0,
    event_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS device_commands (
    id TEXT PRIMARY KEY,
    command_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    command_type TEXT NOT NULL, -- ARM_DEVICE, DISARM_DEVICE, LOCK_DEVICE, PLAY_ALARM, REQUEST_LOCATION, ENABLE_LOST_MODE, START_CAMERA_SESSION, STOP_CAMERA_SESSION, TAKE_SECURITY_SNAPSHOT
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, DISPATCHED, EXECUTED, FAILED, EXPIRED
    nonce TEXT NOT NULL,
    payload_json TEXT DEFAULT '{}',
    signature TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    executed_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS camera_sessions (
    id TEXT PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    device_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'INITIALIZING', -- INITIALIZING, ACTIVE, TERMINATED, EXPIRED
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    duration INTEGER DEFAULT 0,
    termination_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS camera_permissions (
    id TEXT PRIMARY KEY,
    device_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    live_camera_allowed BOOLEAN NOT NULL DEFAULT 0,
    snapshot_allowed BOOLEAN NOT NULL DEFAULT 0,
    event_capture_allowed BOOLEAN NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evidence_files (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    file_type TEXT NOT NULL, -- PHOTO, CLIP, SNAPSHOT, AUDIO
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    trigger_event TEXT,
    retention_days INTEGER DEFAULT 7, -- 1, 7, 30, manual (-1)
    is_encrypted BOOLEAN DEFAULT 1,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS security_settings (
    id TEXT PRIMARY KEY,
    device_id TEXT UNIQUE NOT NULL,
    movement_detection BOOLEAN DEFAULT 1,
    network_change_alert BOOLEAN DEFAULT 1,
    power_disconnect_alert BOOLEAN DEFAULT 1,
    failed_login_alert BOOLEAN DEFAULT 1,
    location_updates BOOLEAN DEFAULT 1,
    security_level TEXT DEFAULT 'Balanced', -- Low, Balanced, High
    auto_snapshot_on_alarm BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS device_permissions (
    id TEXT PRIMARY KEY,
    device_id TEXT UNIQUE NOT NULL,
    camera_granted BOOLEAN DEFAULT 1,
    microphone_granted BOOLEAN DEFAULT 0,
    location_granted BOOLEAN DEFAULT 1,
    os_status_json TEXT DEFAULT '{"camera": "allowed", "microphone": "denied", "location": "allowed"}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_id TEXT,
    action TEXT NOT NULL,
    details_json TEXT DEFAULT '{}',
    ip_address TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_events_device ON security_events(device_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_commands_device ON device_commands(device_id);
CREATE INDEX IF NOT EXISTS idx_locations_device ON device_locations(device_id);
CREATE INDEX IF NOT EXISTS idx_camera_sessions_device ON camera_sessions(device_id);
