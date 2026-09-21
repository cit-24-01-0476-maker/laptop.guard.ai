import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
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
    two_factor_secret = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    devices = relationship("Device", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")


class Device(Base):
    __tablename__ = "devices"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    device_name = Column(String, nullable=False)
    device_type = Column(String, default="laptop")
    manufacturer = Column(String, nullable=True)
    model = Column(String, nullable=True)
    os = Column(String, default="Windows")
    os_version = Column(String, nullable=True)
    agent_version = Column(String, default="1.0.0")
    device_public_key = Column(String, nullable=True)
    pairing_token = Column(String, nullable=True)
    pairing_token_expires_at = Column(DateTime, nullable=True)
    is_paired = Column(Boolean, default=False)
    status = Column(String, default="Protected") # Protected, Disarmed, Warning, Offline, Lost, Camera Active, Attention Required
    security_mode = Column(String, default="Balanced") # Low, Balanced, High
    battery = Column(Integer, default=100)
    is_charging = Column(Boolean, default=True)
    current_ssid = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="devices")
    locations = relationship("DeviceLocation", back_populates="device", cascade="all, delete-orphan")
    events = relationship("SecurityEvent", back_populates="device", cascade="all, delete-orphan")
    commands = relationship("DeviceCommand", back_populates="device", cascade="all, delete-orphan")
    camera_sessions = relationship("CameraSession", back_populates="device", cascade="all, delete-orphan")
    evidence_files = relationship("EvidenceFile", back_populates="device", cascade="all, delete-orphan")
    settings = relationship("SecuritySetting", back_populates="device", uselist=False, cascade="all, delete-orphan")
    permissions = relationship("DevicePermission", back_populates="device", uselist=False, cascade="all, delete-orphan")


class DeviceSession(Base):
    __tablename__ = "device_sessions"
    
    id = Column(String, primary_key=True, index=True)
    device_id = Column(String, ForeignKey("devices.id"), nullable=False)
    session_token = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    connected_at = Column(DateTime, default=datetime.datetime.utcnow)
    disconnected_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)


class DeviceLocation(Base):
    __tablename__ = "device_locations"
    
    id = Column(String, primary_key=True, index=True)
    device_id = Column(String, ForeignKey("devices.id"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy_meters = Column(Float, default=200.0)
    method = Column(String, default="ip_geolocation") # os_location, wifi_triangulation, ip_geolocation, cached
    city = Column(String, nullable=True)
    region = Column(String, nullable=True)
    country = Column(String, nullable=True)
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow)

    device = relationship("Device", back_populates="locations")


class SecurityEvent(Base):
    __tablename__ = "security_events"
    
    id = Column(String, primary_key=True, index=True)
    device_id = Column(String, ForeignKey("devices.id"), nullable=False)
    event_type = Column(String, nullable=False)
    severity = Column(String, default="INFO") # INFO, WARNING, CRITICAL
    description = Column(String, nullable=False)
    metadata_json = Column(Text, default="{}")
    location_id = Column(String, ForeignKey("device_locations.id"), nullable=True)
    evidence_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    device = relationship("Device", back_populates="events")


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    device_id = Column(String, ForeignKey("devices.id"), nullable=True)
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
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    device_id = Column(String, ForeignKey("devices.id"), nullable=False)
    command_type = Column(String, nullable=False)
    status = Column(String, default="PENDING") # PENDING, DISPATCHED, EXECUTED, FAILED, EXPIRED
    nonce = Column(String, nullable=False)
    payload_json = Column(Text, default="{}")
    signature = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    executed_at = Column(DateTime, nullable=True)

    device = relationship("Device", back_populates="commands")


class CameraSession(Base):
    __tablename__ = "camera_sessions"
    
    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True, nullable=False)
    device_id = Column(String, ForeignKey("devices.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="INITIALIZING") # INITIALIZING, ACTIVE, TERMINATED, EXPIRED
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=False)
    duration = Column(Integer, default=0)
    termination_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    device = relationship("Device", back_populates="camera_sessions")


class CameraPermission(Base):
    __tablename__ = "camera_permissions"
    
    id = Column(String, primary_key=True, index=True)
    device_id = Column(String, ForeignKey("devices.id"), unique=True, nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    live_camera_allowed = Column(Boolean, default=False)
    snapshot_allowed = Column(Boolean, default=False)
    event_capture_allowed = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)


class EvidenceFile(Base):
    __tablename__ = "evidence_files"
    
    id = Column(String, primary_key=True, index=True)
    device_id = Column(String, ForeignKey("devices.id"), nullable=False)
    file_type = Column(String, nullable=False) # PHOTO, CLIP, SNAPSHOT, AUDIO
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, default=0)
    trigger_event = Column(String, nullable=True)
    retention_days = Column(Integer, default=7)
    is_encrypted = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    device = relationship("Device", back_populates="evidence_files")


class SecuritySetting(Base):
    __tablename__ = "security_settings"
    
    id = Column(String, primary_key=True, index=True)
    device_id = Column(String, ForeignKey("devices.id"), unique=True, nullable=False)
    movement_detection = Column(Boolean, default=True)
    network_change_alert = Column(Boolean, default=True)
    power_disconnect_alert = Column(Boolean, default=True)
    failed_login_alert = Column(Boolean, default=True)
    location_updates = Column(Boolean, default=True)
    security_level = Column(String, default="Balanced") # Low, Balanced, High
    auto_snapshot_on_alarm = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    device = relationship("Device", back_populates="settings")


class DevicePermission(Base):
    __tablename__ = "device_permissions"
    
    id = Column(String, primary_key=True, index=True)
    device_id = Column(String, ForeignKey("devices.id"), unique=True, nullable=False)
    camera_granted = Column(Boolean, default=True)
    microphone_granted = Column(Boolean, default=False)
    location_granted = Column(Boolean, default=True)
    os_status_json = Column(Text, default='{"camera": "allowed", "microphone": "denied", "location": "allowed"}')
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    device = relationship("Device", back_populates="permissions")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    device_id = Column(String, nullable=True)
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
