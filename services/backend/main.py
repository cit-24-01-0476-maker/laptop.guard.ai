import json
import uuid
import logging
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
)
from services.backend import models

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
app.include_router(commands_router.router, prefix=settings.API_V1_STR)
app.include_router(events_router.router, prefix=settings.API_V1_STR)
app.include_router(camera_router.router, prefix=settings.API_V1_STR)
app.include_router(camera_router.router)
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

@app.on_event("startup")
def on_startup():
    """Ensure database has default demo owner and devices on fresh deployments."""
    try:
        from services.backend.auth import get_password_hash
        db: Session = next(get_db())
        user = db.query(models.User).filter(models.User.email == "oska@laptopguard.ai").first()
        if not user:
            user = models.User(
                id="usr_owner_demo",
                email="oska@laptopguard.ai",
                password_hash=get_password_hash("SecurityPass2026!"),
                full_name="Oska Perera",
                role="owner",
                two_factor_enabled=True,
                created_at=models.datetime.datetime.utcnow()
            )
            db.add(user)
            db.commit()
            logger.info("Initialized default demo owner: oska@laptopguard.ai")

        device = db.query(models.Device).filter(models.Device.id == "dev_oska_xps15").first()
        if not device:
            device = models.Device(
                id="dev_oska_xps15",
                user_id=user.id,
                device_name="Dell G15 Sentinel",
                device_type="laptop",
                manufacturer="Dell Inc.",
                model="G15 5530",
                os="Windows",
                os_version="11 Home",
                agent_version="1.4.2",
                device_public_key="ed25519_pk_default",
                is_paired=True,
                status="Protected",
                security_mode="Balanced",
                battery=100,
                is_charging=True,
                last_seen=models.datetime.datetime.utcnow()
            )
            db.add(device)
            db.commit()
            logger.info("Initialized default device: dev_oska_xps15")
    except Exception as e:
        logger.error(f"Startup seed error: {e}")

# =============================================================================
# WebSockets: Real-Time Communication & WebRTC Signaling
# =============================================================================

@app.websocket("/ws/device/{device_id}")
async def device_websocket_endpoint(websocket: WebSocket, device_id: str):
    """Real-time bidirectional channel for Laptop Security Agents."""
    db: Session = next(get_db())
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not device:
        # Auto-provision new hardware agent for zero-config pairing
        first_user = db.query(models.User).first()
        owner_id = first_user.id if first_user else "usr_owner_demo"
        device = models.Device(
            id=device_id,
            user_id=owner_id,
            device_name="Dell G15 Sentinel",
            device_type="laptop",
            manufacturer="Dell Inc.",
            model="G15 5530",
            os="Windows",
            os_version="11 Home",
            agent_version="1.4.2",
            device_public_key="ed25519_pk_auto",
            is_paired=True,
            status="Protected",
            security_mode="Balanced",
            battery=100,
            is_charging=True,
            last_seen=models.datetime.datetime.utcnow()
        )
        db.add(device)
        db.commit()
        db.refresh(device)
        logger.info(f"Auto-provisioned device {device_id} to user {owner_id}")

    await hub.register_device(device_id, device.user_id, websocket)
    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
                msg_type = msg.get("type")
                
                target_user_id = hub.device_user_map.get(device_id, device.user_id)

                if msg_type == "CLAIM_DEVICE":
                    token = msg.get("token")
                    if token:
                        try:
                            from services.backend.auth import decode_access_token
                            payload = decode_access_token(token)
                            new_uid = payload.get("sub")
                            if new_uid:
                                device.user_id = new_uid
                                db.commit()
                                hub.device_user_map[device_id] = new_uid
                                target_user_id = new_uid
                                logger.info(f"Device {device_id} successfully bound to user {new_uid}")
                                await hub.broadcast_to_user(new_uid, {
                                    "type": "DEVICE_STATUS_CHANGED",
                                    "device_id": device_id,
                                    "status": "Protected",
                                    "is_online": True
                                })
                        except Exception as ex:
                            logger.warning(f"Failed to claim device via WebSocket: {ex}")

                elif msg_type == "HEARTBEAT":
                    # Update device battery, charging state, wifi, and last seen
                    device.battery = msg.get("battery", device.battery)
                    device.is_charging = msg.get("is_charging", device.is_charging)
                    device.current_ssid = msg.get("current_ssid", device.current_ssid)
                    device.ip_address = msg.get("ip_address", device.ip_address)
                    device.last_seen = models.datetime.datetime.utcnow()
                    db.commit()
                    
                    # Notify connected user dashboard
                    await hub.broadcast_to_user(target_user_id, {
                        "type": "DEVICE_TELEMETRY_UPDATED",
                        "device_id": device_id,
                        "battery": device.battery,
                        "is_charging": device.is_charging,
                        "current_ssid": device.current_ssid,
                        "last_seen": device.last_seen.isoformat()
                    })

                elif msg_type == "COMMAND_RESULT":
                    # Device agent reporting command execution status
                    cmd_id = msg.get("command_id")
                    status_str = msg.get("status", "EXECUTED")
                    cmd = db.query(models.DeviceCommand).filter(models.DeviceCommand.command_id == cmd_id).first()
                    if cmd:
                        cmd.status = status_str
                        cmd.executed_at = models.datetime.datetime.utcnow()
                        db.commit()
                        
                    await hub.broadcast_to_user(target_user_id, {
                        "type": "COMMAND_RESULT",
                        "device_id": device_id,
                        "command_id": cmd_id,
                        "status": status_str
                    })

                elif msg_type == "WEBRTC_SIGNAL":
                    # Relay WebRTC SDP answer / ICE candidates to user dashboard
                    await hub.relay_webrtc_signaling("user", target_user_id, {
                        "device_id": device_id,
                        "signal": msg.get("signal")
                    })

                elif msg_type == "ALARM_STATE":
                    is_active = msg.get("is_alarm_active", False)
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

                    # Update device status if armed or disarmed
                    if ev_type == "ARMED":
                        device.status = "Protected"
                    elif ev_type == "DISARMED":
                        device.status = "Disarmed"

                    # Save to database
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

                    # Create alert notification if warning or critical
                    notif = None
                    if severity in ("CRITICAL", "WARNING"):
                        notif = models.Notification(
                            id=f"notif_{uuid.uuid4().hex[:10]}",
                            user_id=device.user_id,
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

                    # Notify user web dashboard & mobile app
                    await hub.broadcast_to_user(device.user_id, {
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
                        await hub.broadcast_to_user(device.user_id, {
                            "type": "DEVICE_STATUS_CHANGED",
                            "device_id": device_id,
                            "status": device.status
                        })

            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON from device {device_id}")

    except WebSocketDisconnect:
        user_id = hub.unregister_device(device_id)
        if user_id:
            await hub.broadcast_to_user(user_id, {
                "type": "DEVICE_STATUS_CHANGED",
                "device_id": device_id,
                "status": "Offline",
                "is_online": False
            })
    finally:
        db.close()


@app.websocket("/ws/client/{user_id}")
async def client_websocket_endpoint(websocket: WebSocket, user_id: str):
    """Real-time channel for Web Dashboards and Mobile Applications."""
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
root_dir = Path(__file__).resolve().parents[2]
dist_dir = root_dir / "apps" / "web" / "dist"
if dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
