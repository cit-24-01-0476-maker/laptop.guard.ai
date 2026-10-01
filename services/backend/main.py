import json
import uuid
import logging
import jwt
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from services.backend.config import settings
from services.backend.database import get_db, Base, engine
from services.backend.websocket_hub import hub
from services.backend.routers import (
    auth_router,
    devices_router,
    commands_router,
    events_router,
    camera_router,
    evidence_router,
    privacy_router,
    notifications_router,
    downloads_router,
    screen_router,
    pairing_router,
    controllers_router,
)
from services.backend import models
from services.backend.location import record_device_location

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("LaptopGuard.API")

# Ensure database tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="LaptopGuard AI - Premium Anti-Theft & Remote Security Platform",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Enable CORS for Web Dashboard and Mobile client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth_router.router, prefix=settings.API_V1_STR)
app.include_router(devices_router.router, prefix=settings.API_V1_STR)
app.include_router(pairing_router.router, prefix=settings.API_V1_STR)
app.include_router(controllers_router.router, prefix=settings.API_V1_STR)
app.include_router(commands_router.router, prefix=settings.API_V1_STR)
app.include_router(events_router.router, prefix=settings.API_V1_STR)
app.include_router(camera_router.router, prefix=settings.API_V1_STR)
app.include_router(camera_router.router)
app.include_router(screen_router.router, prefix=settings.API_V1_STR)
app.include_router(screen_router.router)
app.include_router(evidence_router.router, prefix=settings.API_V1_STR)
app.include_router(privacy_router.router, prefix=settings.API_V1_STR)
app.include_router(notifications_router.router, prefix=settings.API_V1_STR)
app.include_router(downloads_router.router)
app.include_router(downloads_router.alias_router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "online_devices_count": len(hub.active_devices),
        "connected_clients_count": sum(len(c) for c in hub.active_clients.values())
    }

# =============================================================================
# WebSockets: Real-Time Communication & WebRTC Signaling
# =============================================================================

