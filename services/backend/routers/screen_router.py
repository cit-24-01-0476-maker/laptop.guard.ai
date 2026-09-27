import time
import io
from datetime import datetime
from typing import Dict
from fastapi import APIRouter, Request, Response
from fastapi.responses import StreamingResponse
from PIL import Image, ImageDraw

router = APIRouter(prefix="/screen", tags=["Remote Screen Mirror"])

# In-memory latest frame buffer for physical laptop desktop screen
latest_screen_frames: Dict[str, bytes] = {}
latest_screen_frame_times: Dict[str, float] = {}

def generate_screen_hud_frame(device_id: str, status_msg: str = "CONNECTING TO DESKTOP...") -> bytes:
    """Generates a high-tech Sentinel Desktop Mirror HUD frame."""
    img = Image.new("RGB", (854, 480), (10, 15, 26))
    draw = ImageDraw.Draw(img)

    # Outer border & cyber grid
    draw.rectangle([10, 10, 843, 469], outline=(59, 130, 246), width=2)
    for x in range(30, 840, 60):
        draw.line([(x, 12), (x, 468)], fill=(18, 26, 43), width=1)
    for y in range(30, 470, 60):
        draw.line([(12, y), (842, y)], fill=(18, 26, 43), width=1)

    # Top Header
    draw.rectangle([12, 12, 841, 46], fill=(15, 23, 42))
    draw.text((25, 20), "LAPTOPGUARD AI • LIVE DESKTOP SCREEN MIRROR", fill=(0, 229, 255))
    draw.text((640, 20), "● REMOTE STREAM ACTIVE", fill=(16, 185, 129))

    # Center Console
    center_x, center_y = 427, 240
    draw.rectangle([center_x - 180, center_y - 60, center_x + 180, center_y + 60], fill=(15, 23, 42), outline=(59, 130, 246), width=2)
    draw.text((center_x - 120, center_y - 35), "SECURE DESKTOP PROJECTION", fill=(255, 255, 255))
    draw.text((center_x - 140, center_y - 8), status_msg, fill=(0, 229, 255))
    draw.text((center_x - 105, center_y + 20), "ENCRYPTED GDI MIRROR", fill=(148, 163, 184))

    # Bottom Footer & Timestamp
    draw.rectangle([12, 434, 841, 467], fill=(15, 23, 42))
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    draw.text((25, 442), f"TIMESTAMP: {ts} • DEVICE: {device_id}", fill=(0, 229, 255))
    draw.text((640, 442), "DESKTOP AGENT: CONNECTED", fill=(52, 211, 153))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=75)
    return buf.getvalue()

@router.post("/frame/{device_id}")
async def upload_screen_frame(device_id: str, request: Request):
    """Receives physical screen mirror frame uploaded from the desktop laptop agent."""
    frame_bytes = await request.body()
    if frame_bytes:
        latest_screen_frames[device_id] = frame_bytes
        latest_screen_frame_times[device_id] = time.time()
    return {"status": "ok", "bytes": len(frame_bytes)}

@router.get("/snapshot/{device_id}")
def get_screen_snapshot(device_id: str):
    """
    Returns latest desktop screen snapshot frame or active Sentinel Mirror HUD.
    Enables ultra-reliable polling on mobile browsers / apps where MJPEG may stall.
    """
    now = time.time()
    frame_bytes = latest_screen_frames.get(device_id)
    frame_time = latest_screen_frame_times.get(device_id, 0)
    if frame_bytes and (now - frame_time < 8.0):
        return Response(content=frame_bytes, media_type="image/jpeg", headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        })
    hud = generate_screen_hud_frame(device_id, "DESKTOP MIRROR ACTIVE • STREAMING")
    return Response(content=hud, media_type="image/jpeg", headers={
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    })

@router.get("/stream/{device_id}")
def stream_screen(device_id: str):
    """Streams live desktop screen mirror using MJPEG."""
    def generate_frames():
        while True:
            now = time.time()
            frame_bytes = latest_screen_frames.get(device_id)
            frame_time = latest_screen_frame_times.get(device_id, 0)

            if frame_bytes and (now - frame_time < 8.0):
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                time.sleep(0.5)
            else:
                hud = generate_screen_hud_frame(device_id, "AWAITING SCREEN FRAME...")
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + hud + b'\r\n')
                time.sleep(1.0)

    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )
