import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from services.backend.config import settings
from services.backend.database import get_db
from services.backend import models, schemas
from services.backend.auth import get_current_user
from services.backend.websocket_hub import hub
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/camera", tags=["Live Camera"])

@router.get("/stream/{device_id}")
def stream_camera(device_id: str):
    """Streams live video from physical webcam with security watermark."""
    def generate_frames():
        import cv2
        cap = cv2.VideoCapture(0)
        try:
            while True:
                success, frame = cap.read()
                if not success:
                    break
                import datetime
                ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                cv2.putText(frame, f"LAPTOPGUARD AI LIVE - {ts}", (15, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 229, 255), 2)
                ret, buffer = cv2.imencode('.jpg', frame)
                if not ret:
                    continue
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        except Exception:
            pass
        finally:
            cap.release()

    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")


@router.post("/start", response_model=schemas.CameraSessionResponse)
async def start_camera_session(
    req: schemas.CameraSessionStartRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Verify device ownership
    device = db.query(models.Device).filter(models.Device.id == req.device_id, models.Device.user_id == current_user.id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    # 2. Verify device online status
    if not hub.is_device_online(device.id):
        raise HTTPException(
            status_code=400,
            detail="Live Camera unavailable while device is offline. Make sure the laptop is connected."
        )

    # 3. Verify user and OS permissions
    cam_perm = db.query(models.CameraPermission).filter(models.CameraPermission.device_id == device.id).first()
    dev_perm = db.query(models.DevicePermission).filter(models.DevicePermission.device_id == device.id).first()
    
    if dev_perm and not dev_perm.camera_granted:
        raise HTTPException(status_code=403, detail="Operating system camera permission is denied on this laptop.")

    # 4. Create camera session with 5-minute hard limit
    now = datetime.utcnow()
    expires_at = now + timedelta(seconds=settings.CAMERA_SESSION_MAX_DURATION_SECONDS)
    session_id = f"camsess_{uuid.uuid4().hex[:14]}"
    
    session_obj = models.CameraSession(
        id=f"cs_{uuid.uuid4().hex[:10]}",
        session_id=session_id,
        device_id=device.id,
        user_id=current_user.id,
        status="ACTIVE",
        started_at=now,
        expires_at=expires_at,
        duration=0
    )
    db.add(session_obj)

    # 5. Audit Log Entry (Mandatory for sensitive camera operations)
    audit = models.AuditLog(
        id=f"aud_{uuid.uuid4().hex[:10]}",
        user_id=current_user.id,
        device_id=device.id,
        action="LIVE_CAMERA_STARTED",
        details_json=f'{{"session_id": "{session_id}", "max_duration": 300, "authorized_by": "{current_user.email}"}}',
        timestamp=now
    )
    db.add(audit)
    
    # 6. Mark device status as Camera Active
    device.status = "Camera Active"
    db.commit()
    db.refresh(session_obj)

    # 7. Notify Laptop Agent over WebSocket with session token
    await hub.send_command_to_device(device.id, {
        "command_id": f"cmd_cam_{uuid.uuid4().hex[:8]}",
        "command_type": "START_CAMERA_SESSION",
        "device_id": device.id,
        "user_id": current_user.id,
        "payload": {
            "session_id": session_id,
            "expires_at": expires_at.isoformat(),
            "ice_servers": settings.ICE_SERVERS
        }
    })

    return {
        "id": session_obj.id,
        "session_id": session_obj.session_id,
        "device_id": session_obj.device_id,
        "user_id": session_obj.user_id,
        "status": session_obj.status,
        "started_at": session_obj.started_at,
        "expires_at": session_obj.expires_at,
        "duration": 0,
        "ice_servers": settings.ICE_SERVERS
    }

@router.post("/stop/{session_id}")
async def stop_camera_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    session_obj = db.query(models.CameraSession).filter(
        models.CameraSession.session_id == session_id,
        models.CameraSession.user_id == current_user.id
    ).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Camera session not found")
        
    now = datetime.utcnow()
    duration = int((now - session_obj.started_at).total_seconds())
    session_obj.status = "TERMINATED"
    session_obj.ended_at = now
    session_obj.duration = duration
    session_obj.termination_reason = "USER_STOPPED"
    
    # Reset device status
    device = db.query(models.Device).filter(models.Device.id == session_obj.device_id).first()
    if device and device.status == "Camera Active":
        device.status = "Protected"

    # Audit log
    audit = models.AuditLog(
        id=f"aud_{uuid.uuid4().hex[:10]}",
        user_id=current_user.id,
        device_id=session_obj.device_id,
        action="LIVE_CAMERA_STOPPED",
        details_json=f'{{"session_id": "{session_id}", "duration_seconds": {duration}}}',
        timestamp=now
    )
    db.add(audit)
    db.commit()

    # Inform agent to close camera stream and extinguish any indicator
    await hub.send_command_to_device(session_obj.device_id, {
        "command_id": f"cmd_camstop_{uuid.uuid4().hex[:8]}",
        "command_type": "STOP_CAMERA_SESSION",
        "device_id": session_obj.device_id,
        "user_id": current_user.id,
        "payload": {"session_id": session_id}
    })

    return {"status": "terminated", "session_id": session_id, "duration": duration}