@app.websocket("/ws/device/{device_id}")
@app.websocket("/api/v1/ws/device/{device_id}")
async def device_websocket_endpoint(websocket: WebSocket, device_id: str):
    """Real-time bidirectional channel for Laptop Security Agents."""
    db: Session = next(get_db())
    device = db.query(models.ProtectedDevice).filter(models.ProtectedDevice.id == device_id).first()
    if not device:
        # Create un-paired protected device record
        device = models.ProtectedDevice(
            id=device_id,
            device_public_id=f"pub_{uuid.uuid4().hex[:12]}",
            device_name="Windows Sentinel Laptop",
            manufacturer="Unknown",
            model="Laptop",
            os_version="11",
            agent_version="1.7.0",
            device_public_key="ed25519_pk_auto",
            status="Unpaired",
            security_mode="Balanced",
            battery=100,
            is_charging=True,
            last_seen=models.datetime.datetime.utcnow()
        )
        db.add(device)
        db.commit()
        db.refresh(device)
        logger.info(f"Registered new hardware device {device_id} (Unpaired)")

    # Find active owner via DeviceOwnership
    ownership = db.query(models.DeviceOwnership).filter(
        models.DeviceOwnership.device_id == device_id,
        models.DeviceOwnership.revoked_at.is_(None)
    ).first()
    active_user_id = ownership.user_id if ownership else None

    await hub.register_device(device_id, active_user_id or "unbound", websocket)
    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
                msg_type = msg.get("type")
                
                # Check current owner dynamically
                current_ownership = db.query(models.DeviceOwnership).filter(
                    models.DeviceOwnership.device_id == device_id,
                    models.DeviceOwnership.revoked_at.is_(None)
                ).first()
                target_user_id = current_ownership.user_id if current_ownership else None

                if msg_type == "HEARTBEAT":
                    # Update device battery, charging state, wifi, and last seen
                    device.battery = msg.get("battery", device.battery)
                    device.is_charging = msg.get("is_charging", device.is_charging)
                    device.current_ssid = msg.get("current_ssid", device.current_ssid)
                    device.ip_address = msg.get("ip_address", device.ip_address)
                    device.last_seen = models.datetime.datetime.utcnow()
                    location = record_device_location(db, device_id, msg.get("location"))
                    db.commit()
                    
                    if target_user_id:
                        await hub.broadcast_to_user(target_user_id, {
                            "type": "DEVICE_TELEMETRY_UPDATED",
                            "device_id": device_id,
                            "battery": device.battery,
                            "is_charging": device.is_charging,
                            "current_ssid": device.current_ssid,
                            "last_seen": device.last_seen.isoformat(),
                            "last_location": {"id": location.id, "device_id": device_id,
                                "latitude": location.latitude, "longitude": location.longitude,
                                "accuracy_meters": location.accuracy_meters, "source": location.source,
                                "captured_at": location.captured_at.isoformat() + "Z",
                                "city": location.city, "country": location.country} if location else None
                        })

                elif msg_type == "COMMAND_RESULT":
                    cmd_id = msg.get("command_id")
                    status_str = msg.get("status", "EXECUTED")
                    cmd = db.query(models.DeviceCommand).filter(models.DeviceCommand.command_id == cmd_id).first()
                    if cmd:
                        cmd.status = status_str
                        cmd.completed_at = models.datetime.datetime.utcnow()
                        db.commit()
                        
                    if target_user_id:
                        await hub.broadcast_to_user(target_user_id, {
                            "type": "COMMAND_RESULT",
                            "device_id": device_id,
                            "command_id": cmd_id,
                            "status": status_str
                        })

                elif msg_type == "WEBRTC_SIGNAL":
                    if target_user_id:
                        await hub.relay_webrtc_signaling("user", target_user_id, {
                            "device_id": device_id,
                            "signal": msg.get("signal")
                        })

                elif msg_type == "ALARM_STATE":
                    is_active = msg.get("is_alarm_active", False)
                    if target_user_id:
                        await hub.broadcast_to_user(target_user_id, {
                            "type": "ALARM_STATE_CHANGED",
                            "device_id": device_id,
                            "is_alarm_active": is_active
                        })

                elif msg_type == "SECURITY_EVENT":
                    event_data = msg.get("data", {})
                    ev_type = event_data.get("event_type", "UNKNOWN")
                    severity = event_data.get("severity", "INFO")
                    desc = event_data.get("description", "Security Event")
                    meta = event_data.get("metadata", {})

                    if ev_type == "ARMED":
                        device.status = "Protected"
                    elif ev_type == "DISARMED":
                        device.status = "Disarmed"

                    db_event = models.SecurityEvent(
                        id=f"evt_{uuid.uuid4().hex[:10]}",
                        device_id=device_id,
                        event_type=ev_type,
                        severity=severity,
                        description=desc,
                        metadata_json=json.dumps(meta),
                        created_at=models.datetime.datetime.utcnow()
                    )
                    db.add(db_event)

                    notif = None
                    if target_user_id and severity in ("CRITICAL", "WARNING"):
                        notif = models.Notification(
                            id=f"notif_{uuid.uuid4().hex[:10]}",
                            user_id=target_user_id,
                            device_id=device_id,
                            title=f"Security Alert: {ev_type}",
                            body=desc,
                            category="CRITICAL" if severity == "CRITICAL" else "SECURITY",
                            is_read=False,
                            event_id=db_event.id,
                            created_at=models.datetime.datetime.utcnow()
                        )
                        db.add(notif)

                    db.commit()

                    if target_user_id:
                        await hub.broadcast_to_user(target_user_id, {
                            "type": "NEW_SECURITY_EVENT",
                            "device_id": device_id,
                            "event": {
                                "id": db_event.id,
                                "device_id": device_id,
                                "event_type": ev_type,
                                "severity": severity,
                                "description": desc,
                                "created_at": db_event.created_at.isoformat(),
                                "metadata": meta
                            },
                            "notification": {
                                "id": notif.id,
                                "title": notif.title,
                                "body": notif.body,
                                "severity": notif.category,
                                "created_at": notif.created_at.isoformat()
                            } if notif else None
                        })

                        if ev_type in ("ARMED", "DISARMED"):
                            await hub.broadcast_to_user(target_user_id, {
                                "type": "DEVICE_STATUS_CHANGED",
                                "device_id": device_id,
                                "status": device.status
                            })

            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON from device {device_id}")

    except WebSocketDisconnect:
        user_id = hub.unregister_device(device_id)
        if user_id and user_id != "unbound":
            await hub.broadcast_to_user(user_id, {
                "type": "DEVICE_STATUS_CHANGED",
                "device_id": device_id,
                "status": "Offline",
                "is_online": False
            })
    finally:
        db.close()


@app.websocket("/ws/client/{user_id}")
@app.websocket("/api/v1/ws/client/{user_id}")
async def client_websocket_endpoint(websocket: WebSocket, user_id: str):
    """Real-time channel for Web Dashboards and Mobile Applications."""
    token = websocket.query_params.get("token")
    try:
        payload = jwt.decode(token or "", settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        authenticated_user_id = payload.get("sub")
        if authenticated_user_id != user_id:
            await websocket.close(code=1008, reason="Authentication failed")
            return
        db: Session = next(get_db())
        user_exists = db.query(models.User).filter(models.User.id == authenticated_user_id).first()
        db.close()
        if not user_exists:
            await websocket.close(code=1008, reason="Authentication failed")
            return
    except jwt.PyJWTError:
        await websocket.close(code=1008, reason="Authentication failed")
        return
    await hub.register_client(user_id, websocket)
    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
                msg_type = msg.get("type")

                if msg_type == "WEBRTC_SIGNAL":
                    # Relay SDP offer / ICE candidates from dashboard to specific device
                    target_device_id = msg.get("device_id")
                    if target_device_id:
                        await hub.relay_webrtc_signaling("device", target_device_id, {
                            "user_id": user_id,
                            "signal": msg.get("signal")
                        })

                elif msg_type == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG"}))

            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON from client {user_id}")

    except WebSocketDisconnect:
        hub.unregister_client(user_id, websocket)

# Mount compiled web frontend at root (serves web app if visited directly on Render)
static_web = Path(__file__).resolve().parent / "static" / "web"
root_dir = Path(__file__).resolve().parents[2]
dist_dir = root_dir / "apps" / "web" / "dist"

target_frontend = static_web if (static_web.exists() and (static_web / "index.html").exists()) else dist_dir
if target_frontend.exists() and (target_frontend / "index.html").exists():
    app.mount("/", StaticFiles(directory=str(target_frontend), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
