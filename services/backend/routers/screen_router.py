import time
import io
import jwt
from datetime import datetime
from typing import Dict, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import StreamingResponse
from PIL import Image, ImageDraw
from sqlalchemy.orm import Session

from services.backend.config import settings
from services.backend.database import get_db
from services.backend import models
from services.backend.policy import authorize_device_action

router = APIRouter(prefix="/screen", tags=["Remote Screen Mirror"])

# In-memory latest frame buffer for physical laptop desktop screen
latest_screen_frames: Dict[str, bytes] = {}
latest_screen_frame_times: Dict[str, float] = {}

def generate_screen_hud_frame(device_id: str, status_msg: str = "CONNECTING TO DESKTOP...") -> bytes:
    """Generates a high-tech Sentinel Desktop Mirror HUD frame."""
    img = Image.new("RGB", (854, 480), (10, 15, 26))
    draw = ImageDraw.Draw(img)

    draw.rectangle([10, 10, 843, 469], outline=(59, 130, 246), width=2)
    for x in range(30, 840, 60):
        draw.line([(x, 12), (x, 468)], fill=(18, 26, 43), width=1)
    for y in range(30, 470, 60):
        draw.line([(12, y), (842, y)], fill=(18, 26, 43), width=1)

    draw.rectangle([12, 12, 841, 46], fill=(15, 23, 42))
    draw.text((25, 20), "LAPTOPGUARD AI • LIVE DESKTOP SCREEN MIRROR", fill=(0, 229, 255))
    draw.text((640, 20), "● REMOTE STREAM ACTIVE", fill=(16, 185, 129))

    center_x, center_y = 427, 240
    draw.rectangle([center_x - 180, center_y - 60, center_x + 180, center_y + 60], fill=(15, 23, 42), outline=(59, 130, 246), width=2)
    draw.text((center_x - 120, center_y - 35), "SECURE DESKTOP PROJECTION", fill=(255, 255, 255))
    draw.text((center_x - 140, center_y - 8), status_msg, fill=(0, 229, 255))
    draw.text((center_x - 105, center_y + 20), "ENCRYPTED GDI MIRROR", fill=(148, 163, 184))

    draw.rectangle([12, 434, 841, 467], fill=(15, 23, 42))
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    draw.text((25, 442), f"TIMESTAMP: {ts} • DEVICE: {device_id}", fill=(0, 229, 255))
    draw.text((640, 442), "DESKTOP AGENT: CONNECTED", fill=(52, 211, 153))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=75)
    return buf.getvalue()

def authenticate_screen_request(
    device_id: str,
    request: Request,
    db: Session,
    token: Optional[str] = None
) -> Tuple[models.User, Optional[models.TrustedController]]:
    auth_token = token or request.query_params.get("token") or request.headers.get("authorization", "").replace("Bearer ", "").strip()
    if not auth_token:
        raise HTTPException(status_code=401, detail="Authentication required for screen mirror.")
    
    try:
        payload = jwt.decode(auth_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        token_cid = payload.get("cid")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid screen mirror token.")

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

    authorize_device_action(
        db, user, device_id, action="STREAM_SCREEN", controller=controller
    )
    return user, controller

@router.post("/frame/{device_id}")
async def upload_screen_frame(device_id: str, request: Request, db: Session = Depends(get_db)):
    """Receives physical screen mirror frame uploaded from desktop agent."""
    device = db.query(models.ProtectedDevice).filter(models.ProtectedDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found.")

    frame_bytes = await request.body()
    if frame_bytes:
        latest_screen_frames[device_id] = frame_bytes
        latest_screen_frame_times[device_id] = time.time()
        device.last_seen = datetime.utcnow()
        db.commit()
    return {"status": "ok", "bytes": len(frame_bytes)}

@router.get("/snapshot/{device_id}")
def get_screen_snapshot(device_id: str, request: Request, db: Session = Depends(get_db)):
    """Returns desktop screen mirror snapshot only to authenticated owner with trusted controller."""
    user, controller = authenticate_screen_request(device_id, request, db)

    now = time.time()
    frame_bytes = latest_screen_frames.get(device_id)
    frame_time = latest_screen_frame_times.get(device_id, 0)
    if frame_bytes and (now - frame_time < 6.0):
        return Response(content=frame_bytes, media_type="image/jpeg", headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        })
    raise HTTPException(status_code=503, detail="No live screen frame. Start sharing on the updated Windows agent.")

@router.get("/stream/{device_id}")
def stream_screen(device_id: str, request: Request, db: Session = Depends(get_db)):
    """Streams live desktop screen mirror with strict ownership and trusted controller checks."""
    user, controller = authenticate_screen_request(device_id, request, db)

    def generate_frames():
        while True:
            now = time.time()
            frame_bytes = latest_screen_frames.get(device_id)
            frame_time = latest_screen_frame_times.get(device_id, 0)

            if frame_bytes and (now - frame_time < 3.5):
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                time.sleep(0.08)
            else:
                hud = generate_screen_hud_frame(device_id)
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
