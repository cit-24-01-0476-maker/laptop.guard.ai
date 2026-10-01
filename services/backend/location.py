import math
import uuid
from datetime import datetime, timezone, timedelta
from services.backend import models


def record_device_location(db, device_id, payload):
    """Accept only recent Windows sensor fixes, never a viewer phone's location."""
    if not isinstance(payload, dict) or payload.get("method") != "os_location":
        return None
    try:
        lat = float(payload["latitude"])
        lon = float(payload["longitude"])
        accuracy = float(payload["accuracy_meters"])
        captured = datetime.fromisoformat(payload["captured_at"].replace("Z", "+00:00"))
        captured = captured.replace(tzinfo=timezone.utc) if captured.tzinfo is None else captured.astimezone(timezone.utc)
    except (KeyError, TypeError, ValueError):
        return None
    now = datetime.now(timezone.utc)
    if not all(math.isfinite(v) for v in (lat, lon, accuracy)) or not (-90 <= lat <= 90 and -180 <= lon <= 180 and accuracy > 0):
        return None
    if not now - timedelta(minutes=10) <= captured <= now + timedelta(minutes=1):
        return None
    previous = db.query(models.DeviceLocation).filter(models.DeviceLocation.device_id == device_id).order_by(models.DeviceLocation.captured_at.desc()).first()
    if previous and previous.captured_at >= captured.replace(tzinfo=None):
        return previous
    location = models.DeviceLocation(id=f"loc_{uuid.uuid4().hex[:10]}", device_id=device_id,
        latitude=lat, longitude=lon, accuracy_meters=accuracy, source="os_location",
        city="Windows location sensor", country="", captured_at=captured.replace(tzinfo=None), recorded_at=now.replace(tzinfo=None))
    db.add(location)
    return location
