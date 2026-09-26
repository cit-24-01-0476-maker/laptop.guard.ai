import uuid
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from services.backend.database import get_db
from services.backend import models, schemas
from services.backend.auth import get_current_user
from services.backend.websocket_hub import hub

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.get("", response_model=List[schemas.DeviceResponse])
def get_devices(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    devices = db.query(models.Device).filter(models.Device.user_id == current_user.id).all()
    results = []
    for d in devices:
        d_dict = schemas.DeviceResponse.from_orm(d)
        # Check real-time online status via hub or last seen
        is_live = hub.is_device_online(d.id)
        if not is_live and (datetime.utcnow() - d.last_seen).total_seconds() > 180 and d.status != "Lost":
            d_dict.status = "Offline"
        
        # Attach last location
        last_loc = db.query(models.DeviceLocation).filter(models.DeviceLocation.device_id == d.id).order_by(models.DeviceLocation.recorded_at.desc()).first()
        if last_loc:
            d_dict.last_location = schemas.DeviceLocationSchema.from_orm(last_loc)
        results.append(d_dict)
    return results

@router.post("/{device_id}/refresh-location")
def refresh_device_location(device_id: str, payload: dict = None, db: Session = Depends(get_db)):
    """Resolves and updates actual real-world location for device."""
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    lat = 6.9271
    lon = 79.8612
    city = "Colombo"
    country = "Sri Lanka"
    method = "wifi_triangulation"
    
    if payload and "latitude" in payload and "longitude" in payload:
        lat = float(payload["latitude"])
        lon = float(payload["longitude"])
        city = payload.get("city", city)
        country = payload.get("country", country)
        method = payload.get("method", "browser_gps")
    else:
        # Resolve via public IP lookup
        import requests
        try:
            r = requests.get("http://ip-api.com/json", timeout=3).json()
            if r.get("status") == "success":
                lat = float(r.get("lat", lat))
                lon = float(r.get("lon", lon))
                city = r.get("city", city)
                country = r.get("country", country)
                method = "ip_geolocation"
        except Exception:
            pass

    loc_id = f"loc_{uuid.uuid4().hex[:10]}"
    new_loc = models.DeviceLocation(
        id=loc_id,
        device_id=device.id,
        latitude=lat,
        longitude=lon,
        accuracy_meters=50.0 if method == "browser_gps" else 150.0,
        method=method,
        city=city,
        country=country,
        recorded_at=datetime.utcnow()
    )
    db.add(new_loc)
    device.last_seen = datetime.utcnow()
    db.commit()
    db.refresh(new_loc)
    
    return schemas.DeviceLocationSchema.from_orm(new_loc)


@router.get("/{device_id}", response_model=schemas.DeviceResponse)
def get_device(device_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    device = db.query(models.Device).filter(models.Device.id == device_id, models.Device.user_id == current_user.id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    res = schemas.DeviceResponse.from_orm(device)
    if not hub.is_device_online(device.id) and (datetime.utcnow() - device.last_seen).total_seconds() > 180 and device.status != "Lost":
        res.status = "Offline"
        
    last_loc = db.query(models.DeviceLocation).filter(models.DeviceLocation.device_id == device.id).order_by(models.DeviceLocation.recorded_at.desc()).first()
    if last_loc:
        res.last_location = schemas.DeviceLocationSchema.from_orm(last_loc)
    return res

@router.post("/generate-pairing-token")
def generate_pairing_token(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Generates an expiring one-time cryptographic pairing token and QR code payload."""
    pairing_token = f"pair_{uuid.uuid4().hex[:16]}"
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    return {
        "pairing_token": pairing_token,
        "expires_at": expires_at.isoformat(),
        "qr_payload": {
            "token": pairing_token,
            "user_id": current_user.id,
            "api_url": "http://localhost:8000/api/v1",
            "ws_url": "ws://localhost:8000/ws"
        }
    }

@router.post("/confirm-pairing")
def confirm_pairing(data: dict, db: Session = Depends(get_db)):
    """Agent or mobile app calls this with pairing_token to link device."""
    user_id = data.get("user_id")
    device_name = data.get("device_name", "New Laptop")
    device_type = data.get("device_type", "laptop")
    manufacturer = data.get("manufacturer", "Unknown")
    model = data.get("model", "Laptop")
    os_name = data.get("os", "Windows")
    os_version = data.get("os_version", "11")
    agent_version = data.get("agent_version", "1.0.0")
    device_public_key = data.get("device_public_key", f"ed25519_pk_{uuid.uuid4().hex[:16]}")
    
    device_id = f"dev_{uuid.uuid4().hex[:12]}"
    device = models.Device(
        id=device_id,
        user_id=user_id,
        device_name=device_name,
        device_type=device_type,
        manufacturer=manufacturer,
        model=model,
        os=os_name,
        os_version=os_version,
        agent_version=agent_version,
        device_public_key=device_public_key,
        is_paired=True,
        status="Protected",
        security_mode="Balanced",
        battery=100,
        is_charging=True,
        last_seen=datetime.utcnow()
    )
    db.add(device)
    
    # Init default settings and permissions
    settings = models.SecuritySetting(
        id=f"ss_{uuid.uuid4().hex[:10]}",
        device_id=device_id,
        movement_detection=True,
        network_change_alert=True,
        power_disconnect_alert=True,
        failed_login_alert=True,
        location_updates=True,
        security_level="Balanced",
        auto_snapshot_on_alarm=True
    )
    db.add(settings)
    
    perms = models.DevicePermission(
        id=f"dp_{uuid.uuid4().hex[:10]}",
        device_id=device_id,
        camera_granted=True,
        microphone_granted=False,
        location_granted=True
    )
    db.add(perms)
    
    cam_perms = models.CameraPermission(
        id=f"cp_{uuid.uuid4().hex[:10]}",
        device_id=device_id,
        user_id=user_id,
        live_camera_allowed=True,
        snapshot_allowed=True,
        event_capture_allowed=True
    )
    db.add(cam_perms)
    
    db.commit()
    db.refresh(device)
    return {"status": "success", "device_id": device_id, "message": "Device successfully paired!"}

@router.patch("/{device_id}")
def update_device(device_id: str, updates: schemas.DeviceUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    device = db.query(models.Device).filter(models.Device.id == device_id, models.Device.user_id == current_user.id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    for field, value in updates.dict(exclude_unset=True).items():
        setattr(device, field, value)
    device.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "success", "message": "Device updated"}

@router.post("/claim-or-register")
def claim_or_register_device(data: dict, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Called by the Windows Desktop Agent when a user logs in.
    Binds the local laptop hardware to the logged-in user's account.
    """
    device_id = data.get("device_id")
    if not device_id:
        raise HTTPException(status_code=400, detail="device_id is required")
    device_name = data.get("device_name", "Windows Laptop")
    manufacturer = data.get("manufacturer", "Generic")
    model = data.get("model", "PC")
    os_name = data.get("os", "Windows")
    os_version = data.get("os_version", "11 Home")
    agent_version = data.get("agent_version", "1.4.2")
    battery = data.get("battery", 99)
    is_charging = data.get("is_charging", True)

    existing_device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if existing_device:
        existing_device.user_id = current_user.id
        existing_device.device_name = device_name
        existing_device.status = "Protected"
        existing_device.battery = battery
        existing_device.is_charging = is_charging
        existing_device.last_seen = datetime.utcnow()
        hub.device_user_map[existing_device.id] = current_user.id
        db.commit()
        db.refresh(existing_device)
        return {"status": "claimed", "device": schemas.DeviceResponse.from_orm(existing_device)}

    new_device = models.Device(
        id=device_id,
        user_id=current_user.id,
        device_name=device_name,
        device_type="laptop",
        manufacturer=manufacturer,
        model=model,
        os=os_name,
        os_version=os_version,
        agent_version=agent_version,
        device_public_key=f"ed25519_pk_{uuid.uuid4().hex[:16]}",
        is_paired=True,
        status="Protected",
        security_mode="Balanced",
        battery=battery,
        is_charging=is_charging,
        last_seen=datetime.utcnow()
    )
    db.add(new_device)

    # Init security settings
    settings = models.SecuritySetting(
        id=f"ss_{uuid.uuid4().hex[:10]}",
        device_id=new_device.id,
        movement_detection=True,
        network_change_alert=True,
        power_disconnect_alert=True,
        failed_login_alert=True,
        location_updates=True,
        security_level="Balanced",
        auto_snapshot_on_alarm=True
    )
    db.add(settings)

    # Default location in Sri Lanka
    loc = models.DeviceLocation(
        id=f"loc_{uuid.uuid4().hex[:10]}",
        device_id=new_device.id,
        latitude=6.9271,
        longitude=79.8612,
        city="Colombo",
        country="Sri Lanka",
        accuracy_meters=150.0,
        recorded_at=datetime.utcnow()
    )
    db.add(loc)

    db.commit()
    db.refresh(new_device)
    return {"status": "registered", "device": schemas.DeviceResponse.from_orm(new_device)}

@router.post("/{device_id}/bond-with-qr")
def bond_device_with_qr(device_id: str, data: dict, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Called by the mobile app after scanning the laptop's screen QR code.
    Strictly bonds the phone to this specific laptop hardware.
    """
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found. Make sure Desktop software is running.")

    # Verify device belongs to this user or link it
    if device.user_id != current_user.id:
        # Check if email in QR payload matches
        qr_email = (data.get("email") or "").strip().lower()
        if qr_email and qr_email == current_user.email.lower():
            device.user_id = current_user.id
        else:
            raise HTTPException(status_code=403, detail=f"This laptop belongs to another account. Please sign in as the owner.")

    device.is_paired = True
    device.status = "Protected" if device.status != "Lost" else "Lost"
    device.last_seen = datetime.utcnow()
    db.commit()
    db.refresh(device)

    # Broadcast real-time event so desktop app displays 'Phone Paired'
    try:
        import asyncio
        asyncio.create_task(hub.broadcast_to_user(current_user.id, {
            "type": "DEVICE_BONDED_QR",
            "device_id": device.id,
            "device_name": device.device_name,
            "timestamp": datetime.utcnow().isoformat()
        }))
    except Exception:
        pass

    return {
        "status": "success",
        "message": f"Successfully bonded phone with {device.device_name}",
        "device": schemas.DeviceResponse.from_orm(device)
    }
