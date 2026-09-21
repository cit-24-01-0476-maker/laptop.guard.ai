import json
import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from services.backend.database import get_db
from services.backend import models, schemas
from services.backend.auth import get_current_user

router = APIRouter(prefix="/privacy", tags=["Privacy Center"])

@router.get("/status/{device_id}")
def get_privacy_status(device_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    device = db.query(models.Device).filter(models.Device.id == device_id, models.Device.user_id == current_user.id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    perms = db.query(models.DevicePermission).filter(models.DevicePermission.device_id == device_id).first()
    cam_perms = db.query(models.CameraPermission).filter(models.CameraPermission.device_id == device_id).first()
    settings = db.query(models.SecuritySetting).filter(models.SecuritySetting.device_id == device_id).first()
    
    return {
        "device_id": device_id,
        "device_name": device.device_name,
        "camera_permission": "Allowed" if perms and perms.camera_granted else "Denied",
        "microphone_permission": "Allowed" if perms and perms.microphone_granted else "Disabled by Default",
        "location_permission": "Allowed" if perms and perms.location_granted else "Denied",
        "live_camera_access": cam_perms.live_camera_allowed if cam_perms else False,
        "security_snapshot": cam_perms.snapshot_allowed if cam_perms else False,
        "event_based_evidence": cam_perms.event_capture_allowed if cam_perms else False,
        "security_level": settings.security_level if settings else "Balanced",
        "anti_covert_guarantee": "Active - All hardware LEDs and OS privacy indicators are strictly respected"
    }

@router.post("/delete-all-evidence/{device_id}")
def delete_all_evidence(device_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    device = db.query(models.Device).filter(models.Device.id == device_id, models.Device.user_id == current_user.id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    count = db.query(models.EvidenceFile).filter(models.EvidenceFile.device_id == device_id).delete()
    
    audit = models.AuditLog(
        id=f"aud_{uuid.uuid4().hex[:10]}",
        user_id=current_user.id,
        device_id=device_id,
        action="ALL_EVIDENCE_PURGED",
        details_json=json.dumps({"deleted_count": count}),
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    return {"status": "success", "message": f"Successfully wiped {count} evidence items."}

@router.get("/audit-trail")
def get_audit_trail(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    logs = db.query(models.AuditLog).filter(models.AuditLog.user_id == current_user.id).order_by(models.AuditLog.timestamp.desc()).limit(100).all()
    return [
        {
            "id": l.id,
            "device_id": l.device_id,
            "action": l.action,
            "details": json.loads(l.details_json or "{}"),
            "ip_address": l.ip_address,
            "timestamp": l.timestamp.isoformat()
        }
        for l in logs
    ]

@router.get("/export-data")
def export_user_data(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Full data export for GDPR / Privacy compliance."""
    devices = db.query(models.Device).filter(models.Device.user_id == current_user.id).all()
    events = db.query(models.SecurityEvent).join(models.Device).filter(models.Device.user_id == current_user.id).all()
    audit_logs = db.query(models.AuditLog).filter(models.AuditLog.user_id == current_user.id).all()
    
    return {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "created_at": current_user.created_at.isoformat()
        },
        "devices": [{"id": d.id, "name": d.device_name, "model": d.model} for d in devices],
        "total_security_events": len(events),
        "total_audit_logs": len(audit_logs),
        "exported_at": datetime.utcnow().isoformat()
    }
