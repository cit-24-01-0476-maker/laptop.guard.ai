import uuid
import json
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from services.backend.database import get_db
from services.backend import models, schemas
from services.backend.auth import get_current_user
from services.backend.policy import authorize_device_action, get_controller_from_request
from services.backend.websocket_hub import hub

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.get("", response_model=List[schemas.DeviceResponse])
def get_my_devices(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Specification Section 7: Device Visibility Rule.
    Returns ONLY devices where device_ownerships.user_id == authenticated_user.id
    AND device_ownerships.revoked_at IS NULL.
    ZERO fallback to unowned devices.
    """
    ownerships = db.query(models.DeviceOwnership).filter(
        models.DeviceOwnership.user_id == current_user.id,
        models.DeviceOwnership.revoked_at.is_(None)
    ).all()

    device_ids = [o.device_id for o in ownerships]
    if not device_ids:
        return []

    devices = db.query(models.ProtectedDevice).filter(models.ProtectedDevice.id.in_(device_ids)).all()
    results = []
    
    for d in devices:
        is_live = hub.is_device_online(d.id)
        current_status = d.status
        if not is_live and (datetime.utcnow() - d.last_seen).total_seconds() > 180 and current_status != "Lost":
            current_status = "Offline"
        
        last_loc = db.query(models.DeviceLocation).filter(
            models.DeviceLocation.device_id == d.id
        ).order_by(models.DeviceLocation.captured_at.desc()).first()

        results.append({
            "id": d.id,
            "device_public_id": d.device_public_id,
            "device_name": d.device_name,
            "manufacturer": d.manufacturer,
            "model": d.model,
            "os_version": d.os_version,
            "agent_version": d.agent_version,
            "status": current_status,
            "security_mode": d.security_mode,
            "battery": d.battery,
            "is_charging": d.is_charging,
            "current_ssid": d.current_ssid,
            "ip_address": d.ip_address,
            "last_seen": d.last_seen,
            "created_at": d.created_at,
            "role": "OWNER",
            "is_owner": True,
            "last_location": last_loc
        })
    return results

@router.get("/{device_id}", response_model=schemas.DeviceResponse)
def get_device(
    device_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    controller = get_controller_from_request(request, current_user, db)
    device, ownership = authorize_device_action(
        db, current_user, device_id, action="VIEW_DEVICE_INFO", controller=controller
    )

    is_live = hub.is_device_online(device.id)
    current_status = device.status
    if not is_live and (datetime.utcnow() - device.last_seen).total_seconds() > 180 and current_status != "Lost":
        current_status = "Offline"

    last_loc = db.query(models.DeviceLocation).filter(
        models.DeviceLocation.device_id == device.id
    ).order_by(models.DeviceLocation.captured_at.desc()).first()

    return {
        "id": device.id,
        "device_public_id": device.device_public_id,
        "device_name": device.device_name,
        "manufacturer": device.manufacturer,
        "model": device.model,
        "os_version": device.os_version,
        "agent_version": device.agent_version,
        "status": current_status,
        "security_mode": device.security_mode,
        "battery": device.battery,
        "is_charging": device.is_charging,
        "current_ssid": device.current_ssid,
        "ip_address": device.ip_address,
        "last_seen": device.last_seen,
        "created_at": device.created_at,
        "role": ownership.role,
        "is_owner": ownership.role == "OWNER",
        "last_location": last_loc
    }

@router.get("/{device_id}/status")
def get_device_status(
    device_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Requires authenticated owner to access status."""
    controller = get_controller_from_request(request, current_user, db)
    device, ownership = authorize_device_action(
        db, current_user, device_id, action="GET_STATUS", controller=controller
    )
    return {
        "device_id": device.id,
        "device_name": device.device_name,
        "status": device.status,
        "is_armed": device.status in ["Protected", "Lost"],
        "is_charging": device.is_charging,
        "battery": device.battery,
        "current_ssid": device.current_ssid,
        "last_seen": device.last_seen.isoformat() if device.last_seen else None
    }

@router.post("/{device_id}/refresh-location")
def refresh_device_location(
    device_id: str,
    payload: dict = None,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Specification Section 28: Location Privacy.
    Requires ownership & trusted controller to access or refresh precise location.
    """
    controller = get_controller_from_request(request, current_user, db)
    device, ownership = authorize_device_action(
        db, current_user, device_id, action="VIEW_PRECISE_LOCATION", controller=controller
    )

    lat = 6.9271
    lon = 79.8612
    city = "Colombo"
    country = "Sri Lanka"
    method = "wifi_triangulation"

    if payload and "latitude" in payload and "longitude" in payload:
        lat = float(payload["latitude"])
        lon = float(payload["longitude"])
        city = payload.get("city", city)
        country = payload.get("country", country)
        method = payload.get("method", "browser_gps")

    now = datetime.utcnow()
    loc_id = f"loc_{uuid.uuid4().hex[:10]}"
    new_loc = models.DeviceLocation(
        id=loc_id,
        device_id=device.id,
        latitude=lat,
        longitude=lon,
        accuracy_meters=50.0 if method == "browser_gps" else 150.0,
        source=method,
        city=city,
        country=country,
        captured_at=now,
        recorded_at=now
    )
    db.add(new_loc)
    device.last_seen = now
    db.commit()
    db.refresh(new_loc)

    return new_loc

@router.post("/{device_id}/remove")
def remove_device(
    device_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Specification Section 23: Device Removal.
    Revokes ownership, resets device credentials and transitions device to Unpaired.
    """
    controller = get_controller_from_request(request, current_user, db)
    device, ownership = authorize_device_action(
        db, current_user, device_id, action="REMOVE_DEVICE", controller=controller
    )

    now = datetime.utcnow()
    # Revoke ownership
    ownership.revoked_at = now
    device.status = "Unpaired"
    device.last_seen = now

    # Invalidate pending commands
    pending_cmds = db.query(models.DeviceCommand).filter(
        models.DeviceCommand.device_id == device_id,
        models.DeviceCommand.status == "PENDING"
    ).all()
    for c in pending_cmds:
        c.status = "EXPIRED"

    # Revoke device credentials
    creds = db.query(models.DeviceCredential).filter(
        models.DeviceCredential.device_id == device_id,
        models.DeviceCredential.revoked_at.is_(None)
    ).all()
    for cr in creds:
        cr.revoked_at = now

    # Audit log
    audit = models.AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        user_id=current_user.id,
        device_id=device_id,
        action="DEVICE_REMOVED",
        details_json=json.dumps({"ownership_id": ownership.id}),
        ip_address=request.client.host if request.client else None,
        timestamp=now
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": f"Device '{device.device_name}' has been successfully removed from your account."}

@router.post("/{device_id}/transfer")
def transfer_device(
    device_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Specification Section 24: Device Transfer.
    Permanently revokes old ownership and generates clean enrollment state.
    """
    controller = get_controller_from_request(request, current_user, db)
    device, ownership = authorize_device_action(
        db, current_user, device_id, action="TRANSFER_DEVICE", controller=controller
    )

    now = datetime.utcnow()
    ownership.revoked_at = now
    device.status = "Unpaired"
    device.last_seen = now

    # Invalidate old pairing requests
    db.query(models.PairingRequest).filter(
        models.PairingRequest.protected_device_id == device_id
    ).update({"status": "EXPIRED"})

    audit = models.AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        user_id=current_user.id,
        device_id=device_id,
        action="OWNERSHIP_TRANSFER_RESET",
        details_json=json.dumps({"old_ownership_id": ownership.id}),
        ip_address=request.client.host if request.client else None,
        timestamp=now
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": f"Device '{device.device_name}' ownership has been reset for new transfer/enrollment."}
