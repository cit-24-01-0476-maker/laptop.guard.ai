import json
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from services.backend.database import get_db
from services.backend import models, schemas
from services.backend.auth import get_current_user
from services.backend.websocket_hub import hub
from packages.security.signer import generate_command_envelope

router = APIRouter(prefix="/commands", tags=["Commands"])

@router.post("/{device_id}", response_model=schemas.CommandResponse)
async def dispatch_command(
    device_id: str,
    req: schemas.CommandCreateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Verify device ownership strictly
    device = db.query(models.Device).filter(models.Device.id == device_id, models.Device.user_id == current_user.id).first()
    if not device:
        exists_other = db.query(models.Device).filter(models.Device.id == device_id).first()
        if exists_other:
            raise HTTPException(status_code=403, detail="Unauthorized: You do not own this device.")
        raise HTTPException(status_code=404, detail="Device not found.")

    command_type = req.command_type.upper()
    payload = req.payload or {}
    
    # 2. Generate signed envelope
    envelope = generate_command_envelope(
        command_type=command_type,
        device_id=device_id,
        user_id=current_user.id,
        payload=payload
    )
    
    # 3. Save command record
    now = datetime.utcnow()
    expires_at = now + timedelta(seconds=60)
    db_cmd = models.DeviceCommand(
        id=f"cmd_{uuid.uuid4().hex[:10]}",
        command_id=envelope["command_id"],
        user_id=current_user.id,
        device_id=device_id,
        command_type=command_type,
        status="PENDING",
        nonce=envelope["nonce"],
        payload_json=json.dumps(payload),
        signature=envelope["signature"],
        created_at=now,
        expires_at=expires_at
    )
    db.add(db_cmd)
    
    # 4. Create Audit Log
    audit = models.AuditLog(
        id=f"aud_{uuid.uuid4().hex[:10]}",
        user_id=current_user.id,
        device_id=device_id,
        action=f"COMMAND_{command_type}",
        details_json=json.dumps({"command_id": envelope["command_id"], "payload": payload}),
        timestamp=now
    )
    db.add(audit)

    # 5. Apply state transitions on device model
    if command_type in ("ARM_DEVICE", "UNLOCK_WORKSTATION", "UNLOCK_DEVICE", "UNLOCK"):
        device.status = "Protected"
    elif command_type == "DISARM_DEVICE":
        device.status = "Disarmed"
    elif command_type == "ENABLE_LOST_MODE":
        device.status = "Lost"
    elif command_type == "DISABLE_LOST_MODE":
        device.status = "Protected"
        
    db.commit()
    db.refresh(db_cmd)
    
    if command_type == "PLAY_ALARM":
        await hub.broadcast_to_user(current_user.id, {
            "type": "ALARM_STATE_CHANGED",
            "device_id": device_id,
            "is_alarm_active": True
        })
    elif command_type in ("STOP_ALARM", "DISARM_DEVICE", "UNLOCK_WORKSTATION", "UNLOCK_DEVICE", "UNLOCK"):
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
        db.refresh(db_cmd)
    
    return db_cmd

@router.get("/status/{command_id}", response_model=schemas.CommandResponse)
def get_command_status(command_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    cmd = db.query(models.DeviceCommand).filter(models.DeviceCommand.command_id == command_id, models.DeviceCommand.user_id == current_user.id).first()
    if not cmd:
        raise HTTPException(status_code=404, detail="Command not found")
    return cmd
