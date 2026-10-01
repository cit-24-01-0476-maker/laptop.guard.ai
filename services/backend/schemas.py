from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# User Schemas
class UserBase(BaseModel):
    email: str
    full_name: str

class UserCreate(UserBase):
    password: str
    secret_pin: str = Field(min_length=4, max_length=6, pattern=r"^\d{4,6}$")

class UserLogin(BaseModel):
    email: str
    password: str
    controller_name: Optional[str] = None
    controller_type: Optional[str] = "WEB_BROWSER"

class OwnerAccessVerifyRequest(BaseModel):
    owner_key: str

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
    controller_id: Optional[str] = None
    is_controller_trusted: bool = False
    user: Dict[str, Any]

# Device Schemas
class DeviceBase(BaseModel):
    device_name: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    os_version: Optional[str] = None
    agent_version: str = "1.7.0"

class DeviceCreate(DeviceBase):
    id: Optional[str] = None
    device_public_id: Optional[str] = None
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
    source: str
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    captured_at: datetime
    class Config:
        from_attributes = True

class DeviceResponse(DeviceBase):
    id: str
    device_public_id: str
    status: str
    security_mode: str = "Balanced"
    battery: int = 100
    is_charging: bool = True
    current_ssid: Optional[str] = None
    ip_address: Optional[str] = None
    last_seen: datetime
    created_at: datetime
    role: str = "OWNER"
    is_owner: bool = True
    last_location: Optional[DeviceLocationSchema] = None
    class Config:
        from_attributes = True

# Pairing Schemas
class PairingRequestCreate(BaseModel):
    device_id: str
    device_public_key: str
    device_name: str
    target_email: Optional[str] = None
    pairing_code: Optional[str] = None
    pairing_request_id: Optional[str] = None
    manufacturer: Optional[str] = "Dell"
    model: Optional[str] = "G15 5530"
    os_version: Optional[str] = "Windows 11 Pro"
    agent_version: Optional[str] = "1.7.0"

class PairingRequestResponse(BaseModel):
    pairing_request_id: str
    device_id: str
    pairing_code: str # e.g. LG-7K4M-P92Q
    target_email: Optional[str] = None
    qr_payload: str
    expires_in_seconds: int = 300
    expires_at: datetime
    status: str = "PENDING"

class PairingClaimRequest(BaseModel):
    pairing_code: str
    controller_name: Optional[str] = None
    controller_type: Optional[str] = "WEB_BROWSER"

class PairingClaimResponse(BaseModel):
    pairing_request_id: str
    device_id: str
    device_name: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    os_version: Optional[str] = None
    status: str = "CLAIMED"
    expires_in_seconds: int

class PairingConfirmRequest(BaseModel):
    pairing_request_id: str
    device_id: str
    approved: bool = True
    device_signature: Optional[str] = None

class PairingStatusResponse(BaseModel):
    pairing_request_id: str
    status: str # PENDING, CLAIMED, CONFIRMED, DENIED, EXPIRED, CONSUMED
    claimed_by_email: Optional[str] = None # Masked e.g. os***@example.com
    claimed_by_user_id: Optional[str] = None
    expires_in_seconds: int

# Trusted Controller Schemas
class TrustedControllerResponse(BaseModel):
    id: str
    user_id: str
    controller_type: str
    display_name: str
    is_trusted: bool = True
    created_at: datetime
    last_used_at: datetime
    revoked_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class ControllerAuthorizeRequest(BaseModel):
    controller_id: Optional[str] = None
    display_name: Optional[str] = None
    controller_type: Optional[str] = "WEB_BROWSER"
    verification_code_or_pin: str

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
    created_at: datetime
    class Config:
        from_attributes = True

# Notification Schemas
class NotificationResponse(BaseModel):
    id: str
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
    device_id: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    parameters: Optional[Dict[str, Any]] = None

class CommandResponse(BaseModel):
    id: str
    command_id: str
    device_id: str
    command_type: str
    status: str
    nonce: str
    created_at: datetime
    expires_at: datetime
    signature: Optional[str] = None
    class Config:
        from_attributes = True

# Camera Schemas
class CameraSessionStartRequest(BaseModel):
    device_id: str
    reason: Optional[str] = "Security Check"

class CameraSessionResponse(BaseModel):
    session_id: str
    device_id: str
    status: str
    expires_at: datetime
    ice_servers: List[Dict[str, Any]]

# Evidence Schemas
class EvidenceResponse(BaseModel):
    id: str
    device_id: str
    file_type: str
    file_name: str
    file_size: int
    trigger_event: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

# Audit Log Schema
class AuditLogResponse(BaseModel):
    id: str
    action: str
    device_id: Optional[str] = None
    details_json: Optional[str] = "{}"
    ip_address: Optional[str] = None
    timestamp: datetime
    class Config:
        from_attributes = True
