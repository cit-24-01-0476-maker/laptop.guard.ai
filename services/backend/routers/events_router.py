import json
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from services.backend.database import get_db
from services.backend import models, schemas
from services.backend.auth import get_current_user
from services.backend.websocket_hub import hub

router = APIRouter(prefix="/events", tags=["Security Events"])

@router.get("", response_model=List[schemas.SecurityEventResponse])
def get_events(
    device_id: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.SecurityEvent).join(models.Device).filter(models.Device.user_id == current_user.id)
    if device_id:
        query = query.filter(models.SecurityEvent.device_id == device_id)
    if severity:
        query = query.filter(models.SecurityEvent.severity == severity.upper())
    
    events = query.order_by(models.SecurityEvent.created_at.desc()).limit(limit).all()
    return events

@router.post("/report")
async def report_event(event_in: schemas.SecurityEventCreate, db: Session = Depends(get_db)):
    """Device agent reports a detected security event."""
    device = db.query(models.Device).filter(models.Device.id == event_in.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not registered")
    
    now = datetime.utcnow()
    event_id = f"ev_{uuid.uuid4().hex[:10]}"
    
    # Save event
    db_event = models.SecurityEvent(
        id=event_id,
        device_id=device.id,
        event_type=event_in.event_type.upper(),
        severity=event_in.severity.upper(),
        description=event_in.description,
        metadata_json=event_in.metadata_json or "{}",
        created_at=now
    )
    db.add(db_event)
    
    # Update device last seen
    device.last_seen = now
    if event_in.severity.upper() == "CRITICAL":
        device.status = "Warning"

    # Create user notification
    notif_id = f"ntf_{uuid.uuid4().hex[:10]}"
    notif = models.Notification(
        id=notif_id,
        user_id=device.user_id,
        device_id=device.id,
        title=f"Security Alert: {event_in.event_type.replace('_', ' ').title()}",
        body=event_in.description,
        category="CRITICAL" if event_in.severity.upper() == "CRITICAL" else "SECURITY",
        is_read=False,
        event_id=event_id,
        created_at=now
    )
    db.add(notif)
    db.commit()

    # Real-time WebSocket push to user dashboard & mobile app
    await hub.broadcast_to_user(device.user_id, {
        "type": "NEW_SECURITY_EVENT",
        "event": {
            "id": event_id,
            "device_id": device.id,
            "device_name": device.device_name,
            "event_type": event_in.event_type,
            "severity": event_in.severity,
            "description": event_in.description,
            "created_at": now.isoformat()
        },
        "notification": {
            "id": notif_id,
            "title": notif.title,
            "body": notif.body,
            "category": notif.category
        }
    })

    return {"status": "recorded", "event_id": event_id}
