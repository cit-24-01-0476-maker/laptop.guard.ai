import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from services.backend.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="owner")
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String, nullable=True) # TOTP secret or Master PIN
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    ownerships = relationship("DeviceOwnership", back_populates="user", cascade="all, delete-orphan")
    trusted_controllers = relationship("TrustedController", back_populates="user", cascade="all, delete-orphan")
    auth_sessions = relationship("AuthSession", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")


class ProtectedDevice(Base):
    __tablename__ = "protected_devices"
    
    id = Column(String, primary_key=True, index=True) # e.g. dev_dellg15_a83f91
    device_public_id = Column(String, unique=True, index=True, nullable=False)
    device_public_key = Column(Text, nullable=True) # PEM or base64 asymmetric public key
    device_name = Column(String, nullable=False)
    manufacturer = Column(String, nullable=True)
    model = Column(String, nullable=True)
    os_version = Column(String, nullable=True)
    agent_version = Column(String, default="1.7.0")
    
    status = Column(String, default="Unpaired") # Unpaired, Protected, Disarmed, Warning, Offline, Lost
    security_mode = Column(String, default="Balanced") # Low, Balanced, High
    battery = Column(Integer, default=100)
    is_charging = Column(Boolean, default=True)
    current_ssid = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    ownerships = relationship("DeviceOwnership", back_populates="device", cascade="all, delete-orphan")
    credentials = relationship("DeviceCredential", back_populates="device", cascade="all, delete-orphan")
    pairing_requests = relationship("PairingRequest", back_populates="device", cascade="all, delete-orphan")
    locations = relationship("DeviceLocation", back_populates="device", cascade="all, delete-orphan")
    events = relationship("SecurityEvent", back_populates="device", cascade="all, delete-orphan")
    commands = relationship("DeviceCommand", back_populates="device", cascade="all, delete-orphan")
    evidence_files = relationship("EvidenceFile", back_populates="device", cascade="all, delete-orphan")
    settings = relationship("SecuritySetting", back_populates="device", uselist=False, cascade="all, delete-orphan")
    permissions = relationship("DevicePermission", back_populates="device", uselist=False, cascade="all, delete-orphan")


# Alias Device to ProtectedDevice for backward compatibility where imported as Device
Device = ProtectedDevice


class DeviceOwnership(Base):
    __tablename__ = "device_ownerships"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    device_id = Column(String, ForeignKey("protected_devices.id"), nullable=False, index=True)
    role = Column(String, default="OWNER") # OWNER, ADMIN, VIEWER
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    revoked_at = Column(DateTime, nullable=True, index=True)

    user = relationship("User", back_populates="ownerships")
    device = relationship("ProtectedDevice", back_populates="ownerships")


class DeviceCredential(Base):
    __tablename__ = "device_credentials"
    
    id = Column(String, primary_key=True, index=True)
    device_id = Column(String, ForeignKey("protected_devices.id"), nullable=False, index=True)
    credential_type = Column(String, default="ASYMMETRIC_PUBLIC_KEY") # ASYMMETRIC_PUBLIC_KEY, TOKEN
    credential_data = Column(Text, nullable=False) # Public key or hashed secret
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    revoked_at = Column(DateTime, nullable=True)

    device = relationship("ProtectedDevice", back_populates="credentials")


class PairingRequest(Base):
    __tablename__ = "pairing_requests"
    
    id = Column(String, primary_key=True, index=True)
    protected_device_id = Column(String, ForeignKey("protected_devices.id"), nullable=False, index=True)
    code_hash = Column(String, nullable=False, index=True) # SHA-256 of human-readable code
    code_preview = Column(String, nullable=True) # Last 4 chars e.g. "P92Q" for display
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False, index=True)
    status = Column(String, default="PENDING") # PENDING, CLAIMED, CONFIRMED, DENIED, EXPIRED, CONSUMED
    attempt_count = Column(Integer, default=0)
    requested_ip = Column(String, nullable=True)
    claimed_by_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    consumed_at = Column(DateTime, nullable=True)

    device = relationship("ProtectedDevice", back_populates="pairing_requests")


class TrustedController(Base):
    __tablename__ = "trusted_controllers"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    controller_type = Column(String, default="WEB_BROWSER") # MOBILE_APP, WEB_BROWSER, TABLET
    display_name = Column(String, nullable=False)
    public_key_or_credential_reference = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_used_at = Column(DateTime, default=datetime.datetime.utcnow)
    revoked_at = Column(DateTime, nullable=True, index=True)

    user = relationship("User", back_populates="trusted_controllers")


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    controller_id = Column(String, ForeignKey("trusted_controllers.id"), nullable=True, index=True)
    session_token_hash = Column(String, nullable=False, index=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_active = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True, index=True)

    user = relationship("User", back_populates="auth_sessions")


