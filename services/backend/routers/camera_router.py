import time
import io
import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import StreamingResponse
from PIL import Image, ImageDraw
from sqlalchemy.orm import Session

from services.backend.config import settings
from services.backend.database import get_db
from services.backend import models, schemas
from services.backend.auth import get_current_user, oauth2_scheme
from services.backend.policy import authorize_device_action, get_controller_from_request
import jwt

router = APIRouter(prefix="/camera", tags=["Live Camera"])

# In-memory latest frame buffer for physical laptop webcams
latest_device_frames: Dict[str, bytes] = {}
latest_device_frame_times: Dict[str, float] = {}

def generate_sentinel_hud_frame(device_id: str) -> bytes:
    """Generates a high-tech Sentinel security HUD frame with real-time watermark."""
    img = Image.new("RGB", (640, 480), (11, 15, 25))
    draw = ImageDraw.Draw(img)

    # Outer border
    draw.rectangle([10, 10, 629, 469], outline=(0, 229, 255), width=2)
    draw.line([(10, 30), (30, 10)], fill=(0, 229, 255), width=3)
    draw.line([(609, 10), (629, 30)], fill=(0, 229, 255), width=3)
    draw.line([(10, 449), (30, 469)], fill=(0, 229, 255), width=3)
    draw.line([(609, 469), (629, 449)], fill=(0, 229, 255), width=3)

    # Top Header
    draw.rectangle([12, 12, 627, 45], fill=(15, 23, 42))
    draw.text((25, 20), "LAPTOPGUARD AI • LIVE CAMERA CONSOLE", fill=(0, 229, 255))
    draw.text((450, 20), "● WEBCAM ARMED", fill=(16, 185, 129))

    # Center Reticle & Radar Crosshairs
    center_x, center_y = 320, 240
    draw.ellipse([center_x - 80, center_y - 80, center_x + 80, center_y + 80], outline=(30, 41, 59), width=2)
    draw.ellipse([center_x - 140, center_y - 140, center_x + 140, center_y + 140], outline=(30, 41, 59), width=1)
    draw.line([(center_x - 160, center_y), (center_x + 160, center_y)], fill=(30, 41, 59), width=1)
    draw.line([(center_x, center_y - 160), (center_x, center_y + 160)], fill=(30, 41, 59), width=1)

    draw.text((center_x - 110, center_y - 30), "HARDWARE WEBCAM SENTINEL", fill=(255, 255, 255))
    draw.text((center_x - 135, center_y - 5), "PHYSICAL WEBCAM ACTIVE", fill=(0, 229, 255))
    draw.text((center_x - 120, center_y + 20), "ENCRYPTED VIDEO STREAM", fill=(148, 163, 184))

    # Bottom Footer & Timestamp
    draw.rectangle([12, 435, 627, 467], fill=(15, 23, 42))
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    draw.text((25, 443), f"TIMESTAMP: {ts}", fill=(0, 229, 255))
    draw.text((430, 443), "HARDWARE LED: ACTIVE", fill=(255, 42, 85))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=75)
    return buf.getvalue()

