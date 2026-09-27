import json
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from services.backend.database import get_db
from services.backend import models, schemas
from services.backend.auth import get_current_user
from services.backend.policy import authorize_device_action, get_controller_from_request
from services.backend.websocket_hub import hub
from packages.security.signer import generate_command_envelope

router = APIRouter(prefix="/commands", tags=["Commands"])

async def execute_command_internal(
    device_id: str,
    req: schemas.CommandCreateRequest,
    request: Request,
    db: Session,
    current_user: models.User
):
    command_type = req.command_type.strip().upper()
    controller = get_controller_from_request(request, current_user, db)

    # 1. Server-Side Policy Authorization
    device, ownership = authorize_device_action(
        db,
        current_user,
        device_id,
        action=command_type,
        controller=controller,
        client_ip=request.client.host if request.client else None
    )

    payload = req.payload or req.parameters or {}
    
    # 2. Generate signed cryptographic envelope
    envelope = generate_command_envelope(
        command_type=command_type,
        device_id=device_id,
        user_id=current_user.id,
        payload=payload
    )
    
    # 3. Save command record with authoritative actor contexts
    now = datetime.utcnow()
    expires_at = now + timedelta(seconds=60)
    db_cmd = models.DeviceCommand(
        id=f"cmd_{uuid.uuid4().hex[:10]}",
        command_id=envelope["command_id"],
        device_id=device_id,
        actor_user_id=current_user.id,
        actor_controller_id=controller.id if controller else None,
        command_type=command_type,
        status="PENDING",
        nonce=envelope["nonce"],
        payload_json=json.dumps(payload),
        signature=envelope.get("signature"),
        created_at=now,
        expires_at=expires_at
    )
    db.add(db_cmd)

    # 4. State updates on device model
    if command_type in ("ARM_DEVICE", "UNLOCK_WORKSTATION", "UNLOCK_DEVICE", "UNLOCK"):
        device.status = "Protected"
    elif command_type == "DISARM_DEVICE":
        device.status = "Disarmed"
    elif command_type == "ENABLE_LOST_MODE":
        device.status = "Lost"
    elif command_type == "DISABLE_LOST_MODE":
        device.status = "Protected"

    device.last_seen = now
    db.commit()
    db.refresh(db_cmd)
    
    # 5. Broadcast alarm state only to authenticated owner
    if command_type in ("PLAY_ALARM", "TRIGGER_ALARM", "START_SIREN"):
        await hub.broadcast_to_user(current_user.id, {
            "type": "ALARM_STATE_CHANGED",
            "device_id": device_id,
            "is_alarm_active": True
        })
    elif command_type in ("STOP_ALARM", "STOP_SIREN", "DISARM_DEVICE", "UNLOCK_WORKSTATION", "UNLOCK_DEVICE", "UNLOCK"):
        await hub.broadcast_to_user(current_user.id, {
            "type": "ALARM_STATE_CHANGED",
            "device_id": device_id,
            "is_alarm_active": False
        })
    
    # 6. Dispatch over WebSocket if device is online
    dispatched = await hub.send_command_to_device(device_id, envelope)
    if dispatched:
        db_cmd.status = "DISPATCHED"
        db.commit()

    return db_cmd

@router.post("/send", response_model=schemas.CommandResponse)
async def dispatch_command_send(
    req: schemas.CommandCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Alias accepting device_id in request body."""
    device_id = req.device_id or (req.payload or {}).get("device_id") or (req.parameters or {}).get("device_id")
    if not device_id:
        raise HTTPException(status_code=400, detail="device_id is required in request.")
    return await execute_command_internal(device_id, req, request, db, current_user)

@router.post("/{device_id}", response_model=schemas.CommandResponse)
async def dispatch_command(
    device_id: str,
    req: schemas.CommandCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return await execute_command_internal(device_id, req, request, db, current_user)
