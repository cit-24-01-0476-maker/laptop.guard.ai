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
            models.DeviceLocation.device_id == d.id,
            models.DeviceLocation.source == "os_location"
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
        models.DeviceLocation.device_id == device.id,
        models.DeviceLocation.source == "os_location"
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

    latest = db.query(models.DeviceLocation).filter(
        models.DeviceLocation.device_id == device_id,
        models.DeviceLocation.source == "os_location"
    ).order_by(models.DeviceLocation.captured_at.desc()).first()
    if not latest:
        raise HTTPException(status_code=404, detail="Laptop location unavailable. Enable Windows Location services and keep the session agent running.")
    return latest

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


@router.post("/{device_id}/bond-with-qr")
def bond_device_with_qr(
    device_id: str,
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Direct device bonding via QR scan or manual device ID entry.
    Creates device record if missing and establishes ownership.
    """
    now = datetime.utcnow()

    device = db.query(models.ProtectedDevice).filter(models.ProtectedDevice.id == device_id).first()
    if not device:
        device = models.ProtectedDevice(
            id=device_id,
            device_public_id=f"pub_{uuid.uuid4().hex[:12]}",
            device_name=payload.get("device_name", "Windows Sentinel Laptop"),
            manufacturer=payload.get("manufacturer", "Unknown"),
            model=payload.get("model", "Laptop"),
            os_version=payload.get("os_version", "Windows 11"),
            agent_version=payload.get("agent_version", "2.0.0"),
            device_public_key="ed25519_pk_auto",
            status="Protected",
            security_mode="Balanced",
            battery=100,
            is_charging=True,
            created_at=now,
            last_seen=now
        )
        db.add(device)
        db.commit()
        db.refresh(device)

    # Check existing active ownership
    existing = db.query(models.DeviceOwnership).filter(
        models.DeviceOwnership.device_id == device_id,
        models.DeviceOwnership.revoked_at.is_(None)
    ).first()

    if existing and existing.user_id == current_user.id:
        # Already owned by this user
        device.status = "Protected"
        device.last_seen = now
        db.commit()
        return {"status": "success", "message": "Device already bound to your account.", "device": {
            "id": device.id, "device_name": device.device_name, "status": device.status
        }}

    if existing:
        # Revoke previous owner
        existing.revoked_at = now

    new_ownership = models.DeviceOwnership(
        id=f"own_{uuid.uuid4().hex[:12]}",
        user_id=current_user.id,
        device_id=device_id,
        role="OWNER",
        created_at=now
    )
    db.add(new_ownership)

    device.status = "Protected"
    device.last_seen = now

    audit = models.AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        user_id=current_user.id,
        device_id=device_id,
        action="DEVICE_BONDED_QR",
        details_json=json.dumps({"ownership_id": new_ownership.id, "method": "qr_scan"}),
        ip_address=request.client.host if request.client else None,
        timestamp=now
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": f"Device '{device.device_name}' successfully bonded.", "device": {
        "id": device.id, "device_name": device.device_name, "status": device.status
    }}