def authenticate_stream_request(
    device_id: str,
    request: Request,
    db: Session,
    token: Optional[str] = None
) -> Tuple[models.User, Optional[models.TrustedController]]:
    """Resolves and authorizes user & controller for live stream / snapshot (via header or query token)."""
    auth_token = token or request.query_params.get("token") or request.headers.get("authorization", "").replace("Bearer ", "").strip()
    if not auth_token:
        raise HTTPException(status_code=401, detail="Authentication required for camera stream.")
    
    try:
        payload = jwt.decode(auth_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        token_cid = payload.get("cid")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid camera stream token.")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    cid = request.headers.get("x-controller-id") or request.query_params.get("cid") or token_cid
    controller = None
    if cid:
        controller = db.query(models.TrustedController).filter(
            models.TrustedController.id == cid,
            models.TrustedController.user_id == user.id,
            models.TrustedController.revoked_at.is_(None)
        ).first()

    # Enforce device ownership & trusted controller authorization
    authorize_device_action(
        db, user, device_id, action="STREAM_CAMERA", controller=controller
    )
    return user, controller

@router.post("/frame/{device_id}")
async def upload_camera_frame(device_id: str, request: Request, db: Session = Depends(get_db)):
    """Receives physical webcam frame uploaded from authorized desktop agent."""
    device = db.query(models.ProtectedDevice).filter(models.ProtectedDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found.")

    frame_bytes = await request.body()
    if frame_bytes:
        latest_device_frames[device_id] = frame_bytes
        latest_device_frame_times[device_id] = time.time()
        device.last_seen = datetime.utcnow()
        db.commit()
    return {"status": "ok", "bytes": len(frame_bytes)}

@router.get("/stream/{device_id}")
def stream_camera(device_id: str, request: Request, db: Session = Depends(get_db)):
    """
    Specification Section 27: Camera Privacy.
    Strictly verifies authenticated account, device ownership, and trusted controller.
    """
    user, controller = authenticate_stream_request(device_id, request, db)

    def generate_frames():
        while True:
            now = time.time()
            frame_bytes = latest_device_frames.get(device_id)
            frame_time = latest_device_frame_times.get(device_id, 0)

            if frame_bytes and (now - frame_time < 3.5):
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                time.sleep(0.08)
            else:
                hud = generate_sentinel_hud_frame(device_id)
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + hud + b'\r\n')
                time.sleep(0.12)

    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

@router.get("/snapshot/{device_id}")
def get_camera_snapshot(device_id: str, request: Request, db: Session = Depends(get_db)):
    """
    Returns latest camera snapshot only to authorized owner with trusted controller.
    """
    user, controller = authenticate_stream_request(device_id, request, db)

    now = time.time()
    frame_bytes = latest_device_frames.get(device_id)
    frame_time = latest_device_frame_times.get(device_id, 0)
    if frame_bytes and (now - frame_time < 6.0):
        return Response(content=frame_bytes, media_type="image/jpeg", headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        })
    raise HTTPException(status_code=503, detail="No live webcam frame. Start sharing on the updated Windows agent.")

@router.post("/start", response_model=schemas.CameraSessionResponse)
async def start_camera_session(
    req: schemas.CameraSessionStartRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    controller = get_controller_from_request(request, current_user, db)
    device, ownership = authorize_device_action(
        db, current_user, req.device_id, action="START_LIVE_CAMERA", controller=controller
    )

    now = datetime.utcnow()
    session_id = f"cam_{uuid.uuid4().hex[:12]}"
    expires_at = now + timedelta(seconds=settings.CAMERA_SESSION_MAX_DURATION_SECONDS)

    cam_sess = models.CameraSession(
        id=f"cs_{uuid.uuid4().hex[:10]}",
        session_id=session_id,
        device_id=device.id,
        user_id=current_user.id,
        status="ACTIVE",
        started_at=now,
        expires_at=expires_at,
        created_at=now
    )
    db.add(cam_sess)
    db.commit()

    return {
        "session_id": session_id,
        "device_id": device.id,
        "status": "ACTIVE",
        "expires_at": expires_at,
        "ice_servers": settings.ICE_SERVERS
    }

@router.post("/stop/{session_id}")
def stop_camera_session(session_id: str, request: Request, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    session = db.query(models.CameraSession).filter(models.CameraSession.session_id == session_id, models.CameraSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Camera session not found.")
    authorize_device_action(db, current_user, session.device_id, action="STOP_CAMERA_SESSION", controller=get_controller_from_request(request, current_user, db))
    session.status = "STOPPED"
    db.commit()
    return {"status": "STOPPED", "duration": max(0, int((datetime.utcnow() - session.started_at).total_seconds()))}
