import json
import uuid
from datetime import datetime
from typing import Optional, Tuple
from fastapi import HTTPException, status, Request
from sqlalchemy.orm import Session

from services.backend import models

# Risk classifications per specification Section 15
LOW_RISK_ACTIONS = {
    "REQUEST_STATUS", "GET_STATUS", "VIEW_DEVICE_INFO"
}

MEDIUM_RISK_ACTIONS = {
    "ARM_DEVICE", "REFRESH_TELEMETRY"
}

HIGH_RISK_ACTIONS = {
    "DISARM_DEVICE",
    "LOCK_WORKSTATION",
    "LOCK_DEVICE",
    "START_SIREN",
    "STOP_SIREN",
    "PLAY_ALARM",
    "STOP_ALARM",
    "TRIGGER_ALARM",
    "SIREN",
    "ALARM",
    "TAKE_PHOTO",
    "START_LIVE_CAMERA",
    "STREAM_CAMERA",
    "STREAM_SCREEN",
    "START_CAMERA_SESSION",
    "STOP_CAMERA_SESSION",
    "STOP_MEDIA",
    "VIEW_PRECISE_LOCATION",
    "ENABLE_LOST_MODE",
    "DISABLE_LOST_MODE",
    "EVIDENCE_DOWNLOAD",
    "EVIDENCE_DELETE",
    "REMOVE_DEVICE",
    "TRANSFER_DEVICE"
}

def get_controller_from_request(
    request: Request,
    current_user: models.User,
    db: Session
) -> Optional[models.TrustedController]:
    """Resolves controller from X-Controller-ID header or verified session."""
    controller_id = request.headers.get("x-controller-id")
    if not controller_id:
        return None
    controller = db.query(models.TrustedController).filter(
        models.TrustedController.id == controller_id,
        models.TrustedController.user_id == current_user.id,
        models.TrustedController.revoked_at.is_(None)
    ).first()
    if controller:
        controller.last_used_at = datetime.utcnow()
        db.commit()
    return controller

def authorize_device_action(
    db: Session,
    current_user: models.User,
    device_id: str,
    action: str,
    controller: Optional[models.TrustedController] = None,
    client_ip: Optional[str] = None
) -> Tuple[models.ProtectedDevice, models.DeviceOwnership]:
    """
    Centralized Server-Side Authorization Policy (Specification Section 39).
    Enforces:
    1. Authenticated User Check
    2. Active Device Ownership Check (One active owner per protected device)
    3. Trusted Controller Check for Medium & High Risk Actions
    4. Audit Logging
    5. IDOR Defense (Never reveal whether an unauthorized device exists)
    """
    norm_action = action.upper()

    # 1. Verify Device Existence
    device = db.query(models.ProtectedDevice).filter(models.ProtectedDevice.id == device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found or not accessible."
        )

    # 2. Verify Active Ownership (device_ownerships.user_id == current_user.id AND revoked_at IS NULL)
    ownership = db.query(models.DeviceOwnership).filter(
        models.DeviceOwnership.device_id == device_id,
        models.DeviceOwnership.user_id == current_user.id,
        models.DeviceOwnership.revoked_at.is_(None)
    ).first()

    if not ownership:
        # IDOR Protection: Return 404 to never disclose presence of other users' laptops
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found or not accessible."
        )

    # 3. Check Controller Authorization for Sensitive Actions (Medium and High Risk)
    if norm_action in MEDIUM_RISK_ACTIONS or norm_action in HIGH_RISK_ACTIONS:
        if not controller or controller.revoked_at is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CONTROLLER_NOT_TRUSTED: Authorize this browser or controller for remote security commands."
            )

    # 4. Record Audit Log
    try:
        audit = models.AuditLog(
            id=f"aud_{uuid.uuid4().hex[:12]}",
            user_id=current_user.id,
            device_id=device_id,
            action=f"ACTION_{norm_action}",
            details_json=json.dumps({
                "controller_id": controller.id if controller else None,
                "role": ownership.role
            }),
            ip_address=client_ip,
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

    return device, ownership
