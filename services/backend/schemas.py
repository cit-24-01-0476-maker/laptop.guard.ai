from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# User Schemas
class UserBase(BaseModel):
    email: str
    full_name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(UserBase):
    id: str
    role: str
    two_factor_enabled: bool = False
    created_at: datetime
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

# Device Schemas
class DeviceBase(BaseModel):
    device_name: str
    device_type: str = "laptop"
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    os: str = "Windows"
    os_version: Optional[str] = None
    agent_version: str = "1.0.0"

class DeviceCreate(DeviceBase):
    device_public_key: Optional[str] = None

class DeviceUpdate(BaseModel):
    device_name: Optional[str] = None
    status: Optional[str] = None
    security_mode: Optional[str] = None
    battery: Optional[int] = None
    is_charging: Optional[bool] = None
    current_ssid: Optional[str] = None
    ip_address: Optional[str] = None

class DeviceLocationSchema(BaseModel):
    id: str
    device_id: str
    latitude: float
    longitude: float
    accuracy_meters: float
    method: str
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    recorded_at: datetime
    class Config:
        from_attributes = True

class DeviceResponse(DeviceBase):
    id: str
    user_id: str
    device_public_key: Optional[str] = None
    is_paired: bool
    status: str
    security_mode: str
    battery: int
    is_charging: bool
    current_ssid: Optional[str] = None
    ip_address: Optional[str] = None
    last_seen: datetime
    created_at: datetime
    last_location: Optional[DeviceLocationSchema] = None
    class Config:
        from_attributes = True

# Security Event Schemas
class SecurityEventCreate(BaseModel):
    device_id: str
    event_type: str
    severity: str = "INFO"
    description: str
    metadata_json: Optional[str] = "{}"
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class SecurityEventResponse(BaseModel):
    id: str
    device_id: str
    event_type: str
    severity: str
    description: str
    metadata_json: Optional[str] = "{}"
    location_id: Optional[str] = None
    evidence_id: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

# Notification Schemas
class NotificationResponse(BaseModel):
    id: str
    user_id: str
    device_id: Optional[str] = None
    title: str
    body: str
    category: str
    is_read: bool
    event_id: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

# Command Schemas
class CommandCreateRequest(BaseModel):
    command_type: str
    payload: Optional[Dict[str, Any]] = None

class CommandResponse(BaseModel):
    id: str
    command_id: str
    device_id: str
    command_type: str
    status: str
    nonce: str
    payload_json: str
    signature: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    executed_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# Camera Session Schemas
class CameraSessionStartRequest(BaseModel):
    device_id: str

class CameraSessionResponse(BaseModel):
    id: str
    session_id: str
    device_id: str
    user_id: str
    status: str
    started_at: datetime
    expires_at: datetime
    duration: int
    ice_servers: List[Dict[str, str]]
    class Config:
        from_attributes = True

# Evidence Schemas
class EvidenceResponse(BaseModel):
    id: str
    device_id: str
    file_type: str
    file_name: str
    file_path: str
    file_size: int
    trigger_event: Optional[str] = None
    retention_days: int
    is_encrypted: bool
    expires_at: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True

# Settings Schemas
class SecuritySettingsUpdate(BaseModel):
    movement_detection: Optional[bool] = None
    network_change_alert: Optional[bool] = None
    power_disconnect_alert: Optional[bool] = None
    failed_login_alert: Optional[bool] = None
    location_updates: Optional[bool] = None
    security_level: Optional[str] = None
    auto_snapshot_on_alarm: Optional[bool] = None

class SecuritySettingsResponse(BaseModel):
    id: str
    device_id: str
    movement_detection: bool
    network_change_alert: bool
    power_disconnect_alert: bool
    failed_login_alert: bool
    location_updates: bool
    security_level: str
    auto_snapshot_on_alarm: bool
    class Config:
        from_attributes = True