class DeviceLocation(Base):
    __tablename__ = "device_locations"
    
    id = Column(String, primary_key=True, index=True)
    device_id = Column(String, ForeignKey("protected_devices.id"), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy_meters = Column(Float, default=200.0)
    source = Column(String, default="wifi_triangulation") # os_location, wifi_triangulation, ip_geolocation
    city = Column(String, nullable=True)
    region = Column(String, nullable=True)
    country = Column(String, nullable=True)
    captured_at = Column(DateTime, default=datetime.datetime.utcnow)
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow)

    device = relationship("ProtectedDevice", back_populates="locations")


class SecurityEvent(Base):
    __tablename__ = "security_events"
    
    id = Column(String, primary_key=True, index=True)
    device_id = Column(String, ForeignKey("protected_devices.id"), nullable=False, index=True)
    event_type = Column(String, nullable=False)
    severity = Column(String, default="INFO") # INFO, WARNING, CRITICAL
    description = Column(String, nullable=False)
    metadata_json = Column(Text, default="{}")
    location_id = Column(String, ForeignKey("device_locations.id"), nullable=True)
    evidence_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    device = relationship("ProtectedDevice", back_populates="events")


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    device_id = Column(String, ForeignKey("protected_devices.id"), nullable=True)
    title = Column(String, nullable=False)
    body = Column(String, nullable=False)
    category = Column(String, default="SECURITY") # SECURITY, CRITICAL, DEVICE, CAMERA, SYSTEM
    is_read = Column(Boolean, default=False)
    event_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class DeviceCommand(Base):
    __tablename__ = "device_commands"
    
    id = Column(String, primary_key=True, index=True)
    command_id = Column(String, unique=True, index=True, nullable=False)
    device_id = Column(String, ForeignKey("protected_devices.id"), nullable=False, index=True)
    actor_user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    actor_controller_id = Column(String, nullable=True, index=True)
    command_type = Column(String, nullable=False) # ARM_DEVICE, DISARM_DEVICE, LOCK_WORKSTATION, START_SIREN, STOP_SIREN, TAKE_PHOTO, etc.
    status = Column(String, default="PENDING") # PENDING, DISPATCHED, EXECUTED, FAILED, EXPIRED
    nonce = Column(String, nullable=False)
    payload_json = Column(Text, default="{}")
    signature = Column(String, nullable=True)
    result = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    device = relationship("ProtectedDevice", back_populates="commands")


class EvidenceFile(Base):
    __tablename__ = "evidence_files"
    
    id = Column(String, primary_key=True, index=True)
    device_id = Column(String, ForeignKey("protected_devices.id"), nullable=False, index=True)
    file_type = Column(String, nullable=False) # PHOTO, CLIP, SNAPSHOT, AUDIO
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, default=0)
    trigger_event = Column(String, nullable=True)
    retention_days = Column(Integer, default=7)
    is_encrypted = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    device = relationship("ProtectedDevice", back_populates="evidence_files")


class CameraSession(Base):
    __tablename__ = "camera_sessions"
    
    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True, nullable=False)
    device_id = Column(String, ForeignKey("protected_devices.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="INITIALIZING") # INITIALIZING, ACTIVE, TERMINATED, EXPIRED
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=False)
    duration = Column(Integer, default=0)
    termination_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class SecuritySetting(Base):
    __tablename__ = "security_settings"
    
    id = Column(String, primary_key=True, index=True)
    device_id = Column(String, ForeignKey("protected_devices.id"), unique=True, nullable=False)
    movement_detection = Column(Boolean, default=True)
    network_change_alert = Column(Boolean, default=True)
    power_disconnect_alert = Column(Boolean, default=True)
    failed_login_alert = Column(Boolean, default=True)
    location_updates = Column(Boolean, default=True)
    security_level = Column(String, default="Balanced") # Low, Balanced, High
    auto_snapshot_on_alarm = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    device = relationship("ProtectedDevice", back_populates="settings")


class DevicePermission(Base):
    __tablename__ = "device_permissions"
    
    id = Column(String, primary_key=True, index=True)
    device_id = Column(String, ForeignKey("protected_devices.id"), unique=True, nullable=False)
    camera_granted = Column(Boolean, default=True)
    microphone_granted = Column(Boolean, default=False)
    location_granted = Column(Boolean, default=True)
    os_status_json = Column(Text, default='{"camera": "allowed", "microphone": "denied", "location": "allowed"}')
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    device = relationship("ProtectedDevice", back_populates="permissions")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    device_id = Column(String, nullable=True, index=True)
    action = Column(String, nullable=False)
    details_json = Column(Text, default="{}")
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class PasskeyCredential(Base):
    __tablename__ = "passkey_credentials"
    
    id = Column(String, primary_key=True, index=True) # credential_id base64
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    public_key = Column(Text, nullable=False)
    sign_count = Column(Integer, default=0)
    transports = Column(String, nullable=True) # usb, ble, nfc, internal
    display_name = Column(String, default="Passkey")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_used_at = Column(DateTime, default=datetime.datetime.utcnow)
